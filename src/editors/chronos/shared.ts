// src/editors/chronos/shared — the display contract + shared time model/primitives.
//
// Chronos is split into two orthogonal halves:
//   • CONTROLLERS (controllers.ts) — the timing engines: a count-up stopwatch, a
//     count-down egg timer, the free-running wall clock. Each owns a millisecond
//     value + transport (start/stop/reset) and advances itself each frame.
//   • DISPLAYS (displays/*.ts) — the visual read-outs. A display renders ONE
//     controller's value; the two are independent, so any display can draw any
//     controller (a chrono as an analog stopwatch, a digital LED read-out, …).
// Each display lives in its own file under displays/ and default-exports a
// DisplayDef; the editor collects them with import.meta.glob, so adding a read-out
// is "drop a file". Displays are pure: they draw into a W×H canvas box from a
// DisplayCtx — no DOM, no globals.

import type { SegFont, SegColor } from '../../ui/seven-seg.js';

export const TAU = Math.PI * 2;
export const pad = (n: number): string => String(n).padStart(2, '0');

export type Font = SegFont;
export type Color = SegColor;

/** What a controller is doing — a count-up, a count-down, or the wall clock. */
export type CtrlKind = 'up' | 'down' | 'clock';

/** ms → HH:MM:SS (clamped to a 2-digit hour, a 99h ceiling). */
export function fmt(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600) % 100, m = Math.floor(total / 60) % 60, s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** ms since local midnight — the wall-clock controller's value. */
export function localMs(): number {
  const d = new Date();
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000 + d.getMilliseconds();
}

// ---- display contract -------------------------------------------------------
/** Everything a display needs to draw one frame of one controller. */
export interface DisplayCtx {
  ms: number;        // the controller's current value
  kind: CtrlKind;    // up / down / clock (a display may adapt to it)
  running: boolean;  // controller transport state (for blink / motion cues)
  font: Font;        // numeric read-out font (7-seg vs Arial)
  color: Color;      // numeric read-out colour (red vs white)
  label: string;     // the card's caption
  now: number;       // performance.now() timestamp for animation
}

export type DisplayDraw = (g: CanvasRenderingContext2D, W: number, H: number, c: DisplayCtx) => void;

/** A self-contained read-out's manifest — its single default export. */
export interface DisplayDef {
  id: string;
  label: string;   // full label for the display picker
  short: string;   // compact label for the per-card selector
  order?: number;  // UI ordering (lower first; default 100)
  h: number;       // preferred card height in CSS px (wide read-outs are short)
  draw: DisplayDraw;
}

// ---- drawing primitives -----------------------------------------------------
export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath();
}
