// Colour sweep with a static alignment grid — dynamic colour over fixed geometry.
import type { TsgPattern } from '../types.js';
import { sweepFill } from './sweep.js';

const pattern: TsgPattern = {
  id: 'sweepgrid', label: 'COLOUR SWEEP + GRID', name: 'Colour Sweep + Grid', group: 'SDR', order: 12,
  title: 'Colour Sweep with Alignment Grid: Simultaneously tests dynamic color rendering against static geometric stability.',
  href: 'https://en.wikipedia.org/wiki/Display_resolution',
  draw(g, W, H) {
    sweepFill(g, W, H);
    const step = Math.max(24, Math.min(W, H) / 18);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y <= H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
  },
};
export default pattern;
