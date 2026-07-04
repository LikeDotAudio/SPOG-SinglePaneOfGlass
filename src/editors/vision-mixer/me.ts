// src/editors/vision-mixer/me — the M/E bank state machine (pure, no DOM).
//
// One MEBank = one complete compositing engine (audit §3): PGM/PST buses with
// flip-flop takes, an armed transition + rate, a T-bar position, and a keyer
// stack. The bank knows nothing about buttons or canvases — index.ts renders it,
// mqtt.ts publishes it. Source indices address the shared input pool; indices at
// or beyond the pool length are RE-ENTRIES (pool.length + m = output of M/E m).

import type { KeyerDef, KeyerType, MEPreset, SwitcherDef, TransitionKind } from '../../model/index.js';

export interface KeyerState extends Required<Pick<KeyerDef, 'on' | 'type' | 'source'>> {
  dve?: string;                  // DVEPreset id
}

export interface MEState {
  pgm: number;
  pvw: number;
  trans: TransitionKind;
  rate: number;                  // auto-transition duration, frames
  tbar: number;                  // 0..100
  keyers: KeyerState[];
  split?: boolean;
}

export const newKeyer = (d: KeyerDef = {}): KeyerState => ({
  on: d.on ?? false,
  type: d.type ?? 'linear',
  source: d.source ?? 0,
  ...(d.dve ? { dve: d.dve } : {}),
});

export function newME(def: SwitcherDef, seedPvw = 1): MEState {
  return {
    pgm: 0,
    pvw: Math.min(seedPvw, def.inputs.length - 1),
    trans: 'MIX',
    rate: 24,
    keyers: Array.from({ length: def.keyersPerMe }, () => newKeyer()),
    tbar: 0,
    split: false,
  };
}

/** Flip-flop take: PGM ⇄ PVW, T-bar resets (audit §2). */
export function take(me: MEState): void {
  const t = me.pgm;
  me.pgm = me.pvw;
  me.pvw = t;
  me.tbar = 0;
}

/** Apply an M/E preset (a saved composite look) onto a bank. */
export function applyPreset(me: MEState, p: MEPreset, def: SwitcherDef): void {
  me.pgm = clampSrc(p.pgm, def);
  me.pvw = clampSrc(p.pvw, def);
  me.trans = p.trans;
  me.rate = p.rate;
  me.keyers = Array.from({ length: def.keyersPerMe }, (_, k) => newKeyer(p.keyers[k]));
  me.split = p.split;
}

/** Capture a bank as a preset (the M/E editor's "save look"). */
export function capturePreset(me: MEState, id: string, name: string): MEPreset {
  return {
    id, name,
    pgm: me.pgm, pvw: me.pvw, trans: me.trans, rate: me.rate,
    keyers: me.keyers.map((k) => ({ ...k })),
    split: me.split,
  };
}

const clampSrc = (i: number, def: SwitcherDef): number =>
  Math.max(0, Math.min(i, def.inputs.length + def.mes - 1));

/** Is source index i a re-entry, and of which bank? (null = a plain input). */
export function reentryOf(i: number, def: SwitcherDef): number | null {
  return i >= def.inputs.length ? i - def.inputs.length : null;
}

/** Label for any source index — inputs by name, re-entries as "M/E n". */
export function srcLabel(i: number, def: SwitcherDef): string {
  const re = reentryOf(i, def);
  return re === null ? (def.inputs[i]?.label ?? '—') : `M/E ${re + 1}`;
}

/**
 * Tally (audit §13): the set of INPUT indices contributing to a bank's program
 * output — background + active keys, re-entries resolved recursively. `visited`
 * guards against re-entry loops (M/E 2 into M/E 3 into M/E 2…).
 */
export function tallySet(mes: MEState[], bank: number, def: SwitcherDef, visited = new Set<number>()): Set<number> {
  const out = new Set<number>();
  if (visited.has(bank)) return out;
  visited.add(bank);
  const me = mes[bank];
  if (!me) return out;
  const add = (src: number): void => {
    const re = reentryOf(src, def);
    if (re === null) out.add(src);
    else for (const s of tallySet(mes, re, def, visited)) out.add(s);
  };
  add(me.pgm);
  for (const k of me.keyers) if (k.on) add(k.source);
  return out;
}

export const KEYER_TYPES: KeyerType[] = ['luma', 'chroma', 'linear', 'split', 'pattern'];
