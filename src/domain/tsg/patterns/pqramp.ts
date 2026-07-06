// SMPTE ST 2084 (PQ) luminance ramp — the non-linear PQ curve, weighted toward the
// shadows so near-black tone-mapping is easy to read.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'pqramp', label: 'PQ RAMP', name: 'PQ Ramp', group: 'HDR', order: 15,
  title: 'SMPTE ST 2084 (PQ) Ramp: Evaluates the display\'s ability to smoothly map non-linear luminance across extreme dynamic ranges without clipping near-black or near-white.',
  href: 'https://ieeexplore.ieee.org/document/7291452',
  draw(g, W, H) {
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgb(0,0,0)'); grad.addColorStop(0.2, 'rgb(10,10,10)');
    grad.addColorStop(0.5, 'rgb(50,50,50)'); grad.addColorStop(1, 'rgb(255,255,255)');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
  },
};
export default pattern;
