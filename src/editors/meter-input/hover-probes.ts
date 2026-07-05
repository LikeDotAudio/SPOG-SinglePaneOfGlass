// src/editors/meter-input/hover-probes — the per-scope hover READ functions.
// Split from index.ts: each probe maps DATA-space backing coords to that scope's
// own axis units and, where available, the measured value (density counts from
// the latest analyzed frame). Attaches them all to the shared hover layer.
import type { HoverLayer, ProbeResult } from './hover.js';
import type { FrameData } from './live-input.js';

type ScopeView = { z: number; px: number; py: number };
export interface ProbeCanvases {
  parade: HTMLCanvasElement; wave: HTMLCanvasElement; chroma: HTMLCanvasElement; vec: HTMLCanvasElement;
  aud: HTMLCanvasElement; meter: HTMLCanvasElement; vu: HTMLCanvasElement; gonio: HTMLCanvasElement;
  rec: HTMLCanvasElement; rgba: HTMLCanvasElement; stack: HTMLCanvasElement; cie: HTMLCanvasElement;
  diamond: HTMLCanvasElement; hsl: HTMLCanvasElement; loud: HTMLCanvasElement;
}
export interface ProbeViews {
  parade: ScopeView; wave: ScopeView; chroma: ScopeView; vec: ScopeView; gonio: ScopeView;
  rgba: ScopeView; stack: ScopeView; cie: ScopeView; diamond: ScopeView; hsl: ScopeView;
}

// `getFrame` yields the latest analyzed frame — for hover density readouts.
export function attachProbes(hover: HoverLayer, cv: ProbeCanvases, views: ProbeViews, getFrame: () => FrameData | null): void {
  const IRE_LO = -10, IRE_HI = 110;
  const ireFromY = (y: number, H: number): number => IRE_LO + ((H - 1 - y) / (H - 2)) * (IRE_HI - IRE_LO);
  const cl = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
  // Pixel count in a per-column histogram at a given column-fraction + value (0..100).
  const densAt = (hist: Uint32Array | undefined, colFrac: number, val0to100: number): number => {
    const lastFrame = getFrame();
    if (!hist || !lastFrame) return 0;
    const { AW, BINS } = lastFrame;
    const col = cl(Math.floor(colFrac * AW), 0, AW - 1);
    const bin = cl(Math.round((val0to100 / 100) * (BINS - 1)), 0, BINS - 1);
    return hist[col * BINS + bin] ?? 0;
  };
  const pctS = (f: number): string => `${(f * 100).toFixed(0)}%`;
  const waveCh = (hist: () => Uint32Array | undefined, label: string, unit: string) =>
    (dx: number, dy: number, W: number, H: number): ProbeResult => {
      const col = cl(dx / W, 0, 1), v = cl(ireFromY(dy, H), 0, 100);
      return { pos: `${label} · col ${pctS(col)} · ${v.toFixed(0)} ${unit}`, val: `n=${densAt(hist(), col, v)}` };
    };

  hover.attach(cv.parade, { view: views.parade, read: (dx, dy, W, H) => {
    const pw = W / 3, p = cl(Math.floor(dx / pw), 0, 2);
    const within = cl((dx - p * pw) / pw, 0, 1), v = cl(ireFromY(dy, H), 0, 100);
    const f = getFrame();
    const ch = ['R', 'G', 'B'][p], hist = [f?.rH, f?.gH, f?.bH][p];
    return { pos: `${ch} · col ${pctS(within)} · ${v.toFixed(0)} IRE`, val: `n=${densAt(hist, within, v)}` };
  } });
  hover.attach(cv.wave, { view: views.wave, read: waveCh(() => getFrame()?.yH, "Y'", 'IRE') });
  hover.attach(cv.chroma, { view: views.chroma, read: (dx, dy, W, H) => {
    const col = cl(dx / W, 0, 1), s = cl(ireFromY(dy, H), 0, 100);
    return { pos: `col ${pctS(col)} · ${s.toFixed(0)}% sat`, val: `n=${densAt(getFrame()?.cH, col, s)}` };
  } });
  hover.attach(cv.rgba, { view: views.rgba, read: (dx, dy, W, H) => {
    const col = cl(dx / W, 0, 1), v = cl(ireFromY(dy, H), 0, 100);
    const f = getFrame();
    return { pos: `col ${pctS(col)} · ${v.toFixed(0)} IRE`, val: `R${densAt(f?.rH, col, v)} G${densAt(f?.gH, col, v)} B${densAt(f?.bH, col, v)}` };
  } });
  hover.attach(cv.stack, { view: views.stack, read: (dx, dy, W, H) => {
    const lh = H / 3, p = cl(Math.floor(dy / lh), 0, 2), bot = (p + 1) * lh;
    const v = cl(IRE_LO + ((bot - 1 - dy) / (lh - 2)) * (IRE_HI - IRE_LO), 0, 100), col = cl(dx / W, 0, 1);
    const f = getFrame();
    const ch = ['R', 'G', 'B'][p], hist = [f?.rH, f?.gH, f?.bH][p];
    return { pos: `${ch} · col ${pctS(col)} · ${v.toFixed(0)} IRE`, val: `n=${densAt(hist, col, v)}` };
  } });
  hover.attach(cv.vec, { view: views.vec, read: (dx, dy, W, H) => {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 6, ex = dx - cx, ey = dy - cy;
    let ang = Math.atan2(-ey, ex) * 180 / Math.PI; if (ang < 0) ang += 360;
    return { pos: `hue ${ang.toFixed(0)}° · sat ${cl(Math.hypot(ex, ey) / R * 100, 0, 999).toFixed(0)}%` };
  } });
  hover.attach(cv.gonio, { view: views.gonio, read: (dx, dy, W, H) => {
    const cx = W / 2, cy = H / 2, k = (Math.min(W, H) / 2 - 8) / Math.SQRT2;
    const s = (dx - cx) / k, m = (cy - dy) / k;   // s = L−R (width), m = L+R (mono sum)
    return { pos: `L ${cl((m + s) / 2, -1, 1).toFixed(2)} · R ${cl((m - s) / 2, -1, 1).toFixed(2)}`, val: `width ${s.toFixed(2)}` };
  } });
  hover.attach(cv.cie, { view: views.cie, read: (dx, dy, W, H) => {
    const pad = 18, x = (dx - pad) / (W - 2 * pad) * 0.75, y = (H - pad - dy) / (H - 2 * pad) * 0.85;
    return { pos: `x ${x.toFixed(3)} · y ${y.toFixed(3)}`, val: 'CIE xy' };
  } });
  hover.attach(cv.diamond, { view: views.diamond, read: (dx, dy, W, H) => {
    const cx = W / 2, mid = H / 2, hw = Math.min(W * 0.36, H / 2 - 14);
    if (dy < mid) return { pos: `R−G ${cl((dx - cx) / hw, -1, 1).toFixed(2)} · Y ${cl((mid - dy) / (mid - 14), 0, 1).toFixed(2)}`, val: 'upper' };
    return { pos: `B−G ${cl((dx - cx) / hw, -1, 1).toFixed(2)} · Y ${cl((dy - mid) / (H - 14 - mid), 0, 1).toFixed(2)}`, val: 'lower' };
  } });
  hover.attach(cv.hsl, { view: views.hsl, read: (dx, dy, W, H) => {
    const padX = 30, baseY = H - 22, apexY = 14;
    return { pos: `L ${cl((dx - padX) / (W - 2 * padX), 0, 1).toFixed(2)} · Sat ${cl((baseY - dy) / (baseY - apexY), 0, 1).toFixed(2)}` };
  } });
  hover.attach(cv.aud, { read: (dx, dy, W, H) => {
    const lh = H / 3, p = cl(Math.floor(dy / lh), 0, 2), mid = p * lh + lh / 2;
    const amp = cl((mid - dy) / ((lh / 2) * 0.82), -1, 1), lane = ['L', 'R', 'L+R'][p];
    return { pos: `${lane} · t ${pctS(dx / W)} · amp ${amp.toFixed(2)}` };
  } });
  hover.attach(cv.rec, { read: (dx, dy, W, H) => {
    const db = -60 + ((H - dy) / H) * 60, t = cl((dx - 22) / (W - 22), 0, 1);
    return { pos: `t ${pctS(t)} · ${db.toFixed(1)} dBFS` };
  } });
  hover.attach(cv.meter, { read: (dx, dy, W, H) => {
    const lane = dx < W / 2 ? 'L' : 'R', db = cl(1 - (dy - 8) / (H - 30), 0, 1) * 60 - 60;
    return { pos: `${lane} · ${db.toFixed(1)} dBFS` };
  } });
  hover.attach(cv.vu, { read: (dx, dy, W, H) => {
    const w = W / 2, i = dx < w ? 0 : 1, cx = i * w + w / 2, cy = H * 0.9;
    const A0 = -Math.PI / 2 - 0.92, A1 = -Math.PI / 2 + 0.92;
    const vu = cl(-20 + ((Math.atan2(dy - cy, dx - cx) - A0) / (A1 - A0)) * 23, -20, 3);
    return { pos: `${i ? 'R' : 'L'} ≈ ${vu.toFixed(0)} VU` };
  } });
  hover.attach(cv.loud, { read: (dx, dy, W, H) => {
    const lo = -40, hi = -8, lufs = lo + ((H - dy) / H) * (hi - lo), t = cl((dx - 20) / (W - 20), 0, 1);
    return { pos: `t ${pctS(t)} · ${lufs.toFixed(1)} LUFS` };
  } });
}
