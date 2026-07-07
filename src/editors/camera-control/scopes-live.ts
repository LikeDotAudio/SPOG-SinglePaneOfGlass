// src/editors/camera-control/scopes-live — the RGB parade + vectorscope computed from
// the ACTUAL camera picture (the faux person-in-a-room frame), not synthetic state. Each
// tick the subject canvas is downsampled into a tiny offscreen and its pixels drive the
// waveforms, so the scopes track the real framed content — the person included.

const OW = 128, OH = 72;
let off: HTMLCanvasElement | null = null;
let octx: CanvasRenderingContext2D | null = null;

/** Downsample the subject canvas → RGBA bytes (or null if unreadable). */
function sample(subject: HTMLCanvasElement): Uint8ClampedArray | null {
  if (!off) { off = document.createElement('canvas'); off.width = OW; off.height = OH; octx = off.getContext('2d', { willReadFrequently: true }); }
  if (!octx) return null;
  try { octx.drawImage(subject, 0, 0, OW, OH); return octx.getImageData(0, 0, OW, OH).data; } catch { return null; }
}
function fit(cv: HTMLCanvasElement): [number, number] {
  const W = cv.clientWidth || cv.width, H = cv.clientHeight || cv.height;
  if (cv.width !== W) cv.width = W; if (cv.height !== H) cv.height = H;
  return [W, H];
}
function bg(b: Uint8ClampedArray): void { for (let i = 0; i < b.length; i += 4) { b[i] = 6; b[i + 1] = 11; b[i + 2] = 18; b[i + 3] = 255; } }

/** RGB PARADE: three side-by-side panels (R | G | B). In each panel, image column → X,
 *  that channel's value → IRE (Y), density → brightness — the classic broadcast look, so
 *  the waveform is unmistakably the camera picture. */
function parade(cv: HTMLCanvasElement, data: Uint8ClampedArray): void {
  const [W, H] = fit(cv); const g = cv.getContext('2d'); if (!g) return;
  const img = g.createImageData(W, H), b = img.data; bg(b);
  const secW = W / 3;
  // IRE gridlines (all panels) + panel dividers.
  for (let k = 0; k <= 4; k++) { const y = ((1 - k / 4) * (H - 1)) | 0; for (let x = 0; x < W; x++) { const q = (y * W + x) * 4; b[q] = 22; b[q + 1] = 38; b[q + 2] = 54; } }
  for (let s = 1; s < 3; s++) { const x = (s * secW) | 0; for (let y = 0; y < H; y++) { const q = (y * W + x) * 4; b[q] = 30; b[q + 1] = 46; b[q + 2] = 66; } }
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    const p = (y * OW + x) * 4, col = (x / OW) * (secW - 1);
    for (let ch = 0; ch < 3; ch++) {
      const val = data[p + ch]!;
      const sx = (ch * secW + col) | 0, sy = ((1 - val / 255) * (H - 1)) | 0;
      const q = (sy * W + sx) * 4;
      b[q + ch] = Math.min(255, (b[q + ch] ?? 0) + 100);      // tint each panel by its channel
      b[q + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

/** Vectorscope: each pixel's Cb/Cr plotted on the colour wheel. */
function vector(cv: HTMLCanvasElement, data: Uint8ClampedArray): void {
  const [W, H] = fit(cv); const g = cv.getContext('2d'); if (!g) return;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 2;
  const img = g.createImageData(W, H), b = img.data; bg(b);
  for (let a = 0; a < 360; a += 2) { const r = a * Math.PI / 180, x = (cx + Math.cos(r) * R) | 0, y = (cy + Math.sin(r) * R) | 0; if (x >= 0 && x < W && y >= 0 && y < H) { const q = (y * W + x) * 4; b[q] = 26; b[q + 1] = 44; b[q + 2] = 62; } }
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    const p = (y * OW + x) * 4, rr = data[p]!, gg = data[p + 1]!, bb = data[p + 2]!;
    const cb = -0.169 * rr - 0.331 * gg + 0.5 * bb, cr = 0.5 * rr - 0.419 * gg - 0.081 * bb;
    const px = (cx + (cb / 128) * R) | 0, py = (cy - (cr / 128) * R) | 0;
    if (px >= 0 && px < W && py >= 0 && py < H) { const q = (py * W + px) * 4; b[q] = Math.min(255, (b[q] ?? 0) + 40); b[q + 1] = Math.min(255, (b[q + 1] ?? 0) + 82); b[q + 2] = Math.min(255, (b[q + 2] ?? 0) + 40); }
  }
  g.putImageData(img, 0, 0);
}

/** Repaint both scopes from the current subject picture. */
export function drawLiveScopes(subject: HTMLCanvasElement, wf: HTMLCanvasElement, vec: HTMLCanvasElement): void {
  const data = sample(subject); if (!data) return;
  parade(wf, data); vector(vec, data);
}
