// src/editors/person/dsp — the virtual channel strip's DSP model: the Strip
// state shape, its BASE defaults, recallable EQ + compression/dynamics PRESETS
// (audit §1,§5) and the EQ frequency-response math the graph is painted from.

export interface Strip {
  bypass: boolean;
  inGain: number;                                   // dB
  eqOn: boolean; lf: number; lmf: number; hmf: number; hf: number;   // dB
  lmfFreq: number; hmfFreq: number;                 // Hz
  compOn: boolean; threshold: number; ratio: number; attack: number; release: number; makeup: number;
  gate: number; deess: number;
}

export const BASE: Strip = {
  bypass: false, inGain: 0,
  eqOn: true, lf: 0, lmf: 0, hmf: 0, hf: 0, lmfFreq: 400, hmfFreq: 3000,
  compOn: true, threshold: -18, ratio: 3, attack: 10, release: 120, makeup: 3,
  gate: -50, deess: 0,
};

// Recallable "virtual" presets (audit: EQ + compression/dynamics presets).
export const PRESETS: Record<string, Partial<Strip>> = {
  'Voice': { eqOn: true, lf: 1, lmf: -1, hmf: 2, hf: 2, compOn: true, threshold: -18, ratio: 3, makeup: 3, deess: 2, gate: -50 },
  'Warm Anchor': { lf: 3, lmf: 0, hmf: 1, hf: 1, threshold: -20, ratio: 2.5, makeup: 4, deess: 1 },
  'Bright': { lf: 0, lmf: -1, hmf: 3, hf: 5, threshold: -16, ratio: 2, makeup: 2, deess: 3 },
  'Podcast': { lf: 2, lmf: -2, hmf: 2, hf: 3, threshold: -24, ratio: 4, makeup: 6, deess: 4, gate: -42 },
  'Broadcast Loud': { lf: 1, lmf: 0, hmf: 2, hf: 2, threshold: -28, ratio: 6, makeup: 9, deess: 3 },
  'Bypass': { bypass: true },
};

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ── EQ frequency response (dB) at frequency f, from the 4 bands ───────────────
const bell = (f: number, fc: number, g: number, w = 0.55): number =>
  g * Math.exp(-((Math.log(f / fc) / w) ** 2));
const lowShelf = (f: number, fc: number, g: number): number => g * 0.5 * (1 - Math.tanh(Math.log(f / fc) / 0.7));
const highShelf = (f: number, fc: number, g: number): number => g * 0.5 * (1 + Math.tanh(Math.log(f / fc) / 0.7));

export function eqResponse(s: Strip, f: number): number {
  if (!s.eqOn || s.bypass) return 0;
  return lowShelf(f, 120, s.lf) + bell(f, s.lmfFreq, s.lmf) + bell(f, s.hmfFreq, s.hmf) + highShelf(f, 8000, s.hf);
}
