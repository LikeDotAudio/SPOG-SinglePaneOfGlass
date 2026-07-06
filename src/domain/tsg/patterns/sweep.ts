// Hue spectrum sweep — a continuous gamut ramp across the visible hues.
import type { TsgPattern } from '../types.js';

const HUES = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'];

/** Paint the full-width hue sweep (shared with the grid variant). */
export function sweepFill(g: CanvasRenderingContext2D, W: number, H: number): void {
  const grad = g.createLinearGradient(0, 0, W, 0);
  HUES.forEach((c, i) => grad.addColorStop(i / (HUES.length - 1), c));
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
}

const pattern: TsgPattern = {
  id: 'sweep', label: 'COLOUR SWEEP', name: 'Colour Sweep', group: 'SDR', order: 11,
  title: 'Hue Spectrum Sweep: Checks transitions across the entire gamut for clipping or harsh steps in the display\'s color volume.',
  href: 'https://en.wikipedia.org/wiki/Color_gamut',
  draw: (g, W, H) => sweepFill(g, W, H),
};
export default pattern;
