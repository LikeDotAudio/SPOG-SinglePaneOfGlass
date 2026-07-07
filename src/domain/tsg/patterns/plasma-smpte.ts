// Dynamic noise / plasma — SMPTE colour-bar palette. Seven drifting radial washes,
// one per 75% colour bar, additively blended for a lively burn-in / motion-smear
// exerciser that stays inside the broadcast bar gamut.
import type { TsgPattern } from '../types.js';

// The seven EBU/SMPTE 75% bars: white, yellow, cyan, green, magenta, red, blue.
const BARS = ['191,191,191', '191,191,0', '0,191,191', '0,191,0', '191,0,191', '191,0,0', '0,0,191'];

const pattern: TsgPattern = {
  id: 'plasma-smpte', label: 'PLASMA SMPTE', name: 'Plasma · SMPTE', group: 'SDR', order: 10.5,
  title: 'Dynamic Noise Pattern (SMPTE palette): drifting colour-bar washes exercise adjacent pixels to test motion smearing and mitigate temporary image retention (burn-in), staying within the 75% broadcast bar gamut.',
  href: 'https://en.wikipedia.org/wiki/Image_persistence',
  draw(g, W, H, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const s = t / 2600, r = Math.max(W, H) * 0.42;
    g.globalCompositeOperation = 'lighter';
    BARS.forEach((rgb, i) => {
      const a = s + (i / BARS.length) * Math.PI * 2;   // spread the blobs around a slow orbit
      const cx = W * (0.5 + 0.34 * Math.cos(a * 1.1 + i)), cy = H * (0.5 + 0.34 * Math.sin(a + i * 0.7));
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${rgb},0.85)`); grad.addColorStop(0.5, `rgba(${rgb},0)`);
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
    });
    g.globalCompositeOperation = 'source-over';
  },
};
export default pattern;
