// SMPTE ST 2084 (PQ) discrete grey steps — ten digital levels to find exactly where
// shadow / highlight detail is clipped by the display's tone-mapping.
import type { TsgPattern } from '../types.js';

const STEPS = [0, 5, 10, 20, 35, 55, 80, 110, 160, 255];

const pattern: TsgPattern = {
  id: 'pqsteps', label: 'PQ GREY STEPS', name: 'PQ Grey Steps', group: 'HDR', order: 16,
  title: 'SMPTE ST 2084 (PQ) Steps: Tracks discrete digital levels to identify exactly where the display\'s tone-mapping algorithm clips shadow or highlight detail.',
  href: 'https://ieeexplore.ieee.org/document/7291452',
  draw(g, W, H) {
    const bw = W / STEPS.length;
    STEPS.forEach((v, i) => { g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * bw, 0, bw + 1, H); });
  },
};
export default pattern;
