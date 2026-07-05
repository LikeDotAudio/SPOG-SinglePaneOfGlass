// src/editors/vision-mixer/mqtt-registry — the definition-derived MQTT surface.
//
// buildRegistry constructs the whole param registry (per-M/E pgm/pvw/transition/
// rate/tbar/take, per-keyer on/type/source/dve, DSKs, auxes, delegate, scenes,
// tally) plus the legacy M/E-1 aliases, then wires it to the bus. Extracted from
// the render closure; state and callbacks flow through `Surface`. (plan §6/§9)

import { P, wire, type ParamRegistry } from './mqtt.js';
import { recallScene } from './scenes.js';
import { KEYER_TYPES, type MEState, type KeyerState } from './me.js';
import type { TransitionKind } from '../../model/index.js';
import type { Surface } from './surface.js';

/** Build + wire the MQTT registry. `refs` are the T-bar DOM controls it drives. */
export function buildRegistry(s: Surface, refs: { tbar: HTMLInputElement; pct: HTMLElement }): void {
  const { state, def, allLabels } = s;
  const { tbar, pct } = refs;
  const reg: ParamRegistry = new Map();
  const idxOf = (v: unknown): number => allLabels.indexOf(String(v));
  state.mes.forEach((_, n) => {
    const N = n + 1;
    const bank = (): MEState => state.mes[n]!;
    reg.set(`me.${N}.pgm`, { spec: P.enum(`me.${N}.pgm`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { bank().pgm = i; s.sync(); } } });
    reg.set(`me.${N}.pvw`, { spec: P.enum(`me.${N}.pvw`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { bank().pvw = i; s.sync(); } } });
    reg.set(`me.${N}.transition`, { spec: P.enum(`me.${N}.transition`, def.transitions), apply: (v) => { if (def.transitions.includes(v as TransitionKind)) { bank().trans = v as TransitionKind; s.sync(); } } });
    reg.set(`me.${N}.rate`, { spec: P.num(`me.${N}.rate`, 1, 300, 'frames'), apply: (v) => { if (typeof v === 'number') { bank().rate = v; s.sync(); } } });
    reg.set(`me.${N}.tbar`, { spec: P.num(`me.${N}.tbar`, 0, 100, '%'), apply: (v) => { if (typeof v === 'number') { bank().tbar = v; if (n === s.delegate) { tbar.value = String(v); pct.textContent = `${Math.round(v)}%`; } } } });
    reg.set(`me.${N}.take`, { spec: P.bool(`me.${N}.take`), apply: (v) => { if (v) s.doTake(n); } });
    bank().keyers.forEach((_, ki) => {
      const K = ki + 1;
      const kk = (): KeyerState => bank().keyers[ki]!;
      reg.set(`me.${N}.key.${K}.on`, { spec: P.bool(`me.${N}.key.${K}.on`), apply: (v) => { kk().on = !!v; if (n === s.delegate) s.rebuildKeyers(); s.sync(); } });
      reg.set(`me.${N}.key.${K}.type`, { spec: P.enum(`me.${N}.key.${K}.type`, KEYER_TYPES), apply: (v) => { if ((KEYER_TYPES as string[]).includes(String(v))) { kk().type = v as KeyerState['type']; if (n === s.delegate) s.rebuildKeyers(); } } });
      reg.set(`me.${N}.key.${K}.source`, { spec: P.enum(`me.${N}.key.${K}.source`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { kk().source = i; s.sync(); } } });
      reg.set(`me.${N}.key.${K}.dve`, { spec: P.str(`me.${N}.key.${K}.dve`) });
    });
  });
  def.dsks.forEach((_, i) => {
    reg.set(`dsk.${i + 1}.on`, { spec: P.bool(`dsk.${i + 1}.on`), apply: (v) => { state.dsks[i] = !!v; s.sync(); } });
  });
  state.auxes.forEach((_, i) => {
    reg.set(`aux.${i + 1}.source`, { spec: P.enum(`aux.${i + 1}.source`, allLabels), apply: (v) => { const x = idxOf(v); if (x >= 0) { state.auxes[i] = x; s.sync(); } } });
  });
  reg.set('panel.delegate', { spec: P.enum('panel.delegate', state.mes.map((_, i) => `M/E ${i + 1}`)), apply: (v) => { const i = state.mes.findIndex((_, n) => `M/E ${n + 1}` === v); if (i >= 0) { s.delegate = i; s.rebuild(); } } });
  reg.set('scene.recall', { spec: P.enum('scene.recall', s.scenes.map((sc) => sc.name)), apply: (v) => { const sc = s.scenes.find((x) => x.name === v); if (sc) { recallScene(state, sc, def); s.rebuildKeyers(); s.sync(); } } });
  reg.set('scene.store', { spec: P.str('scene.store') });
  reg.set('tally.program', { spec: P.ro('tally.program') });
  // Legacy aliases → M/E 1 (backward compatibility, plan §9).
  reg.set('pgm', { spec: P.enum('pgm', allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { state.mes[0]!.pgm = i; s.sync(); } } });
  reg.set('pvw', { spec: P.enum('pvw', allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { state.mes[0]!.pvw = i; s.sync(); } } });
  reg.set('transition', { spec: P.enum('transition', def.transitions), apply: (v) => { if (def.transitions.includes(v as TransitionKind)) { state.mes[0]!.trans = v as TransitionKind; s.sync(); } } });
  reg.set('tbar', { spec: P.num('tbar', 0, 100, '%'), apply: (v) => { if (typeof v === 'number' && s.delegate === 0) { state.mes[0]!.tbar = v; tbar.value = String(v); pct.textContent = `${Math.round(v)}%`; } } });
  def.dsks.slice(0, 2).forEach((_, i) => {
    reg.set(`dsk${i + 1}`, { spec: P.bool(`dsk${i + 1}`), apply: (v) => { state.dsks[i] = !!v; s.sync(); } });
  });
  wire(s.ctx, reg);
}
