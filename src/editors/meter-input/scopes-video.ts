// src/editors/meter-input/scopes-video — VIDEO scope painters (render analysis
// onto editor canvases). Split from live-input.ts: the shared draw primitives
// (ctx2d / fade / IRE graticule / pan-zoom View) plus every luma/chroma/RGB/
// gamut painter. Re-exported through live-input.ts so import sites are unchanged.
import type { FrameData } from './live-input.js';

// ---- draw helpers (render analysis onto editor canvases) -------------------
export function ctx2d(cv: HTMLCanvasElement): CanvasRenderingContext2D | null { return cv.getContext('2d'); }

// --- phosphor look: fade the previous frame (persistence trail) instead of a hard
//     clear, then plot sparse, low-alpha, ADDITIVE dots so the signal glows where
//     it dwells and leaves soft ghosts. The graticule is redrawn crisp each frame.
export function fade(c: CanvasRenderingContext2D, W: number, H: number, a: number): void {
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = `rgba(3,6,15,${a})`;
  c.fillRect(0, 0, W, H);
}

// The vertical axis runs -10…110 IRE so 0 and 100 sit inside the frame with margin
// (sub-black / super-white headroom, like a broadcast waveform monitor).
const IRE_LO = -10, IRE_HI = 110;
const ireFrac = (ire: number): number => (ire - IRE_LO) / (IRE_HI - IRE_LO);   // -10→0, 110→1
const ireY = (ire: number, H: number): number => H - ireFrac(ire) * (H - 2) - 1;

// A pan+zoom view for a scope: content is drawn in natural coords, then a canvas
// transform scales by `z` and translates by (px,py) — so wheel-zoom can centre on
// the pointer and drag can pan. Fades run at IDENTITY (they cover the full canvas).
export interface View { z: number; px: number; py: number }
export const IDENTITY_VIEW: View = { z: 1, px: 0, py: 0 };
export const applyView = (c: CanvasRenderingContext2D, v: View): void => { c.setTransform(v.z, 0, 0, v.z, v.px, v.py); };
export const resetView = (c: CanvasRenderingContext2D): void => { c.setTransform(1, 0, 0, 1, 0, 0); };

// Orange IRE graticule within [x0, x0+w]; majors every 20 IRE, labelled. The
// -10 / 110 margins get a faint boundary line.
function drawIRE(c: CanvasRenderingContext2D, x0: number, w: number, H: number): void {
  c.lineWidth = 1; c.font = 'bold 9px Arial'; c.textAlign = 'left';
  for (const ire of [-10, 110]) {
    const y = ireY(ire, H);
    c.strokeStyle = 'rgba(224,138,30,0.12)'; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke();
  }
  for (let ire = 0; ire <= 100; ire += 10) {
    const y = ireY(ire, H), major = ire % 20 === 0;
    c.strokeStyle = major ? 'rgba(224,138,30,0.5)' : 'rgba(224,138,30,0.2)';
    c.beginPath(); c.moveTo(x0 + (major ? 18 : 0), y); c.lineTo(x0 + w, y); c.stroke();
    if (major) { c.fillStyle = 'rgba(224,138,30,0.85)'; c.fillText(String(ire), x0 + 2, y - 2); }
  }
}

// Per-column histogram → density dots (brightness = pixel count), additive, with
// a persistence trail. `hist` is AW×BINS; draws within [x0, x0+w].
function drawDensity(c: CanvasRenderingContext2D, hist: Uint32Array, AW: number, BINS: number, x0: number, w: number, H: number, rgb: string): void {
  c.globalCompositeOperation = 'lighter';
  const bh = Math.max(1, (H - 2) / BINS);
  for (let x = 0; x < w; x++) {
    const col = ((x / w * AW) | 0) * BINS;
    for (let bin = 0; bin < BINS; bin++) {
      const cnt = hist[col + bin]; if (!cnt) continue;
      const y = ireY((bin / (BINS - 1)) * 100, H);   // value 0..255 → 0..100 IRE
      c.fillStyle = `rgba(${rgb},${Math.min(0.85, cnt * 0.05)})`;
      c.fillRect(x0 + x, y - bh / 2, 1, bh);
    }
  }
  c.globalCompositeOperation = 'source-over';
}

export function drawParadeReal(cv: HTMLCanvasElement, d: FrameData, view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height, pw = W / 3;
  resetView(c); fade(c, W, H, 0.28); applyView(c, view);
  const chans: Array<[Uint32Array, string]> = [[d.rH, '255,64,64'], [d.gH, '64,255,96'], [d.bH, '96,150,255']];
  chans.forEach(([hist, rgb], p) => { drawIRE(c, p * pw, pw, H); drawDensity(c, hist, d.AW, d.BINS, p * pw, pw, H, rgb); });
  resetView(c);
}

// RGB Stacked waveform — R, G, B each in its own full-width lane (red top, green
// middle, blue bottom), density-plotted with a per-lane IRE graticule.
export function drawRGBStacked(cv: HTMLCanvasElement, d: FrameData, view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height;
  resetView(c); fade(c, W, H, 0.28); applyView(c, view);
  const lh = H / 3, BINS = d.BINS, bh = Math.max(1, (lh - 2) / BINS);
  const chans: Array<[Uint32Array, string]> = [[d.rH, '255,64,64'], [d.gH, '64,255,96'], [d.bH, '96,150,255']];
  chans.forEach(([hist, rgb], p) => {
    const bot = p * lh + lh;
    const yOf = (ire: number): number => bot - ireFrac(ire) * (lh - 2) - 1;
    c.strokeStyle = 'rgba(224,138,30,0.22)'; c.lineWidth = 1; c.font = '8px Arial'; c.textAlign = 'left';
    for (const ire of [0, 50, 100]) { const y = yOf(ire); c.beginPath(); c.moveTo(16, y); c.lineTo(W, y); c.stroke(); c.fillStyle = 'rgba(224,138,30,0.7)'; c.fillText(String(ire), 1, y + 3); }
    c.globalCompositeOperation = 'lighter';
    for (let x = 0; x < W; x++) {
      const col = ((x / W * d.AW) | 0) * BINS;
      for (let bin = 0; bin < BINS; bin++) {
        const cnt = hist[col + bin]; if (!cnt) continue;
        c.fillStyle = `rgba(${rgb},${Math.min(0.85, cnt * 0.05)})`;
        c.fillRect(x, yOf((bin / (BINS - 1)) * 100) - bh / 2, 1, bh);
      }
    }
    c.globalCompositeOperation = 'source-over';
  });
  resetView(c);
}

export function drawWaveReal(cv: HTMLCanvasElement, hist: Uint32Array, AW: number, BINS: number, rgb = '130,255,140', view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height;
  resetView(c); fade(c, W, H, 0.28); applyView(c, view);
  drawIRE(c, 0, W, H);
  drawDensity(c, hist, AW, BINS, 0, W, H, rgb);
  resetView(c);
}

// Chroma waveform — per-column saturation (max−min of RGB) density, the colour
// counterpart of the luma waveform. Vertical axis reads 0…100 % saturation; a
// magenta trace so it never gets confused with the green luma waveform.
export function drawChromaReal(cv: HTMLCanvasElement, hist: Uint32Array, AW: number, BINS: number, view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height;
  resetView(c); fade(c, W, H, 0.28); applyView(c, view);
  drawIRE(c, 0, W, H);   // 0…100 graticule reads as % saturation here
  drawDensity(c, hist, AW, BINS, 0, W, H, '224,120,255');
  resetView(c);
}

// RGB(A) Overlay waveform — R, G, B and Alpha densities on ONE set of axes,
// additive (where channels coincide → white), like DaVinci's RGB overlay.
export function drawRGBOverlay(cv: HTMLCanvasElement, d: FrameData, view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height;
  resetView(c); fade(c, W, H, 0.28); applyView(c, view);
  drawIRE(c, 0, W, H);
  drawDensity(c, d.aH, d.AW, d.BINS, 0, W, H, '150,150,160');   // alpha (pale, drawn first)
  drawDensity(c, d.rH, d.AW, d.BINS, 0, W, H, '255,64,64');
  drawDensity(c, d.gH, d.AW, d.BINS, 0, W, H, '64,255,96');
  drawDensity(c, d.bH, d.AW, d.BINS, 0, W, H, '96,150,255');
  resetView(c);
}
