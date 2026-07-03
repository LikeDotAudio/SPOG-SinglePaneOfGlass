// src/domain/timer-core — the PURE dual-timer count engine (RC1000 audit T0).
//
// Zero DOM, zero globals — the frame-accurate count math the RC1000 editor drives,
// extracted so it is unit-testable and WASM-portable (the sibling of routing-core).
// The single source of truth for a count is an INTEGER FRAME value; every view
// (HH:MM:SS vs MM:SS.FF, leading-zero blanking, 12/24h) is a projection over it,
// and every mutation (advance, add/sub, nudge, keypad entry, calculator) is frame
// math. Storing a count as a formatted string is the classic RC1000-port bug this
// module exists to prevent.

export type Fps = 24 | 25 | 30;
export type Direction = 'up' | 'down';
/** HH:MM:SS (smallest unit = second) or MM:SS.FF (smallest unit = frame). */
export type TimeFormat = 'hms' | 'msf';

/** RC1000 rollover: 23:59:29 → 00:00:00 and under-run the other way (manual §1.2). */
export const ROLLOVER_HOURS = 24;

export function maxFrames(fps: Fps): number {
  return ROLLOVER_HOURS * 3600 * fps;
}

/** Wrap a frame count into [0, 24h) — the RC1000 roll-over / roll-under.
    Keeps fractional frames (a running count advances by sub-frame deltas); callers
    round for display via `decompose`. */
export function wrap(frames: number, fps: Fps): number {
  const max = maxFrames(fps);
  return (((frames % max) + max) % max);
}

/** Advance a value by `deltaFrames` in the channel's direction, with wrap. */
export function advance(frames: number, dir: Direction, deltaFrames: number, fps: Fps): number {
  return wrap(frames + (dir === 'up' ? deltaFrames : -deltaFrames), fps);
}

/** Break a frame count into calendar-ish components (h capped at 2 digits). */
export function decompose(frames: number, fps: Fps): { h: number; m: number; s: number; f: number } {
  const w = wrap(frames, fps);
  const f = Math.floor(w % fps);
  const totalSec = Math.floor(w / fps);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600) % 100;
  return { h, m, s, f };
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Frames → the 6-digit display string for the chosen format. */
export function formatValue(frames: number, format: TimeFormat, fps: Fps, blankLeadingZeros = false): string {
  const { h, m, s, f } = decompose(frames, fps);
  let out: string;
  if (format === 'hms') {
    out = `${pad(h)}:${pad(m)}:${pad(s)}`;
  } else {
    // MM:SS.FF — minutes may exceed 60 (short-duration counts); cap at 2 digits.
    const totalMin = Math.floor(wrap(frames, fps) / fps / 60) % 100;
    out = `${pad(totalMin)}:${pad(s)}.${pad(f)}`;
  }
  if (blankLeadingZeros) out = blankLead(out);
  return out;
}

/** Replace leading zeros (and their separators) with spaces, per SHIFT-9. */
function blankLead(s: string): string {
  let i = 0;
  while (i < s.length && (s[i] === '0' || s[i] === ':' || s[i] === '.')) {
    // stop as soon as we hit the last two chars so we never blank a lone "00"→"" entirely
    if (i >= s.length - 1) break;
    i++;
  }
  return ' '.repeat(i) + s.slice(i);
}

/**
 * Keypad entry, calculator-style: digits fill from the RIGHT into HH MM SS (hms)
 * or MM SS FF (msf) pairs, with overflow normalised through frame math. So both
 * "100" and "60" yield one minute (manual §Example 1), and "13000" → 1:30:00.
 */
export function parseEntry(digits: string, format: TimeFormat, fps: Fps): number {
  const d = digits.replace(/\D/g, '');
  if (!d) return 0;
  const p = (d.length > 6 ? d.slice(-6) : d).padStart(6, '0');
  const a = Number(p.slice(0, 2)), b = Number(p.slice(2, 4)), c = Number(p.slice(4, 6));
  if (format === 'hms') return wrap((a * 3600 + b * 60 + c) * fps, fps);
  return wrap((a * 60 + b) * fps + c, fps);   // msf: a=min, b=sec, c=frames
}

/** One nudge (INC/DEC): ±1 second in hms, ±1 frame in msf. */
export function nudgeFrames(format: TimeFormat, fps: Fps): number {
  return format === 'hms' ? fps : 1;
}

/** Calculator add/subtract, wrapped. */
export function calc(a: number, op: '+' | '-', b: number, fps: Fps): number {
  return wrap(op === '+' ? a + b : a - b, fps);
}
