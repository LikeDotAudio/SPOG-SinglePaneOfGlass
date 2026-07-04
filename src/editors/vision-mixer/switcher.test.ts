// src/editors/vision-mixer/switcher.test — the pure switcher core.
//
// Locks the deployment-plan contracts that don't need a DOM: the schema resolver
// (default ⊕ legacy inputs ⊕ authored switcher), the M/E state machine (flip-flop
// take, re-entry labels, loop-safe tally), scene round-trips, and DVE keyframe
// interpolation.

import { describe, it, expect } from 'vitest';
import { DEFAULT_SWITCHER } from './schema.js';
import { newME, take, srcLabel, reentryOf, tallySet, applyPreset, capturePreset } from './me.js';
import { captureScene, recallScene } from './scenes.js';
import { lerpKf, poseAt } from './dve.js';
import { FULL } from './schema.js';
import type { SwitcherDef } from '../../model/index.js';

const def: SwitcherDef = DEFAULT_SWITCHER;

describe('schema', () => {
  it('ships a complete 24-in / 3-M/E / 4-keyer default', () => {
    expect(def.inputs).toHaveLength(24);
    expect(def.mes).toBe(3);
    expect(def.keyersPerMe).toBe(4);
    expect(def.dsks.length).toBeGreaterThanOrEqual(2);
    expect(def.dvePresets.length).toBeGreaterThan(0);
    expect(def.scenes.length).toBeGreaterThan(0);
  });
});

describe('M/E state machine', () => {
  it('take flip-flops PGM/PVW and resets the T-bar', () => {
    const me = newME(def);
    me.pgm = 3; me.pvw = 7; me.tbar = 100;
    take(me);
    expect(me.pgm).toBe(7);
    expect(me.pvw).toBe(3);
    expect(me.tbar).toBe(0);
  });

  it('labels re-entries as M/E n beyond the input pool', () => {
    expect(reentryOf(2, def)).toBeNull();
    expect(reentryOf(def.inputs.length + 1, def)).toBe(1);
    expect(srcLabel(def.inputs.length, def)).toBe('M/E 1');
    expect(srcLabel(0, def)).toBe(def.inputs[0]!.label);
  });

  it('tally resolves re-entry recursively and survives loops', () => {
    const mes = [newME(def), newME(def), newME(def)];
    mes[2]!.pgm = def.inputs.length + 1;          // M/E 3 ← M/E 2
    mes[1]!.pgm = 5;                              // M/E 2 ← input 5
    mes[1]!.keyers[0] = { on: true, type: 'linear', source: 9 };
    // loop bait: M/E 2's keyer 2 re-enters M/E 3
    mes[1]!.keyers[1] = { on: true, type: 'luma', source: def.inputs.length + 2 };
    const t = tallySet(mes, 2, def);
    expect([...t].sort((a, b) => a - b)).toEqual([5, 9]);
  });

  it('M/E preset round-trips through capture/apply', () => {
    const me = newME(def);
    me.pgm = 4; me.trans = 'WIPE'; me.rate = 60;
    me.keyers[1] = { on: true, type: 'chroma', source: 8, dve: 'pip-tr' };
    const p = capturePreset(me, 'x', 'X');
    const fresh = newME(def);
    applyPreset(fresh, p, def);
    expect(fresh.pgm).toBe(4);
    expect(fresh.trans).toBe('WIPE');
    expect(fresh.keyers[1]).toMatchObject({ on: true, type: 'chroma', source: 8, dve: 'pip-tr' });
    expect(fresh.keyers).toHaveLength(def.keyersPerMe);
  });
});

describe('scenes', () => {
  it('whole-switcher round-trip: capture → mutate → recall restores', () => {
    const state = { mes: [newME(def), newME(def), newME(def)], dsks: [true, false], auxes: [] };
    state.mes[0]!.pgm = 11;
    const snap = captureScene(state, 's', 'S');
    state.mes[0]!.pgm = 2;
    state.dsks[0] = false;
    recallScene(state, snap, def);
    expect(state.mes[0]!.pgm).toBe(11);
    expect(state.dsks[0]).toBe(true);
  });
});

describe('DVE math', () => {
  it('lerps keyframes linearly at t', () => {
    const b = { ...FULL, x: 100, scale: 50 };
    const mid = lerpKf(FULL, b, 0.5);
    expect(mid.x).toBe(50);
    expect(mid.scale).toBe(75);
  });

  it('poseAt settles on B after ms (and instantly for ms=0)', () => {
    const p = { id: 'p', name: 'P', a: FULL, b: { ...FULL, x: 40 }, ms: 100 };
    expect(poseAt(p, 0, 1000).x).toBe(40);
    expect(poseAt({ ...p, ms: 0 }, 0, 0).x).toBe(40);
  });
});
