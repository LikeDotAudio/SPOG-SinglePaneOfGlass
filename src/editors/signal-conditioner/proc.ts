// src/editors/signal-conditioner/proc — the proc-amp colour maths shared by the
// preview + RGB overlay scope: the 75% SMPTE bars, applyProc (matches the CSS
// brightness → contrast → saturate → hue-rotate order), and the overlay draw.
// Split out of index.ts verbatim (no behaviour change).

import type { CondState } from './index.js';

// The seven 75% SMPTE bars as linear 0..1 RGB (matches the CSS gradient).
export const BARS: Array<[number, number, number]> = [
  [.75, .75, .75], [.75, .75, 0], [0, .75, .75], [0, .75, 0], [.75, 0, .75], [.75, 0, 0], [0, 0, .75],
];

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// Apply the proc-amp to an RGB triple in the SAME order as the CSS filter
// (brightness → contrast → saturate → hue-rotate) so the overlay tracks the bars.
export function applyProc(s: CondState, r: number, g: number, b: number): [number, number, number] {
  if (s.bypass) return [r, g, b];
  const bright = (s.gain / 100) + (s.black / 400);
  const contrast = 1 - (s.black / 200);
  let R = r * bright, G = g * bright, B = b * bright;
  R = (R - .5) * contrast + .5; G = (G - .5) * contrast + .5; B = (B - .5) * contrast + .5;
  const sat = s.sat / 100, y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  R = y + (R - y) * sat; G = y + (G - y) * sat; B = y + (B - y) * sat;
  const a = s.hue * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  const m = [
    0.213 + c * 0.787 - sn * 0.213, 0.715 - c * 0.715 - sn * 0.715, 0.072 - c * 0.072 + sn * 0.928,
    0.213 - c * 0.213 + sn * 0.143, 0.715 + c * 0.285 + sn * 0.140, 0.072 - c * 0.072 - sn * 0.283,
    0.213 - c * 0.213 - sn * 0.787, 0.715 - c * 0.715 + sn * 0.715, 0.072 + c * 0.928 + sn * 0.072,
  ];
  return [
    clamp01(R * m[0]! + G * m[1]! + B * m[2]!),
    clamp01(R * m[3]! + G * m[4]! + B * m[5]!),
    clamp01(R * m[6]! + G * m[7]! + B * m[8]!),
  ];
}

// Draw the RGB overlay waveform (per-bar R/G/B levels) over the bars.
export function drawOverlay(scope: HTMLCanvasElement, s: CondState): void {
  const dpr = window.devicePixelRatio || 1;
  const w = scope.clientWidth, h = scope.clientHeight;
  if (!w || !h) return;
  scope.width = Math.round(w * dpr); scope.height = Math.round(h * dpr);
  const g = scope.getContext('2d'); if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  // graticule at 0 / 50 / 100 IRE
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1;
  [0, .5, 1].forEach((lvl) => { const y = Math.round(h - lvl * h) + .5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
  const bw = w / BARS.length;
  g.globalCompositeOperation = 'lighter'; g.lineWidth = 2.5; g.lineCap = 'round';
  const plot = (x0: number, x1: number, lvl: number, color: string): void => {
    const y = h - lvl * h; g.strokeStyle = color; g.beginPath(); g.moveTo(x0 + 3, y); g.lineTo(x1 - 3, y); g.stroke();
  };
  BARS.forEach((base, i) => {
    const [R, G, B] = applyProc(s, base[0], base[1], base[2]);
    const x0 = i * bw, x1 = (i + 1) * bw;
    plot(x0, x1, R, 'rgba(255,64,64,.95)');
    plot(x0, x1, G, 'rgba(64,255,96,.95)');
    plot(x0, x1, B, 'rgba(96,140,255,.98)');
  });
  g.globalCompositeOperation = 'source-over';
}
