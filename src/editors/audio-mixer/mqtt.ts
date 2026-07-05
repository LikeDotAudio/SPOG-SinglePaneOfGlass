// src/editors/audio-mixer/mqtt — the console's MQTT param wiring.
//
// Advertises the full R/W schema (per-channel gain/pan/mute/solo/EQ/aux + master
// gain/bal + layer) and honours inbound writes: a write drives the persistent
// MixerState and, when the strip is on-screen, reflects the move onto its widget.
// Never scrapes the DOM — values come from / go to state (publish-spec).

import type { ParamSpec } from '../../platform/mqtt/types.js';
import type { EditorContext } from '../types.js';
import type { MixerState } from './state.js';

/** Live handles the wiring needs from the view: strip/layer counts, the widget
 *  setter maps (controls/toggles) and the layer switcher (for an inbound `layer`). */
export interface MixerRefs {
  channelCount: number;
  layers: number;
  controls: Map<string, (v: number) => void>;
  toggles: Map<string, HTMLButtonElement>;
  selectLayer: (i: number, publish: boolean) => void;
}

export function wireMixerParams(ctx: EditorContext, state: MixerState, refs: MixerRefs): void {
  const { channelCount, layers, controls, toggles, selectLayer } = refs;

  // ----- MQTT: advertise the full R/W schema, then honour inbound writes. -----
  const specs: ParamSpec[] = [];
  const N = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
  const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

  for (let i = 0; i < channelCount; i++) {
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
