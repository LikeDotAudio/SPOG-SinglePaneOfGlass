// src/editors/ifb/state — the per-instance IFB model (the legacy `s` object) plus
// the interrupt hierarchy table and the dB formatter. Pure data; no DOM.

/** The three encoder targets — also the keys the dials drive on the state. */
export type DialKey = 'progGain' | 'intGain' | 'threshold';

/** Where this talent's IFB feed is delivered: the wired stage-box return, the
 *  wireless (RF beltpack/IEM) leg, or split to both. */
export type IfbRoute = 'wired' | 'wireless' | 'split';
export const ROUTE_VALUES = ['wired', 'wireless', 'split'] as const;

/** Live IFB ballistics state (mirrors the legacy `s` object verbatim). */
export interface IfbState {
  progGain: number;
  intGain: number;
  threshold: number;
  prog: number;
  progTarget: number;
  intLvl: number;
  /** Active talk priority (0 = clear, 1..3 = held key). */
  talk: number;
  /** Delivery routing decision — wired stage box, wireless IFB, or both. */
  route: IfbRoute;
}

export const initialState = (): IfbState => ({
  progGain: 0.7,
  intGain: 0.8,
  threshold: 0.55,
  prog: 0.4,
  progTarget: 0.45,
  intLvl: 0,
  talk: 0,
  route: 'split',
});

/** One interrupt-hierarchy talk key. */
export interface Prio {
  p: number;
  nm: string;
  sub: string;
  c: string;
}

/** Talk hierarchy: P1 Director (breaks program) · P2 TD · P3 Production Asst. */
export const PRIO: readonly Prio[] = [
  { p: 1, nm: 'DIRECTOR', sub: 'Breaks program', c: '#ff3b3b' },
  { p: 2, nm: 'TECH DIRECTOR', sub: 'Urgent technical', c: '#ffd400' },
  { p: 3, nm: 'PRODUCTION ASST', sub: 'Timing cues', c: '#6FC8F0' },
];

/** Linear level → relative dB readout (verbatim from the legacy editor). */
export const dB = (v: number): string =>
  v <= 0.001 ? '-∞ dB' : `${Math.round((v - 1) * 48)} dB`;

// ---- MQTT param naming (audit §4.5) ---------------------------------------
// The IFB window is a GRID of talent strips (one per same-kind sibling), yet all
// strips share ONE twist topic. So every param is flat-indexed by strip — `t<N>_…`
// (1-based) — mirroring the ch<N>_ scheme used by the audio-positioner.

/** Topic prefix for the strip at grid index `idx` (0-based → `t1_`, `t2_`, …). */
export const stripPrefix = (idx: number): string => `t${idx + 1}_`;

/** Encoder key → snake_case param leaf (the three driveable IFB encoders). */
export const DIAL_PARAM: Record<DialKey, string> = {
  progGain: 'prog_gain',
  intGain: 'int_gain',
  threshold: 'threshold',
};

/** The interrupt/talk state as an enum — index doubles as the `talk` priority
 *  (0 = clear, 1..3 = held key), so `TALK_VALUES[s.talk]` names the current state. */
export const TALK_VALUES = ['clear', 'p1', 'p2', 'p3'] as const;
