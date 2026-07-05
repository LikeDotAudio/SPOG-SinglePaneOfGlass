// src/editors/timer/engine-types — the DOM-free state shapes for the timer engine.
//
// Split out of engine.ts (audit §4.5) so the TimerEngine class stays a lean state
// machine. engine.ts re-exports every one of these, so consumers importing types
// from './engine.js' keep resolving byte-identically.

import type { Direction, Fps, TimeFormat } from '../../domain/timer-core/index.js';

export type ChanId = 'A' | 'B';
export interface Preset { frames: number; direction: Direction; }
export type GpiWhen = 'start' | 'end' | 'match';
export interface GpiOut { port: 0 | 1; chan: ChanId; when: GpiWhen; matchFrames: number; durationFrames: number; armed: boolean; }
export interface GpiIn { port: 0 | 1; chan: ChanId; preset: number; }

export interface Channel {
  value: number;            // frames (float while running)
  direction: Direction;
  format: TimeFormat;
  running: boolean;
  blank: boolean;           // CLR ALL → dashes until next entry/recall
  followBuffer: number[];   // queued counts (frames), FIFO
  showInput: boolean;       // INPUT: overlay the reference timecode
  returnToInput: boolean;
  matchFired: boolean;
  overtime: boolean;        // a down count reached 0 and is now counting UP (over the target)
  // per-keypad interaction state
  entry: string;
  entering: boolean;
  presetArmed: boolean;
  presetMode: 'store' | 'recall' | null;
  calc: { op: '+' | '-'; operand: number } | null;
  shift: boolean;
  status: string;
}

export interface TimerState {
  channels: Record<ChanId, Channel>;
  presets: (Preset | null)[];   // 20 memories, shared
  fps: Fps;
  brightness: number;       // 0..14
  hour12: boolean;
  utc: boolean;
  leadingZero: boolean;
  serialHmsf: boolean;
  gpiOuts: GpiOut[];
  gpiIns: GpiIn[];
  firmware: string | null;
}

export interface EngineHooks {
  onChange(): void;
  onLog(msg: string): void;
  onGpi(port: 0 | 1, chan: ChanId, when: GpiWhen): void;
}

export const mkChannel = (): Channel => ({
  value: 0, direction: 'down', format: 'hms', running: false, blank: false,
  followBuffer: [], showInput: false, returnToInput: false, matchFired: false, overtime: false,
  entry: '', entering: false, presetArmed: false, presetMode: null, calc: null,
  shift: false, status: 'READY',
});
