// SMPTE RP 219 compatible geometry test card — grey field, centring circle and a
// central checkerboard for resolution/overscan checks.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'testcard', label: 'TEST CARD (RP 219)', name: 'Test Card', group: 'SDR', order: 1,
  title: 'SMPTE RP 219: High-Definition, Standard-Definition Compatible Test Pattern. Verifies image geometry, resolution, aspect ratio alignment, and overscan.',
  href: 'https://ieeexplore.ieee.org/document/7291754',
  draw(g, W, H) {
    g.fillStyle = '#444'; g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, s = 20 * (Math.min(W, H) / 600);
    // central checkerboard band (≈ 200..600 of the 800×600 authoring box)
    const bx = W * 0.25, by = H * 0.417, bw = W * 0.5, bh = H * 0.166;
    for (let y = by; y < by + bh; y += s) for (let x = bx; x < bx + bw; x += s) {
      const odd = (Math.round((x - bx) / s) + Math.round((y - by) / s)) & 1;
      g.fillStyle = odd ? '#000' : '#fff'; g.fillRect(x, y, s, s);
    }
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, Math.min(W, H) * 0.007);
    g.beginPath(); g.arc(cx, cy, Math.min(W, H) * 0.46, 0, 2 * Math.PI); g.stroke();
  },
};
export default pattern;
