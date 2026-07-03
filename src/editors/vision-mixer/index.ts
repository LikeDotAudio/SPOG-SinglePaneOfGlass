// src/editors/vision-mixer — faithful TypeScript port of js/editors/vision-mixer.js.
//
// PGM/PVW buses, a central LCARS T-bar, transition (CUT/MIX/WIPE) + TAKE, and two
// downstream keyers. Driven entirely from the typed EditorContext (ctx.sources) —
// no DOM scraping, no globals (M3).

import type { EditorPlugin, EditorContext } from '../types.js';
import type { Feed } from '../../domain/routing-core/index.js';
import { el } from '../../ui/dom.js';
import { injectVisionMixerStyles } from './styles.js';

type Transition = 'CUT' | 'MIX' | 'WIPE';

interface VmState {
  pgm: number;
  pvw: number;
  trans: Transition;
  keys: [boolean, boolean];
}

/** Resolve the bus sources from ctx (mirror of legacy channelsFor('IN', 6) fallback). */
function resolveSources(ctx: EditorContext): Feed[] {
  if (ctx.sources.length) return ctx.sources.slice();
  const inputs = ctx.twist.config?.inputs;
  if (inputs && inputs.length) {
    return inputs.map((label, i) => ({ id: `in-${i}`, label, color: '#4d94ff' }));
  }
  return Array.from({ length: 6 }, (_, i) => ({
    id: `in-${i}`,
    label: `IN ${i + 1}`,
    color: '#4d94ff',
  }));
}

function renderVisionMixer(host: HTMLElement, ctx: EditorContext): void {
  injectVisionMixerStyles();

  const srcs = resolveSources(ctx);
  const state: VmState = {
    pgm: 0,
    pvw: Math.min(1, srcs.length - 1),
    trans: 'MIX',
    keys: [false, false],
  };
  const labelOf = (i: number): string => srcs[i]?.label ?? '—';

  // MQTT live-value publishing (mirror of signal-conditioner): every operator
  // action is pushed to the bus. Bus selections travel as their SOURCE LABEL
  // (the advertised enum value), not the raw index. Discrete button presses use
  // { throttle: false }; the T-bar drag rides the default throttle.
  const publish = (name: string, value: unknown, opts?: { throttle?: boolean }): void =>
    ctx.services.publishParam?.(name, value, opts);
  const publishBus = (kind: 'pgm' | 'pvw'): void =>
    publish(kind, labelOf(state[kind]), { throttle: false });
  const indexOfLabel = (label: unknown): number => srcs.findIndex((s) => s.label === label);

  // Stage: PROGRAM monitor | big central T-BAR | PREVIEW monitor.
  const pgmFeed = el('div', { class: 'vm-feed' });
  const dsk = el('div', { class: 'vm-dsk' });
  const pgmMon = el('div', { class: 'vm-mon pgm' }, [
    el('span', { class: 'vm-tag', textContent: 'PROGRAM' }),
    pgmFeed,
    dsk,
  ]);

  const tbar = el('input', { class: 'vm-tbar', type: 'range', min: '0', max: '100', value: '0' });
  const pct = el('div', { class: 'vm-pct', textContent: '0%' });
  const tbarWrap = el('div', { class: 'vm-tbar-wrap' }, [
    el('p', { class: 'ed-h vm-h', textContent: 'T-BAR' }),
    el('div', { class: 'vm-tbar-stage' }, [
      el('div', { class: 'vm-tbar-ends' }, [
        el('span', { class: 'pvw', textContent: 'PVW ▲' }),
        el('span', { class: 'pgm', textContent: 'PGM ▼' }),
      ]),
      tbar,
    ]),
    pct,
  ]);

  const pvwFeed = el('div', { class: 'vm-feed' });
  const pvwMon = el('div', { class: 'vm-mon pvw' }, [
    el('span', { class: 'vm-tag', textContent: 'PREVIEW' }),
    pvwFeed,
  ]);

  const mons = el('div', { class: 'vm-stage' }, [pgmMon, tbarWrap, pvwMon]);
  host.appendChild(mons);

  // PROGRAM / PREVIEW source buses.
  const pgmBtns: HTMLElement[] = [];
  const pvwBtns: HTMLElement[] = [];
  const busWrap = el('div');

  const mkBus = (kind: 'pgm' | 'pvw'): HTMLElement => {
    const bus = el('div', { class: `vm-bus ${kind}` });
    const btns = kind === 'pgm' ? pgmBtns : pvwBtns;
    srcs.forEach((s, i) => {
      const b = el('div', {
        class: 'vm-btn',
        textContent: s.label,
        style: `border-left:4px solid ${s.color}`,
      });
      b.addEventListener('click', () => {
        state[kind] = i;
        sync();
        publishBus(kind);
      });
      btns.push(b);
      bus.appendChild(b);
    });
    return el('div', { class: 'vm-busrow' }, [
      el('div', {
        class: `vm-buslabel ${kind}`,
        textContent: kind === 'pgm' ? 'PROGRAM' : 'PREVIEW',
      }),
      bus,
    ]);
  };
  busWrap.appendChild(mkBus('pgm'));
  busWrap.appendChild(mkBus('pvw'));
  host.appendChild(busWrap);

  // Console: transitions + downstream keyers.
  const transDefs: Transition[] = ['CUT', 'MIX', 'WIPE'];
  const transBtns: HTMLElement[] = transDefs.map((t) =>
    el('div', { class: t === state.trans ? 'vm-tbtn sel' : 'vm-tbtn', textContent: t }),
  );
  const takeBtn = el('div', { class: 'vm-tbtn take', textContent: 'TAKE / AUTO' });
  const keyBtns: HTMLElement[] = [
    el('div', { class: 'vm-key', textContent: 'DSK 1 · LOWER-THIRD' }),
    el('div', { class: 'vm-key', textContent: 'DSK 2 · LOGO' }),
  ];

  const ctl = el('div', { class: 'vm-console' }, [
    el('div', { class: 'vm-sec' }, [
      el('p', { class: 'ed-h', textContent: 'TRANSITION' }),
      el('div', { class: 'vm-trans' }, [...transBtns, takeBtn]),
    ]),
    el('div', { class: 'vm-sec' }, [
      el('p', { class: 'ed-h', textContent: 'DOWNSTREAM KEYERS' }),
      el('div', { class: 'vm-keys' }, keyBtns),
    ]),
  ]);
  host.appendChild(ctl);

  // Advertise every driveable control as an R/W param (audit CR.6). Bus selects
  // are enums over the resolved source labels so a controller can pick by name;
  // a TAKE is represented by the resulting pgm/pvw swap (both re-published), so
  // there is no separate retained "take" command to mis-fire on reconnect.
  ctx.services.advertiseParams?.([
    { name: 'pgm', type: 'enum', values: srcs.map((s) => s.label), writable: true, cap: 'switch' },
    { name: 'pvw', type: 'enum', values: srcs.map((s) => s.label), writable: true, cap: 'switch' },
    { name: 'transition', type: 'enum', values: transDefs, writable: true, cap: 'switch' },
    { name: 'tbar', type: 'number', unit: '%', min: 0, max: 100, writable: true, cap: 'switch' },
    { name: 'dsk1', type: 'bool', writable: true, cap: 'switch' },
    { name: 'dsk2', type: 'bool', writable: true, cap: 'switch' },
  ]);

  function take(): void {
    const t = state.pgm;
    state.pgm = state.pvw;
    state.pvw = t;
    sync();
  }

  transBtns.forEach((b, idx) => {
    b.addEventListener('click', () => {
      state.trans = transDefs[idx]!;
      transBtns.forEach((x) => x.classList.toggle('sel', x === b));
      publish('transition', state.trans, { throttle: false });
    });
  });
  // TAKE (button or T-bar throw): publish the resulting bus swap discretely.
  takeBtn.addEventListener('click', () => {
    take();
    publishBus('pgm');
    publishBus('pvw');
  });
  keyBtns.forEach((k, i) => {
    k.addEventListener('click', () => {
      state.keys[i] = !state.keys[i];
      sync();
      publish(i === 0 ? 'dsk1' : 'dsk2', state.keys[i], { throttle: false });
    });
  });

  tbar.addEventListener('input', () => {
    pct.textContent = `${tbar.value}%`;
    publish('tbar', +tbar.value); // continuous drag → default throttle
    if (+tbar.value >= 100) {
      take();
      publishBus('pgm');
      publishBus('pvw');
      tbar.value = '0';
      pct.textContent = '0%';
      publish('tbar', 0, { throttle: false }); // settle the reset
    }
  });

  function sync(): void {
    pgmFeed.textContent = labelOf(state.pgm);
    pvwFeed.textContent = labelOf(state.pvw);
    dsk.textContent = '';
    if (state.keys[0]) dsk.appendChild(el('span', { textContent: 'DSK 1' }));
    if (state.keys[1]) dsk.appendChild(el('span', { textContent: 'DSK 2' }));
    pgmBtns.forEach((b, i) => b.classList.toggle('sel', i === state.pgm));
    pvwBtns.forEach((b, i) => b.classList.toggle('sel', i === state.pvw));
    keyBtns.forEach((k, i) => k.classList.toggle('on', state.keys[i]));
  }
  sync();

  // External control: honour writes from the bus / other consoles, applying to
  // local state + DOM WITHOUT re-publishing (no echo loop).
  ctx.services.onParam?.('pgm', (v) => { const i = indexOfLabel(v); if (i >= 0) { state.pgm = i; sync(); } });
  ctx.services.onParam?.('pvw', (v) => { const i = indexOfLabel(v); if (i >= 0) { state.pvw = i; sync(); } });
  ctx.services.onParam?.('transition', (v) => {
    if (transDefs.includes(v as Transition)) {
      state.trans = v as Transition;
      transBtns.forEach((x, idx) => x.classList.toggle('sel', transDefs[idx] === state.trans));
    }
  });
  ctx.services.onParam?.('tbar', (v) => {
    if (typeof v === 'number') { tbar.value = String(v); pct.textContent = `${Math.round(v)}%`; }
  });
  ctx.services.onParam?.('dsk1', (v) => { state.keys[0] = !!v; sync(); });
  ctx.services.onParam?.('dsk2', (v) => { state.keys[1] = !!v; sync(); });
}

const plugin: EditorPlugin = {
  id: 'vision-mixer',
  title: 'VISION MIXER',
  order: 3,
  match: (n) => /video\s*mix|vision|switch/i.test(n),
  requiredCaps: ['switch'],
  render: renderVisionMixer,
};

export default plugin;
