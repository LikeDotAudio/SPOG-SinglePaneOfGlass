// SMPTE ST 2046-1 safe-area alignment grid — 40px lattice, centre cross + circle.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'alignment', label: 'ALIGNMENT GRID', name: 'Alignment Grid', group: 'SDR', order: 3,
  title: 'SMPTE ST 2046-1: Safe Action and Safe Title Areas. Ensures critical visual content and text are within safe boundaries to avoid clipping on varying displays.',
  href: 'https://ieeexplore.ieee.org/document/7290740',
  draw(g, W, H) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const step = Math.max(24, Math.min(W, H) / 18);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y <= H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, Math.min(W, H) * 0.2, 0, 2 * Math.PI); g.stroke();
  },
};
export default pattern;
