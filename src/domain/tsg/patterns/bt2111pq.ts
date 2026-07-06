// ITU-R BT.2111 (PQ) — the Rec. 2100 HDR colour-bar pattern. Wide-gamut (Rec.2020)
// primaries are approximated in sRGB here (front-end simulation).
import type { TsgPattern } from '../types.js';

// 7 primaries (white, yellow, cyan, green, magenta, red, blue), sRGB-approximated.
const PRIMARIES = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff'];

/** Paint the BT.2111 bar layout: grey side rails + 7 primaries over a solid base row. */
export function drawBt2111(g: CanvasRenderingContext2D, W: number, H: number, side: string, base: string): void {
  const topH = H * (2 / 3);
  const unit = W / 16;              // 1 (grey) + 7×2 (primaries) + 1 (grey)
  g.fillStyle = side; g.fillRect(0, 0, unit, topH); g.fillRect(W - unit, 0, unit, topH);
  PRIMARIES.forEach((c, i) => { g.fillStyle = c; g.fillRect(unit + i * unit * 2, 0, unit * 2 + 1, topH); });
  g.fillStyle = base; g.fillRect(0, topH, W, H - topH);
}

const pattern: TsgPattern = {
  id: 'bt2111pq', label: 'BT.2111 PQ', name: 'BT.2111 PQ', group: 'HDR', order: 13,
  title: 'ITU-R BT.2111 (PQ): Standardized Rec. 2100 test pattern for verifying Perceptual Quantizer (SMPTE ST 2084) HDR signal transmission and rendering limits.',
  href: 'https://www.itu.int/rec/R-REC-BT.2111/en',
  draw: (g, W, H) => drawBt2111(g, W, H, 'rgb(102,102,102)', '#000000'),
};
export default pattern;
