// src/editors/meter-input/scopes-gamut — colour-scatter GAMUT painters. Split from
// scopes-video.ts: the CIE 1931 chromaticity chart, the RGB diamond, the HSL
// lightness/saturation triangle and the vectorscope — all plot the flat `pts`
// scatter (not the per-column histograms). Re-exported through live-input.ts.
import { ctx2d, fade, applyView, resetView, IDENTITY_VIEW, type View } from './scopes-video.js';

// CIE 1931 xy chromaticity gamut. Each sampled pixel's RGB is linearised (sRGB
// decode), converted to XYZ (sRGB/D65 matrix), normalised to xy, and plotted
// (coloured by the pixel) over the spectral-locus "horseshoe" + the Rec.709/sRGB
// primary triangle + the D65 white point. Additive, with persistence + pan/zoom.
const CIE_LOCUS: ReadonlyArray<readonly [number, number]> = [
  [0.1733, 0.0048], [0.1644, 0.0109], [0.1440, 0.0297], [0.1241, 0.0578], [0.0913, 0.1327],
  [0.0454, 0.2950], [0.0082, 0.5384], [0.0139, 0.7502], [0.0743, 0.8338], [0.1547, 0.8059],
  [0.2296, 0.7543], [0.3016, 0.6923], [0.3731, 0.6245], [0.4441, 0.5547], [0.5125, 0.4866],
  [0.5752, 0.4242], [0.6270, 0.3725], [0.6658, 0.3340], [0.6915, 0.3083], [0.7079, 0.2920],
  [0.7245, 0.2755], [0.7347, 0.2653],
];
const REC709 = { r: [0.640, 0.330] as const, g: [0.300, 0.600] as const, b: [0.150, 0.060] as const, w: [0.3127, 0.3290] as const };
const srgb2lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export function drawCIE(cv: HTMLCanvasElement, pts: number[], view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height;
  resetView(c); fade(c, W, H, 0.16); applyView(c, view);
  const pad = 18, XMAX = 0.75, YMAX = 0.85;
  const px = (x: number): number => pad + (x / XMAX) * (W - 2 * pad);
  const py = (y: number): number => H - pad - (y / YMAX) * (H - 2 * pad);
  c.strokeStyle = 'rgba(80,110,150,.13)'; c.lineWidth = 1;
  for (let g = 0.1; g <= 0.7; g += 0.1) { c.beginPath(); c.moveTo(px(g), py(0)); c.lineTo(px(g), py(YMAX)); c.stroke(); }
  for (let g = 0.1; g <= 0.8; g += 0.1) { c.beginPath(); c.moveTo(px(0), py(g)); c.lineTo(px(XMAX), py(g)); c.stroke(); }
  c.strokeStyle = 'rgba(200,220,255,.55)'; c.lineWidth = 1.3; c.beginPath();
  CIE_LOCUS.forEach(([x, y], i) => { i ? c.lineTo(px(x), py(y)) : c.moveTo(px(x), py(y)); });
  c.closePath(); c.stroke();   // closePath = the "line of purples"
  c.strokeStyle = 'rgba(180,180,190,.4)'; c.beginPath();
  c.moveTo(px(REC709.r[0]), py(REC709.r[1])); c.lineTo(px(REC709.g[0]), py(REC709.g[1])); c.lineTo(px(REC709.b[0]), py(REC709.b[1])); c.closePath(); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(px(REC709.w[0]), py(REC709.w[1]), 2, 0, 7); c.fill();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < pts.length; i += 5) {
    const R = pts[i + 2] ?? 0, G = pts[i + 3] ?? 0, B = pts[i + 4] ?? 0;
    const lr = srgb2lin(R / 255), lg = srgb2lin(G / 255), lb = srgb2lin(B / 255);
    const X = 0.4124 * lr + 0.3576 * lg + 0.1805 * lb, Y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb, Z = 0.0193 * lr + 0.1192 * lg + 0.9505 * lb;
    const sum = X + Y + Z; if (sum < 1e-6) continue;
    c.fillStyle = `rgba(${R | 0},${G | 0},${B | 0},0.5)`;
    c.fillRect(px(X / sum), py(Y / sum), 1, 1);
  }
  c.globalCompositeOperation = 'source-over';
  resetView(c);
}

// RGB Diamond gamut scope (Tektronix-style): two stacked diamonds. Upper plots
// G↔R, lower plots G↔B; the vertical centre line is luminance (black centre →
// white at the outer tips). Trace bleeding past the dashed limit = out-of-gamut.
export function drawDiamond(cv: HTMLCanvasElement, pts: number[], view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height, cx = W / 2, mid = H / 2;
  resetView(c); fade(c, W, H, 0.20); applyView(c, view);
  const top = 14, bot = H - 14, hw = Math.min(W * 0.36, H / 2 - 14), uh = mid - top, lh = bot - mid;
  const dia = (ty: number, my: number, by: number, halfW: number, dash: boolean): void => {
    c.setLineDash(dash ? [5, 4] : []);
    c.beginPath(); c.moveTo(cx, ty); c.lineTo(cx + halfW, my); c.lineTo(cx, by); c.lineTo(cx - halfW, my); c.closePath(); c.stroke();
    c.setLineDash([]);
  };
  c.lineWidth = 1;
  c.strokeStyle = 'rgba(150,170,200,.45)'; dia(top, (top + mid) / 2, mid, hw, false); dia(mid, (mid + bot) / 2, bot, hw, false);
  c.strokeStyle = 'rgba(150,170,200,.28)'; dia(top - 4, (top + mid) / 2, mid, hw + 5, true); dia(mid, (mid + bot) / 2, bot + 4, hw + 5, true);
  c.fillStyle = 'rgba(170,190,215,.85)'; c.font = '9px Arial';
  c.textAlign = 'right'; c.fillText('G', cx - hw - 4, (top + mid) / 2 + 3); c.fillText('G', cx - hw - 4, (mid + bot) / 2 + 3);
  c.textAlign = 'left'; c.fillText('R', cx + hw + 4, (top + mid) / 2 + 3); c.fillText('B', cx + hw + 4, (mid + bot) / 2 + 3);
  c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(215,235,255,.45)';
  for (let i = 0; i < pts.length; i += 5) {
    const r = (pts[i + 2] ?? 0) / 255, g = (pts[i + 3] ?? 0) / 255, b = (pts[i + 4] ?? 0) / 255;
    c.fillRect(cx + (r - g) * hw, mid - ((r + g) / 2) * uh, 1, 1);   // upper: G↔R, luma up
    c.fillRect(cx + (b - g) * hw, mid + ((b + g) / 2) * lh, 1, 1);   // lower: G↔B, luma down
  }
  c.globalCompositeOperation = 'source-over'; resetView(c);
}

// Lightness / Saturation triangle (HSL): x = Lightness (0 black → 1 white), y =
// chroma (max−min). Black & white can't hold chroma, so the valid region tapers
// to the base corners and peaks at the apex — a triangle.
export function drawHSL(cv: HTMLCanvasElement, pts: number[], view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height;
  resetView(c); fade(c, W, H, 0.20); applyView(c, view);
  const padX = 30, padTop = 14, padBot = 22;
  const BLx = padX, BRx = W - padX, apexX = W / 2, baseY = H - padBot, apexY = padTop;
  const bx = (l: number): number => padX + l * (W - 2 * padX);
  const by = (chr: number): number => baseY - chr * (baseY - apexY);
  c.lineWidth = 1; c.font = '8px Arial';
  c.setLineDash([5, 4]); c.strokeStyle = 'rgba(160,170,190,.5)';
  c.beginPath(); c.moveTo(BLx, baseY); c.lineTo(apexX, apexY); c.lineTo(BRx, baseY); c.closePath(); c.stroke();
  for (const t of [0.25, 0.5, 0.75]) {
    const y = by(t), xl = BLx + t * (apexX - BLx), xr = BRx - t * (BRx - apexX);
    c.beginPath(); c.moveTo(xl, y); c.lineTo(xr, y); c.stroke();
    c.setLineDash([]); c.fillStyle = 'rgba(180,190,210,.8)';
    c.textAlign = 'right'; c.fillText(`${t * 100}% Val`, xl - 3, y + 3);
    c.textAlign = 'left'; c.fillText(`${t * 100}% Sat`, xr + 3, y + 3);
    c.setLineDash([5, 4]);
  }
  c.setLineDash([]); c.textAlign = 'center'; c.fillStyle = 'rgba(180,190,210,.85)'; c.fillText('Lightness', W / 2, H - 5);
  c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(220,235,255,.5)';
  for (let i = 0; i < pts.length; i += 5) {
    const r = (pts[i + 2] ?? 0) / 255, g = (pts[i + 3] ?? 0) / 255, b = (pts[i + 4] ?? 0) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    c.fillRect(bx((mx + mn) / 2), by(mx - mn), 1, 1);
  }
  c.globalCompositeOperation = 'source-over'; resetView(c);
}

export function drawVectorReal(cv: HTMLCanvasElement, pts: number[], view: View = IDENTITY_VIEW): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 6;
  if (R < 4) return;   // hidden / collapsed card
  resetView(c); fade(c, W, H, 0.18); applyView(c, view);
  c.strokeStyle = '#0e2436'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
  c.strokeStyle = '#24401f'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + R * Math.cos(-2.15), cy + R * Math.sin(-2.15)); c.stroke();
  const sc = R / 140;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < pts.length; i += 5) {
    c.fillStyle = `rgba(${(pts[i + 2] ?? 0) | 0},${(pts[i + 3] ?? 0) | 0},${(pts[i + 4] ?? 0) | 0},0.5)`;
    c.fillRect(cx + (pts[i] ?? 0) * sc, cy - (pts[i + 1] ?? 0) * sc, 1, 1);
  }
  c.globalCompositeOperation = 'source-over';
  resetView(c);
}
