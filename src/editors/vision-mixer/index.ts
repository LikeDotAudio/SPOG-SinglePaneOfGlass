// src/editors/vision-mixer — the production video switcher (deployment plan).
//
// Schema-driven: the surface renders whatever the resolved SwitcherDef says
// (inputs, M/E count, keyers, DSKs, preset libraries) — counts are DATA, so the
// switcher is user-scalable per production (docs/Production-Video-Switcher-
// Deployment-Plan.md). Three M/E banks with delegation + re-entry, 24 inputs in
// an operator-chosen layout (prefs.ts), keyers with DVE flight (dve.ts), M/E
// composite presets, whole-switcher scene registers (scenes.ts), Kind-B tips on
// every control (tips.ts), and a definition-derived MQTT surface (mqtt.ts).

import type { EditorPlugin, EditorContext } from '../types.js';
import type { DVEPreset, MEPreset, SceneDef, SwitcherDef, TransitionKind } from '../../model/index.js';
import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { injectVisionMixerStyles } from './styles.js';
import { resolveDef } from './schema.js';
import { effective, getPrefs, setPrefs, type VmPrefs } from './prefs.js';
import { newME, take, srcLabel, reentryOf, tallySet, applyPreset, capturePreset, KEYER_TYPES, type MEState, type KeyerState } from './me.js';
import { captureScene, recallScene, loadUserScenes, saveUserScenes, type SwitcherState } from './scenes.js';
import { buildDveEditor, poseAt, poseToCss } from './dve.js';
import { P, wire, publisher, type ParamRegistry } from './mqtt.js';
import { TIPS } from './tips.js';

/** A keyer's live DVE flight: the preset in motion and when it was triggered. */
interface Flight { preset: DVEPreset; t0: number; }

function render(host: HTMLElement, ctx: EditorContext): void {
  injectVisionMixerStyles();
  const def = resolveDef(ctx);
  const publish = publisher(ctx);

  // ---- state ---------------------------------------------------------------
  const state: SwitcherState = {
    mes: Array.from({ length: def.mes }, (_, i) => newME(def, i + 1)),
    dsks: def.dsks.map(() => false),
  };
  let delegate = 0;                       // which M/E the surface controls
  let shift = false;                      // bus shift bank (shift12 layout)
  let dvePresets: DVEPreset[] = [...def.dvePresets];
  let mePresets: MEPreset[] = [...def.mePresets];
  let scenes: SceneDef[] = [...def.scenes, ...loadUserScenes(ctx.twist.name)];
  const flights = new Map<string, Flight>();          // "me:keyer" → live pose
  let dveTargetKeyer = 0;                              // keyer the DVE editor drives

  // State persists per twist so a reopened switcher is exactly as left (plan §10).
  const STATE_KEY = `twist.vm.state.${ctx.twist.name}`;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as SwitcherState;
      if (s.mes?.length === def.mes) { state.mes = s.mes; state.dsks = def.dsks.map((_, i) => !!s.dsks?.[i]); }
    }
  } catch { /* fall through to defaults */ }
  const persist = (): void => { try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* ignore */ } };

  const me = (): MEState => state.mes[delegate]!;
  const srcCount = def.inputs.length + def.mes;        // inputs + re-entries
  const allLabels = Array.from({ length: srcCount }, (_, i) => srcLabel(i, def));

  // ---- M/E delegation tabs + toolbar ----------------------------------------
  const meTabs = state.mes.map((_, i) => {
    const b = el('button', { class: 'vm-metab', type: 'button' }, [`M/E ${i + 1}`]);
    b.addEventListener('click', () => { delegate = i; publish('panel.delegate', `M/E ${i + 1}`); rebuild(); });
    tip(b, TIPS.meTab!);
    return b;
  });
  const layoutSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  for (const [v, label] of [['def', 'LAYOUT · AUTO'], ['shift12', '12 + SHIFT'], ['wide24', '24 WIDE'], ['stack12', '2×12 STACK']] as const) {
    layoutSel.append(el('option', { value: v }, [label]));
  }
  layoutSel.value = getPrefs().layout;
  layoutSel.addEventListener('change', () => setPrefs({ layout: layoutSel.value as VmPrefs['layout'] }));
  tip(layoutSel, TIPS.layout!);
  // Self-cleaning: the overlay body is rebuilt per open, so drop the listener
  // once this render's DOM is gone (the host owns no unmount hook for editors).
  const onPrefs = (): void => {
    if (!host.isConnected) { document.removeEventListener('vm-prefs-change', onPrefs); return; }
    rebuildBuses();
  };
  document.addEventListener('vm-prefs-change', onPrefs);

  // ---- stage: PGM | T-bar | PVW ---------------------------------------------
  const pgmFeed = el('div', { class: 'vm-feed' });
  const pgmSrc = el('span', { class: 'vm-src' });
  const pgmPips = el('div');
  const dskRow = el('div', { class: 'vm-dskrow' });
  const pgmMon = el('div', { class: 'vm-mon pgm' }, [
    el('span', { class: 'vm-tag' }, ['PROGRAM']), pgmSrc, pgmFeed, pgmPips, dskRow,
  ]);
  tip(pgmMon, TIPS.pgmMon!);

  const tbar = el('input', { class: 'vm-tbar', type: 'range', min: '0', max: '100', value: '0' }) as HTMLInputElement;
  const pct = el('div', { class: 'vm-pct' }, ['0%']);
  tip(tbar, TIPS.tbar!);
  const tbarWrap = el('div', { class: 'vm-tbar-wrap' }, [
    el('p', { class: 'ed-h vm-h' }, ['T-BAR']),
    el('div', { class: 'vm-tbar-stage' }, [
      el('div', { class: 'vm-tbar-ends' }, [
        el('span', { class: 'pvw' }, ['PVW ▲']), el('span', { class: 'pgm' }, ['PGM ▼']),
      ]),
      tbar,
    ]),
    pct,
  ]);

  const pvwFeed = el('div', { class: 'vm-feed' });
  const pvwSrc = el('span', { class: 'vm-src' });
  const pvwPips = el('div');
  const pvwMon = el('div', { class: 'vm-mon pvw' }, [
    el('span', { class: 'vm-tag' }, ['PREVIEW']), pvwSrc, pvwFeed, pvwPips,
  ]);
  tip(pvwMon, TIPS.pvwMon!);

  const stage = el('div', { class: 'vm-stage' }, [pgmMon, tbarWrap, pvwMon]);
  if (effective(def).handedness === 'fixed') stage.classList.add('chir-exempt');

  // ---- buses (rebuilt on delegate / shift / layout change) --------------------
  const busWrap = el('div');
  let busBtns: { pgm: HTMLElement[]; pvw: HTMLElement[] } = { pgm: [], pvw: [] };

  function busButton(kind: 'pgm' | 'pvw', i: number): HTMLElement {
    const re = reentryOf(i, def);
    const input = def.inputs[i];
    const b = el('div', {
      class: `vm-btn${re !== null ? ' reentry' : ''}`,
      ...(re === null && input?.category ? { dataset: { cat: input.category } } : {}),
    }, [srcLabel(i, def)]);
    b.addEventListener('click', () => {
      me()[kind] = i;
      publish(`me.${delegate + 1}.${kind}`, srcLabel(i, def));
      if (delegate === 0) publish(kind, srcLabel(i, def));   // legacy alias
      sync();
    });
    tip(b, re !== null ? TIPS.reentry! : (kind === 'pgm' ? TIPS.busPgm! : TIPS.busPvw!));
    return b;
  }

  function rebuildBuses(): void {
    const layout = effective(def).layout;
    busWrap.replaceChildren();
    busBtns = { pgm: [], pvw: [] };
    for (const kind of ['pgm', 'pvw'] as const) {
      const bus = el('div', { class: `vm-bus ${kind}${layout === 'stack12' ? ' stack' : ''}` });
      // Which source indices this row shows. Re-entries (minus self) always ride
      // at the end; a bank never re-enters itself.
      const reentries = Array.from({ length: def.mes }, (_, m) => def.inputs.length + m)
        .filter((i) => reentryOf(i, def) !== delegate);
      const idx = (list: number[]): void => {
        for (const i of list) { const b = busButton(kind, i); busBtns[kind][i] = b; bus.appendChild(b); }
      };
      if (layout === 'shift12') {
        const bank = shift ? 1 : 0;
        const from = bank * 12;
        idx(Array.from({ length: Math.min(12, def.inputs.length - from) }, (_, k) => from + k));
        const sh = el('div', { class: `vm-btn shiftkey${shift ? ' on' : ''}` }, ['⇧']);
        sh.addEventListener('click', () => { shift = !shift; rebuildBuses(); });
        tip(sh, TIPS.shift!);
        bus.appendChild(sh);
        idx(reentries);
      } else if (layout === 'stack12') {
        const rowA = el('div', { class: 'vm-bank' }), rowB = el('div', { class: 'vm-bank' });
        def.inputs.forEach((_, i) => {
          const b = busButton(kind, i); busBtns[kind][i] = b;
          (i < 12 ? rowA : rowB).appendChild(b);
        });
        for (const i of reentries) { const b = busButton(kind, i); busBtns[kind][i] = b; rowB.appendChild(b); }
        bus.append(rowA, rowB);
      } else {
        idx(def.inputs.map((_, i) => i));
        idx(reentries);
      }
      busWrap.appendChild(el('div', { class: 'vm-busrow' }, [
        el('div', { class: `vm-buslabel ${kind}` }, [kind === 'pgm' ? 'PROGRAM' : 'PREVIEW']),
        bus,
      ]));
    }
    sync();
  }

  // ---- transition section -----------------------------------------------------
  const transBtns = def.transitions.map((t) => {
    const b = el('div', { class: 'vm-tbtn' }, [t]);
    b.addEventListener('click', () => {
      me().trans = t;
      publish(`me.${delegate + 1}.transition`, t);
      if (delegate === 0) publish('transition', t);
      sync();
    });
    tip(b, (t === 'CUT' ? TIPS.cut : t === 'MIX' ? TIPS.mix : t === 'WIPE' ? TIPS.wipe : TIPS.dveTrans)!);
    return { t, b };
  });
  const rate = el('input', { class: 'vm-num', type: 'number', min: '1', max: '300' }) as HTMLInputElement;
  rate.addEventListener('input', () => { me().rate = Math.max(1, +rate.value || 24); publish(`me.${delegate + 1}.rate`, me().rate); });
  tip(rate, TIPS.rate!);
  const takeBtn = el('div', { class: 'vm-tbtn take' }, ['TAKE / AUTO']);
  tip(takeBtn, TIPS.take!);

  // Auto-transition: CUT is instant; MIX/WIPE/DVE run the T-bar over `rate` frames.
  let auto: { bank: number; t0: number; ms: number } | null = null;
  function doTake(bank: number): void {
    take(state.mes[bank]!);
    tbar.value = '0'; pct.textContent = '0%';
    publish(`me.${bank + 1}.pgm`, srcLabel(state.mes[bank]!.pgm, def));
    publish(`me.${bank + 1}.pvw`, srcLabel(state.mes[bank]!.pvw, def));
    if (bank === 0) { publish('pgm', srcLabel(state.mes[0]!.pgm, def)); publish('pvw', srcLabel(state.mes[0]!.pvw, def)); }
    sync();
  }
  takeBtn.addEventListener('click', () => {
    if (me().trans === 'CUT') { doTake(delegate); return; }
    auto = { bank: delegate, t0: performance.now(), ms: (me().rate / 30) * 1000 };
  });
  tbar.addEventListener('input', () => {
    me().tbar = +tbar.value;
    pct.textContent = `${tbar.value}%`;
    publish(`me.${delegate + 1}.tbar`, me().tbar, true);
    if (delegate === 0) publish('tbar', me().tbar, true);
    if (me().tbar >= 100) doTake(delegate);
  });

  // ---- keyers + DSKs -----------------------------------------------------------
  const keyerRow = el('div', { class: 'vm-keyrow' });
  const keyerDrawer = el('div', { class: 'vm-drawer', style: 'display:none' });
  function rebuildKeyers(): void {
    keyerRow.replaceChildren(...me().keyers.map((k, ki) => {
      const b = el('div', { class: `vm-key${k.on ? ' on' : ''}` }, [
        `KEY ${ki + 1} · ${k.type.toUpperCase()}`,
        el('span', { class: 'cfg' }, ['⚙']),
      ]);
      b.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('cfg')) { openKeyerDrawer(ki); return; }
        k.on = !k.on;
        if (k.on && k.dve) flights.set(`${delegate}:${ki}`, { preset: dvePresets.find((p) => p.id === k.dve) ?? dvePresets[0]!, t0: performance.now() });
        publish(`me.${delegate + 1}.key.${ki + 1}.on`, k.on);
        sync();
      });
      tip(b, TIPS.keyer!);
      return b;
    }));
  }
  function openKeyerDrawer(ki: number): void {
    dveTargetKeyer = ki;
    const k = me().keyers[ki]!;
    const typeSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
    for (const t of KEYER_TYPES) typeSel.append(el('option', { value: t }, [t.toUpperCase()]));
    typeSel.value = k.type;
    typeSel.addEventListener('change', () => { k.type = typeSel.value as typeof k.type; publish(`me.${delegate + 1}.key.${ki + 1}.type`, k.type); rebuildKeyers(); });
    const srcSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
    allLabels.forEach((l, i) => { if (reentryOf(i, def) !== delegate) srcSel.append(el('option', { value: String(i) }, [l])); });
    srcSel.value = String(k.source);
    srcSel.addEventListener('change', () => { k.source = +srcSel.value; publish(`me.${delegate + 1}.key.${ki + 1}.source`, srcLabel(k.source, def)); sync(); });
    const dveSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
    dveSel.append(el('option', { value: '' }, ['DVE · NONE']));
    for (const p of dvePresets) dveSel.append(el('option', { value: p.id }, [p.name]));
    dveSel.value = k.dve ?? '';
    dveSel.addEventListener('change', () => {
      if (dveSel.value) k.dve = dveSel.value; else delete k.dve;
      publish(`me.${delegate + 1}.key.${ki + 1}.dve`, dveSel.value || 'none');
      if (k.dve) flights.set(`${delegate}:${ki}`, { preset: dvePresets.find((p) => p.id === k.dve)!, t0: performance.now() });
      sync();
    });
    for (const s of [typeSel, srcSel, dveSel]) tip(s, TIPS.keyerCfg!);
    keyerDrawer.replaceChildren(el('div', { class: 'vm-drawerhead' }, [
      el('span', { class: 'ed-h vm-h' }, [`KEYER ${ki + 1} SETUP`]), typeSel, srcSel, dveSel,
    ]));
    keyerDrawer.style.display = '';
  }

  const dskBtns = def.dsks.map((d, i) => {
    const b = el('div', { class: 'vm-key' }, [d.name]);
    b.addEventListener('click', () => {
      state.dsks[i] = !state.dsks[i];
      publish(`dsk.${i + 1}.on`, state.dsks[i]);
      if (i < 2) publish(`dsk${i + 1}`, state.dsks[i]);   // legacy alias
      sync();
    });
    tip(b, TIPS.dsk!);
    return b;
  });

  // ---- M/E presets + scenes ------------------------------------------------------
  const meSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  const rebuildMeSel = (): void => meSel.replaceChildren(...mePresets.map((p) => el('option', { value: p.id }, [p.name])));
  rebuildMeSel();
  const meApply = el('button', { class: 'vm-tbtn', type: 'button' }, ['APPLY LOOK']);
  meApply.addEventListener('click', () => {
    const p = mePresets.find((x) => x.id === meSel.value);
    if (!p) return;
    applyPreset(me(), p, def);
    for (const [ki, k] of me().keyers.entries()) {
      if (k.on && k.dve) flights.set(`${delegate}:${ki}`, { preset: dvePresets.find((x) => x.id === k.dve) ?? dvePresets[0]!, t0: performance.now() });
    }
    rebuildKeyers(); sync();
  });
  const meSave = el('button', { class: 'vm-tbtn', type: 'button' }, ['SAVE LOOK…']);
  meSave.addEventListener('click', () => {
    const name = (prompt('Save this M/E composite as:', `LOOK ${mePresets.length + 1}`) || '').trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const p = capturePreset(me(), id, name);
    const i = mePresets.findIndex((x) => x.id === id);
    if (i >= 0) mePresets[i] = p; else mePresets.push(p);
    rebuildMeSel(); meSel.value = id;
  });
  for (const b of [meSel, meApply, meSave]) tip(b, TIPS.meEditor!);

  const sceneRow = el('div', { class: 'vm-transrow' });
  function rebuildScenes(): void {
    sceneRow.replaceChildren(
      ...scenes.map((s) => {
        const b = el('button', { class: 'vm-scenebtn', type: 'button' }, [s.name]);
        b.addEventListener('click', () => {
          recallScene(state, s, def);
          publish('scene.recall', s.name);
          rebuildKeyers(); sync();
        });
        tip(b, TIPS.scene!);
        return b;
      }),
    );
    const store = el('button', { class: 'vm-scenebtn', type: 'button' }, ['＋ STORE…']);
    store.addEventListener('click', () => {
      const name = (prompt('Store the whole switcher as scene:', `SCENE ${scenes.length + 1}`) || '').trim();
      if (!name) return;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const s = captureScene(state, id, name);
      const i = scenes.findIndex((x) => x.id === id);
      if (i >= 0) scenes[i] = s; else scenes.push(s);
      saveUserScenes(ctx.twist.name, scenes.filter((x) => !def.scenes.some((d) => d.id === x.id)));
      publish('scene.store', name);
      rebuildScenes();
    });
    tip(store, TIPS.sceneStore!);
    sceneRow.appendChild(store);
  }
  rebuildScenes();

  // ---- DVE editor drawer -----------------------------------------------------------
  const dveDrawer = buildDveEditor({
    presets: () => dvePresets,
    onPreview: (kf) => {
      const key = `${delegate}:${dveTargetKeyer}`;
      flights.set(key, { preset: { id: '_preview', name: '', a: kf, b: kf, ms: 0 }, t0: performance.now() });
      const k = me().keyers[dveTargetKeyer];
      if (k && !k.on) { k.on = true; rebuildKeyers(); sync(); }
    },
    onPlay: (p) => flights.set(`${delegate}:${dveTargetKeyer}`, { preset: p, t0: performance.now() }),
    onSave: (p) => {
      const i = dvePresets.findIndex((x) => x.id === p.id);
      if (i >= 0) dvePresets[i] = p; else dvePresets.push(p);
    },
  });
  dveDrawer.style.display = 'none';
  const dveToggle = el('button', { class: 'vm-tbtn', type: 'button' }, ['DVE EDITOR']);
  dveToggle.addEventListener('click', () => { dveDrawer.style.display = dveDrawer.style.display === 'none' ? '' : 'none'; });
  tip(dveToggle, TIPS.dveEditor!);

  // ---- console assembly ---------------------------------------------------------
  host.append(
    el('div', { class: 'vm-root' }, [
      el('div', { class: 'vm-medock' }, [
        ...meTabs, el('span', { class: 'vm-spacer' }), layoutSel,
      ]),
      stage,
      busWrap,
      el('div', { class: 'vm-console' }, [
        el('div', { class: 'vm-sec' }, [
          el('p', { class: 'ed-h' }, ['TRANSITION']),
          el('div', { class: 'vm-transrow' }, [...transBtns.map((x) => x.b), rate, takeBtn]),
        ]),
        el('div', { class: 'vm-sec' }, [
          el('p', { class: 'ed-h' }, ['KEYERS — DELEGATED M/E']),
          keyerRow,
        ]),
        el('div', { class: 'vm-sec' }, [
          el('p', { class: 'ed-h' }, ['DOWNSTREAM KEYERS']),
          el('div', { class: 'vm-keyrow' }, dskBtns),
        ]),
        el('div', { class: 'vm-sec' }, [
          el('p', { class: 'ed-h' }, ['M/E LOOKS · DVE']),
          el('div', { class: 'vm-transrow' }, [meSel, meApply, meSave, dveToggle]),
        ]),
        el('div', { class: 'vm-sec' }, [
          el('p', { class: 'ed-h' }, ['SCENES']),
          sceneRow,
        ]),
      ]),
      keyerDrawer,
      dveDrawer,
    ]),
  );

  // ---- sync (state → DOM) ---------------------------------------------------------
  let lastTally = '';
  function sync(): void {
    const m = me();
    meTabs.forEach((t, i) => t.classList.toggle('sel', i === delegate));
    pgmFeed.textContent = srcLabel(m.pgm, def);
    pvwFeed.textContent = srcLabel(m.pvw, def);
    pgmSrc.textContent = `M/E ${delegate + 1}`;
    pvwSrc.textContent = `NEXT · ${m.trans} ${m.rate}f`;
    busBtns.pgm.forEach((b, i) => b?.classList.toggle('sel', i === m.pgm));
    busBtns.pvw.forEach((b, i) => b?.classList.toggle('sel', i === m.pvw));
    transBtns.forEach(({ t, b }) => b.classList.toggle('sel', t === m.trans));
    rate.value = String(m.rate);
    tbar.value = String(m.tbar);
    pct.textContent = `${Math.round(m.tbar)}%`;
    dskRow.replaceChildren(...state.dsks.flatMap((on, i) => on ? [el('span', {}, [def.dsks[i]!.name.split('·')[0]!.trim()])] : []));
    dskBtns.forEach((b, i) => b.classList.toggle('on', !!state.dsks[i]));
    rebuildPips();
    // Tally (read-only telemetry): the LAST bank is the programme output.
    const pgmTally = [...tallySet(state.mes, def.mes - 1, def)].map((i) => srcLabel(i, def)).sort();
    const key = pgmTally.join('|');
    if (key !== lastTally) { lastTally = key; publish('tally.program', pgmTally); }
    persist();
  }

  /** The PIP chips over the monitors — one per active keyer of the delegated bank. */
  function rebuildPips(): void {
    const mk = (armedOnly: boolean): HTMLElement[] => me().keyers.flatMap((k, ki) => {
      if (!k.on) return [];
      const chip = el('div', { class: `vm-pip${armedOnly ? ' armed' : ''}`, dataset: { fk: `${delegate}:${ki}` } },
        [srcLabel(k.source, def)]);
      return [chip];
    });
    pgmPips.replaceChildren(...mk(false));
    pvwPips.replaceChildren(...mk(true));
  }

  // ---- animation loop: DVE flights + auto-transition -------------------------------
  ctx.dispose.raf(() => {
    const now = performance.now();
    for (const chipHost of [pgmPips, pvwPips]) {
      for (const chip of chipHost.children) {
        const f = flights.get((chip as HTMLElement).dataset.fk ?? '');
        if (f) (chip as HTMLElement).style.transform = poseToCss(poseAt(f.preset, f.t0, now));
      }
    }
    if (auto) {
      const t = Math.min(1, (now - auto.t0) / auto.ms);
      const m = state.mes[auto.bank]!;
      m.tbar = t * 100;
      if (auto.bank === delegate) { tbar.value = String(m.tbar); pct.textContent = `${Math.round(m.tbar)}%`; }
      if (t >= 1) { const bank = auto.bank; auto = null; doTake(bank); }
    }
  });

  // ---- MQTT surface (definition-derived registry, plan §6) ---------------------------
  const reg: ParamRegistry = new Map();
  const idxOf = (v: unknown): number => allLabels.indexOf(String(v));
  state.mes.forEach((_, n) => {
    const N = n + 1;
    const bank = (): MEState => state.mes[n]!;
    reg.set(`me.${N}.pgm`, { spec: P.enum(`me.${N}.pgm`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { bank().pgm = i; sync(); } } });
    reg.set(`me.${N}.pvw`, { spec: P.enum(`me.${N}.pvw`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { bank().pvw = i; sync(); } } });
    reg.set(`me.${N}.transition`, { spec: P.enum(`me.${N}.transition`, def.transitions), apply: (v) => { if (def.transitions.includes(v as TransitionKind)) { bank().trans = v as TransitionKind; sync(); } } });
    reg.set(`me.${N}.rate`, { spec: P.num(`me.${N}.rate`, 1, 300, 'frames'), apply: (v) => { if (typeof v === 'number') { bank().rate = v; sync(); } } });
    reg.set(`me.${N}.tbar`, { spec: P.num(`me.${N}.tbar`, 0, 100, '%'), apply: (v) => { if (typeof v === 'number') { bank().tbar = v; if (n === delegate) { tbar.value = String(v); pct.textContent = `${Math.round(v)}%`; } } } });
    reg.set(`me.${N}.take`, { spec: P.bool(`me.${N}.take`), apply: (v) => { if (v) doTake(n); } });
    bank().keyers.forEach((_, ki) => {
      const K = ki + 1;
      const kk = (): KeyerState => bank().keyers[ki]!;
      reg.set(`me.${N}.key.${K}.on`, { spec: P.bool(`me.${N}.key.${K}.on`), apply: (v) => { kk().on = !!v; if (n === delegate) rebuildKeyers(); sync(); } });
      reg.set(`me.${N}.key.${K}.type`, { spec: P.enum(`me.${N}.key.${K}.type`, KEYER_TYPES), apply: (v) => { if ((KEYER_TYPES as string[]).includes(String(v))) { kk().type = v as KeyerState['type']; if (n === delegate) rebuildKeyers(); } } });
      reg.set(`me.${N}.key.${K}.source`, { spec: P.enum(`me.${N}.key.${K}.source`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { kk().source = i; sync(); } } });
      reg.set(`me.${N}.key.${K}.dve`, { spec: P.str(`me.${N}.key.${K}.dve`) });
    });
  });
  def.dsks.forEach((_, i) => {
    reg.set(`dsk.${i + 1}.on`, { spec: P.bool(`dsk.${i + 1}.on`), apply: (v) => { state.dsks[i] = !!v; sync(); } });
  });
  reg.set('panel.delegate', { spec: P.enum('panel.delegate', state.mes.map((_, i) => `M/E ${i + 1}`)), apply: (v) => { const i = state.mes.findIndex((_, n) => `M/E ${n + 1}` === v); if (i >= 0) { delegate = i; rebuild(); } } });
  reg.set('scene.recall', { spec: P.enum('scene.recall', scenes.map((s) => s.name)), apply: (v) => { const s = scenes.find((x) => x.name === v); if (s) { recallScene(state, s, def); rebuildKeyers(); sync(); } } });
  reg.set('scene.store', { spec: P.str('scene.store') });
  reg.set('tally.program', { spec: P.ro('tally.program') });
  // Legacy aliases → M/E 1 (backward compatibility, plan §9).
  reg.set('pgm', { spec: P.enum('pgm', allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { state.mes[0]!.pgm = i; sync(); } } });
  reg.set('pvw', { spec: P.enum('pvw', allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { state.mes[0]!.pvw = i; sync(); } } });
  reg.set('transition', { spec: P.enum('transition', def.transitions), apply: (v) => { if (def.transitions.includes(v as TransitionKind)) { state.mes[0]!.trans = v as TransitionKind; sync(); } } });
  reg.set('tbar', { spec: P.num('tbar', 0, 100, '%'), apply: (v) => { if (typeof v === 'number' && delegate === 0) { state.mes[0]!.tbar = v; tbar.value = String(v); pct.textContent = `${Math.round(v)}%`; } } });
  def.dsks.slice(0, 2).forEach((_, i) => {
    reg.set(`dsk${i + 1}`, { spec: P.bool(`dsk${i + 1}`), apply: (v) => { state.dsks[i] = !!v; sync(); } });
  });
  wire(ctx, reg);

  // ---- full rebuild (delegate change) ------------------------------------------------
  function rebuild(): void {
    keyerDrawer.style.display = 'none';
    rebuildBuses();
    rebuildKeyers();
    sync();
  }
  rebuild();
}

const plugin: EditorPlugin = {
  id: 'vision-mixer',
  title: 'VISION MIXER',
  order: 3,
  blurb: 'Production switcher — 3 M/E banks with re-entry, 24 inputs, keyers with DVE flight, M/E looks, scene registers. Drives tally.',
  match: (n) => /video\s*mix|vision|switch/i.test(n),
  requiredCaps: ['switch'],
  render,
};

export default plugin;
