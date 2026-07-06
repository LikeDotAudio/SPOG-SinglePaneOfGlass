// EBU Tech 3219 colour bars — seven 75%-amplitude vertical bars.
import type { TsgPattern } from '../types.js';

const BARS = ['#FFFFFF', '#BFBF00', '#00BFBF', '#00BF00', '#BF00BF', '#BF0000', '#0000BF'];

const pattern: TsgPattern = {
  id: 'ebubars', label: 'EBU BARS', name: 'EBU Colour Bars', group: 'SDR', order: 2,
  title: 'EBU Tech 3219: Colour Bar Pattern. Evaluates color accuracy, 75% amplitude saturation limits, and checks for broadcast signal phase errors.',
  href: 'https://tech.ebu.ch/docs/tech/tech3219.pdf',
  draw(g, W, H) {
    const bw = W / BARS.length;
    BARS.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * bw, 0, bw + 1, H); });
  },
};
export default pattern;
