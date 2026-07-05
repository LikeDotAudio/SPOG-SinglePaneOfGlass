// src/editors/audio-mixer/strip — the channel-strip DOM builder.
//
// One `stripEl` builds a single strip (or the MASTER tab): the three-line identity
// header, the collapsible EQ / PAN / aux-send rotaries, the stage-box / wireless
// reveal, mute-solo toggles, fader and VU. `stateKnob` wires one knob to a state
// field (publishes on drag, registers its setter for inbound writes). Both take an
// explicit render context (StripCtx) rather than closing over the view's locals.

import type { Hex } from '../../model/index.js';
import type { EditorContext } from '../types.js';
import { el } from '../../ui/dom.js';
import { knob, fader, meter } from '../../ui/widgets.js';
import type { Channel, MixerState } from './state.js';

export interface StripOpts {
  master?: boolean;
}

/** Everything a strip needs from the view: context, state, the inbound-write handle
 *  maps (controls/toggles) and the throttled publish helper. */
export interface StripCtx {
  ctx: EditorContext;
  state: MixerState;
  controls: Map<string, (v: number) => void>;
  toggles: Map<string, HTMLButtonElement>;
  pub: (name: string, value: unknown, opts?: { throttle?: boolean }) => void;
}

// A knob wired to a state field: publishes on drag, registers its setter for
// inbound writes. `get`/`set` read+write the persistent MixerState.
function stateKnob(
  rc: StripCtx, parent: HTMLElement, label: string, color: string, param: string,
  get: () => number, set: (v: number) => void,
): void {
  const k = knob(label, get(), color, (v) => { set(v); rc.pub(param, v); });
  rc.controls.set(param, k.setValue);
  parent.append(k);
}

export function stripEl(rc: StripCtx, c: Channel, idx: number, opts: StripOpts): HTMLElement {
  const { ctx, state } = rc;
  const master = !!opts.master;
  const wireless = !master && (c.type === 'wireless-mic' || c.type === 'wireless-controller');
  const strip = el('div', { class: 'am-strip' + (master ? ' master' : '') + (wireless ? ' wireless' : '') });
  const n = idx + 1; // 1-based channel number for param names (ch<N>_*)

  const name = el('div', {
    class: 'am-name',
    style: `color:${master ? '#d8c8ff' : c.color}`,
  });
  if (master) {
    name.textContent = 'MASTER';
  } else {
    // Three-line identity: parent / child / source. Lineage comes from the
    // routed feed's origin ("Floor — Room — Device"); a structured label like
    // V104-06-A1 splits on its dashes as the fallback.
    const parts = (c.origin || '').split(' — ').map((s) => s.trim()).filter(Boolean);
    let lines: string[];
    if (parts.length >= 2) {
      lines = [parts[parts.length - 2]!, parts[parts.length - 1]!, c.label];
    } else {
      const segs = c.label.split('-').map((s) => s.trim()).filter(Boolean);
      lines = segs.length >= 3
        ? [segs.slice(0, segs.length - 2).join('-'), segs[segs.length - 2]!, segs[segs.length - 1]!]
        : segs.length === 2 ? [segs[0]!, segs[1]!] : [c.label];
    }
    const src = lines.pop()!;
    lines.forEach((l) => name.append(el('span', { class: 'am-ln ctx', textContent: l })));
    name.append(el('span', { class: 'am-ln src', textContent: `${wireless ? '📶 ' : ''}${src}` }));
    name.title = c.origin || c.label;
  }
  strip.append(name);

  if (!master) {
    const st = state.strips[idx]!;
    // EQ, PAN and the aux sends live in one collapsible bank.
    const rot = el('div', { class: 'am-rotaries' });

    const eq = el('div', { class: 'am-eq' });
    stateKnob(rc, eq, 'HI', c.color, `ch${n}_eq_hi`, () => st.eqHi, (v) => (st.eqHi = v));
    stateKnob(rc, eq, 'MID', c.color, `ch${n}_eq_mid`, () => st.eqMid, (v) => (st.eqMid = v));
    stateKnob(rc, eq, 'LO', c.color, `ch${n}_eq_lo`, () => st.eqLo, (v) => (st.eqLo = v));
    rot.append(eq);
    stateKnob(rc, rot, 'PAN', '#9fb6cc', `ch${n}_pan`, () => st.pan, (v) => (st.pan = v));

    // Aux sends: mix-minus bank (MM 1–4) then monitor bank (MON 1–4).
    const aux = el('div', { class: 'am-aux' });
    aux.append(el('div', { class: 'am-aux-h', textContent: 'Aux Sends' }));
    const ag = el('div', { class: 'am-aux-grid' });
    for (let j = 0; j < 4; j++) {
      const k = j; // capture
      stateKnob(rc, ag, `MM ${k + 1}`, '#FF9C63', `ch${n}_mm${k + 1}`, () => st.mm[k]!, (v) => (st.mm[k] = v));
    }
    for (let j = 0; j < 4; j++) {
      const k = j;
      stateKnob(rc, ag, `MON ${k + 1}`, '#3FC1C9', `ch${n}_mon${k + 1}`, () => st.mon[k]!, (v) => (st.mon[k] = v));
    }
    aux.append(ag);
    rot.append(aux);
    strip.append(rot);

    const isWireless = wireless;
    const ob = el('button', { class: 'am-pre-open' + (isWireless ? ' wireless' : ''), textContent: isWireless ? '📶 WIRELESS MIC' : '⚙ STAGE BOX' });
    // The button flashes (am-sens-reveal) when clicked, giving access to parameters
    ob.addEventListener('click', (e) => {
      e.stopPropagation();
      ob.classList.remove('am-sens-reveal');
      void ob.offsetWidth;
      ob.classList.add('am-sens-reveal');
      if (isWireless) {
        ctx.services.openWirelessMic?.(c.label, c.color as Hex);
      } else {
        ctx.services.openStageBox(c.label, c.color as Hex, [c.label]);
      }
    });
    strip.append(ob);

    const ms = el('div', { class: 'am-ms' });
    const mute = el('button', { class: 'mute', textContent: 'M' }) as HTMLButtonElement;
    const solo = el('button', { class: 'solo', textContent: 'S' }) as HTMLButtonElement;
    mute.classList.toggle('on', st.mute);
    solo.classList.toggle('on', st.solo);
    // Discrete toggles → publish un-throttled (one-shot events, not a drag loop).
    mute.addEventListener('click', () => { st.mute = !st.mute; mute.classList.toggle('on', st.mute); rc.pub(`ch${n}_mute`, st.mute, { throttle: false }); });
    solo.addEventListener('click', () => { st.solo = !st.solo; solo.classList.toggle('on', st.solo); rc.pub(`ch${n}_solo`, st.solo, { throttle: false }); });
    rc.toggles.set(`ch${n}_mute`, mute);
    rc.toggles.set(`ch${n}_solo`, solo);
    ms.append(mute, solo);
    strip.append(ms);
  } else {
    stateKnob(rc, strip, 'BAL', '#d8c8ff', 'master_bal', () => state.master.bal, (v) => (state.master.bal = v));
  }

  const fa = el('div', { class: 'am-fadarea' });
  if (master) {
    const fd = fader('', state.master.gain, '#c3a8ff', (v) => { state.master.gain = v; rc.pub('master_gain', v); });
    rc.controls.set('master_gain', fd.setValue);
    fa.append(fd);
  } else {
    const st = state.strips[idx]!;
    const fd = fader('', st.gain, c.color, (v) => { st.gain = v; rc.pub(`ch${n}_gain`, v); });
    rc.controls.set(`ch${n}_gain`, fd.setValue);
    fa.append(fd);
  }
  fa.append(meter(ctx.dispose, 0.3));
  if (master) fa.append(meter(ctx.dispose, 0.3));
  strip.append(fa);
  strip.append(el('div', { class: 'am-db', textContent: '0 dB' }));
  return strip;
}
