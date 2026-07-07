// src/domain/tsg — the Test Signal Generator: a routable family of standardised
// SMPTE / EBU / ITU / VESA test patterns (SDR + HDR), one painter per file under
// patterns/. `drawTsg` is the DPR-aware driver for a VISIBLE canvas; the individual
// `pattern.draw(g,W,H,t)` painters can be called directly for an offscreen buffer
// (e.g. the meter-input analysis canvas). See docs/Audit/Test-Frame-Routing-Audit.md.

import { patternById, DEFAULT_TSG } from './catalog.js';
import type { TsgPattern } from './types.js';

export * from './types.js';
export { PATTERNS, DEFAULT_TSG, patternById, patternForLabel, byGroup } from './catalog.js';

/** The localStorage key a twist's chosen TSG pattern is persisted under. Shared by
 *  the TSG editor (writer) and the SIGNALING studio frame (reader). */
export const tsgKey = (prod: string, twist: string): string => `tsg:${prod}:${twist}`;

/** The pattern last chosen for a (room, twist), or the default. */
export function tsgFor(prod: string, twist: string): TsgPattern {
  try { const id = localStorage.getItem(tsgKey(prod, twist)); if (id) return patternById(id); } catch { /* ignore */ }
  return DEFAULT_TSG;
}

/** Paint pattern `id` onto a visible canvas, sizing the backing store to its CSS box
 *  (DPR-aware) — the same contract as ui/faux-signal.drawFauxSignal. `t` (ms) drives
 *  any live motion. Safe to call every frame. */
export function drawTsg(canvas: HTMLCanvasElement, id: string | undefined, t = 0): void {
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  const laidOut = cw > 0 && ch > 0;
  const W = laidOut ? cw : canvas.width, H = laidOut ? ch : canvas.height;
  if (!W || !H) return;
  if (laidOut) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  const g = canvas.getContext('2d'); if (!g) return;
  const s = laidOut ? dpr : 1; g.setTransform(s, 0, 0, s, 0, 0);
  g.clearRect(0, 0, W, H);
  patternById(id).draw(g, W, H, t);
}
