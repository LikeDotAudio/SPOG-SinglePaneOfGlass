// src/editors/audio-mixer/view — the console DOM, built from typed context.
//
// Faithful port of renderAudioMixer: a left LCARS rail (layer switch + deco
// elbows), a scrolling bank of channel strips (EQ / PAN / aux mix-minus + monitor
// sends / mute-solo / fader / VU), and a MASTER tab pinned to the right. Controls
// come from the shared widgets (knob/fader/meter); meters animate via ctx.dispose.
//
// Every operator-driven control is advertised + published to MQTT (publish-spec):
// per-channel gain/pan/mute/solo/EQ/aux and master gain/bal are R/W params, so a
// fader move here hits the bus and an inbound write drives the strip back. Values
// live in a persistent MixerState (state.ts) — never scraped from the DOM.

import type { Hex } from '../../model/index.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import type { EditorContext } from '../types.js';
import { el } from '../../ui/dom.js';
import { knob, fader, meter } from '../../ui/widgets.js';
import { buildChannels, buildState, LAYER } from './state.js';
import type { Channel } from './state.js';

interface StripOpts {
  master?: boolean;
}

export function renderConsole(host: HTMLElement, ctx: EditorContext): void {
  // Routed sources → one fader each; falls back to input slots / CH N when empty.
  const chans = buildChannels(ctx);
  const state = buildState(chans.length);
  const layers = Math.max(1, Math.ceil(chans.length / LAYER));

  // MQTT plumbing. `controls` maps a param name → its widget setter (for inbound
  // writes to move the knob/fader); `toggles` maps mute/solo params → their button.
  // Both are rebuilt on every layer redraw, so off-layer channels simply reflect on
  // their next mount. Guarded with `?.` — absent when MQTT is disabled.
  const controls = new Map<string, (v: number) => void>();
  const toggles = new Map<string, HTMLButtonElement>();
  const pub = (name: string, value: unknown, opts?: { throttle?: boolean }): void =>
    ctx.services.publishParam?.(name, value, opts);

  const console_ = el('div', { class: 'am-console' });

  // ----- LEFT LCARS RAIL: layer switch (vertical) + decorative elbows -----
  const rail = el('div', { class: 'am-rail' });
  rail.append(el('div', { class: 'am-rail-h', textContent: 'Layers' }));
  const layerBtns: HTMLElement[] = [];
  if (layers > 1) {
    for (let i = 0; i < layers; i++) {
      const b = el('div', {
        class: 'am-layerbtn' + (i === 0 ? ' sel' : ''),
        textContent: `CH ${i * LAYER + 1}–${Math.min((i + 1) * LAYER, chans.length)}`,
      });
      b.addEventListener('click', () => selectLayer(i, true));
      rail.append(b);
      layerBtns.push(b);
    }
  } else {
    rail.append(el('div', { class: 'am-layerbtn sel static', textContent: 'MAIN' }));
  }
  rail.append(
    el('div', { class: 'am-elbow a' }),
    el('div', { class: 'am-elbow b' }),
    el('div', { class: 'am-elbow c' }),
    el('div', { class: 'am-rail-foot' }),
  );
  console_.append(rail);

  const strips = el('div', { class: 'am-strips' });
  console_.append(strips);

  // MASTER lives in its own tab pinned to the right — always visible, never
  // scrolled or swapped by the layer switch (so its controls register once).
  const masterTab = el('div', { class: 'am-master-tab' });
  masterTab.append(el('div', { class: 'am-master-h', textContent: 'Master Out' }));
  masterTab.append(stripEl({ label: 'MASTER', color: '#d8c8ff' }, -1, { master: true }));
  console_.append(masterTab);

  host.append(console_);

  // A knob wired to a state field: publishes on drag, registers its setter for
  // inbound writes. `get`/`set` read+write the persistent MixerState.
  function stateKnob(
    parent: HTMLElement, label: string, color: string, param: string,
    get: () => number, set: (v: number) => void,
  ): void {
    const k = knob(label, get(), color, (v) => { set(v); pub(param, v); });
    controls.set(param, k.setValue);
    parent.append(k);
  }

  function stripEl(c: Channel, idx: number, opts: StripOpts): HTMLElement {
    const master = !!opts.master;
    const strip = el('div', { class: 'am-strip' + (master ? ' master' : '') });
    const n = idx + 1; // 1-based channel number for param names (ch<N>_*)

    const name = el('div', {
      class: 'am-name',
      textContent: master ? 'MASTER' : c.label,
      style: `color:${master ? '#d8c8ff' : c.color}`,
    });
    strip.append(name);

    if (!master) {
      const st = state.strips[idx]!;
      // EQ, PAN and the aux sends live in one collapsible bank.
      const rot = el('div', { class: 'am-rotaries' });

      const eq = el('div', { class: 'am-eq' });
      stateKnob(eq, 'HI', c.color, `ch${n}_eq_hi`, () => st.eqHi, (v) => (st.eqHi = v));
      stateKnob(eq, 'MID', c.color, `ch${n}_eq_mid`, () => st.eqMid, (v) => (st.eqMid = v));
      stateKnob(eq, 'LO', c.color, `ch${n}_eq_lo`, () => st.eqLo, (v) => (st.eqLo = v));
      rot.append(eq);
      stateKnob(rot, 'PAN', '#9fb6cc', `ch${n}_pan`, () => st.pan, (v) => (st.pan = v));

      // Aux sends: mix-minus bank (MM 1–4) then monitor bank (MON 1–4).
      const aux = el('div', { class: 'am-aux' });
      aux.append(el('div', { class: 'am-aux-h', textContent: 'Aux Sends' }));
      const ag = el('div', { class: 'am-aux-grid' });
      for (let j = 0; j < 4; j++) {
        const k = j; // capture
        stateKnob(ag, `MM ${k + 1}`, '#FF9C63', `ch${n}_mm${k + 1}`, () => st.mm[k]!, (v) => (st.mm[k] = v));
      }
      for (let j = 0; j < 4; j++) {
        const k = j;
        stateKnob(ag, `MON ${k + 1}`, '#3FC1C9', `ch${n}_mon${k + 1}`, () => st.mon[k]!, (v) => (st.mon[k] = v));
      }
      aux.append(ag);
      rot.append(aux);
      strip.append(rot);

      // OPEN button into the full Stage Box Input digital twin for this channel
      // (legacy called window.openStageBox; here it is a typed context service).
      const ob = el('button', { class: 'am-pre-open', textContent: '⚙ STAGE BOX' });
      ob.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.services.openStageBox(c.label, c.color as Hex, [c.label]);
      });
      strip.append(ob);

      const ms = el('div', { class: 'am-ms' });
      const mute = el('button', { class: 'mute', textContent: 'M' }) as HTMLButtonElement;
      const solo = el('button', { class: 'solo', textContent: 'S' }) as HTMLButtonElement;
      mute.classList.toggle('on', st.mute);
      solo.classList.toggle('on', st.solo);
      // Discrete toggles → publish un-throttled (one-shot events, not a drag loop).
      mute.addEventListener('click', () => { st.mute = !st.mute; mute.classList.toggle('on', st.mute); pub(`ch${n}_mute`, st.mute, { throttle: false }); });
      solo.addEventListener('click', () => { st.solo = !st.solo; solo.classList.toggle('on', st.solo); pub(`ch${n}_solo`, st.solo, { throttle: false }); });
      toggles.set(`ch${n}_mute`, mute);
      toggles.set(`ch${n}_solo`, solo);
      ms.append(mute, solo);
      strip.append(ms);
    } else {
      stateKnob(strip, 'BAL', '#d8c8ff', 'master_bal', () => state.master.bal, (v) => (state.master.bal = v));
    }

    const fa = el('div', { class: 'am-fadarea' });
    if (master) {
      const fd = fader('', state.master.gain, '#c3a8ff', (v) => { state.master.gain = v; pub('master_gain', v); });
      controls.set('master_gain', fd.setValue);
      fa.append(fd);
    } else {
      const st = state.strips[idx]!;
      const fd = fader('', st.gain, c.color, (v) => { st.gain = v; pub(`ch${n}_gain`, v); });
      controls.set(`ch${n}_gain`, fd.setValue);
      fa.append(fd);
    }
    fa.append(meter(ctx.dispose, 0.3));
    if (master) fa.append(meter(ctx.dispose, 0.3));
    strip.append(fa);
    strip.append(el('div', { class: 'am-db', textContent: '0 dB' }));
    return strip;
  }

  // Switch to layer `i`; publish only when the operator did it (not on inbound write).
  function selectLayer(i: number, publish: boolean): void {
    state.layer = i;
    layerBtns.forEach((x, j) => x.classList.toggle('sel', j === i));
    draw();
    if (publish) pub('layer', i, { throttle: false });
  }

  function draw(): void {
    // Drop the previous layer's per-channel handles; master handles persist.
    for (const key of [...controls.keys()]) if (key.startsWith('ch')) controls.delete(key);
    toggles.clear();
    strips.innerHTML = '';
    for (let i = state.layer * LAYER; i < state.layer * LAYER + LAYER && i < chans.length; i++) {
      strips.append(stripEl(chans[i]!, i, {}));
    }
  }
  draw();

  // ----- MQTT: advertise the full R/W schema, then honour inbound writes. -----
  const specs: ParamSpec[] = [];
  const N = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
  const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

  for (let i = 0; i < chans.length; i++) {
    const n = i + 1;
    const idx = i;
    // Continuous 0..1 controls (fader / EQ / pan / aux sends).
    const knobs: Array<[string, () => number, (v: number) => void]> = [
      [`ch${n}_gain`, () => state.strips[idx]!.gain, (v) => (state.strips[idx]!.gain = v)],
      [`ch${n}_pan`, () => state.strips[idx]!.pan, (v) => (state.strips[idx]!.pan = v)],
      [`ch${n}_eq_hi`, () => state.strips[idx]!.eqHi, (v) => (state.strips[idx]!.eqHi = v)],
      [`ch${n}_eq_mid`, () => state.strips[idx]!.eqMid, (v) => (state.strips[idx]!.eqMid = v)],
      [`ch${n}_eq_lo`, () => state.strips[idx]!.eqLo, (v) => (state.strips[idx]!.eqLo = v)],
    ];
    for (let j = 0; j < 4; j++) {
      const k = j;
      knobs.push([`ch${n}_mm${k + 1}`, () => state.strips[idx]!.mm[k]!, (v) => (state.strips[idx]!.mm[k] = v)]);
      knobs.push([`ch${n}_mon${k + 1}`, () => state.strips[idx]!.mon[k]!, (v) => (state.strips[idx]!.mon[k] = v)]);
    }
    for (const [param, , set] of knobs) {
      specs.push({ name: param, type: 'number', min: 0, max: 1, writable: true });
      ctx.services.onParam?.(param, (v) => {
        if (!N(v)) return;
        const nv = clamp01(v);
        set(nv);
        controls.get(param)?.(nv); // reflect if the strip is on-screen
      });
    }
    // Discrete mute / solo toggles.
    for (const [param, set] of [
      [`ch${n}_mute`, (b: boolean) => (state.strips[idx]!.mute = b)] as const,
      [`ch${n}_solo`, (b: boolean) => (state.strips[idx]!.solo = b)] as const,
    ]) {
      specs.push({ name: param, type: 'bool', writable: true });
      ctx.services.onParam?.(param, (v) => {
        const b = !!v;
        set(b);
        toggles.get(param)?.classList.toggle('on', b);
      });
    }
  }

  // Master + layer.
  for (const [param, setr] of [
    ['master_gain', (v: number) => (state.master.gain = v)] as const,
    ['master_bal', (v: number) => (state.master.bal = v)] as const,
  ]) {
    specs.push({ name: param, type: 'number', min: 0, max: 1, writable: true });
    ctx.services.onParam?.(param, (v) => {
      if (!N(v)) return;
      const nv = clamp01(v);
      setr(nv);
      controls.get(param)?.(nv);
    });
  }
  if (layers > 1) {
    specs.push({ name: 'layer', type: 'number', min: 0, max: layers - 1, writable: true });
    ctx.services.onParam?.('layer', (v) => {
      if (N(v) && v >= 0 && v < layers) selectLayer(Math.floor(v), false);
    });
  }

  ctx.services.advertiseParams?.(specs);
}
