// 100% solid blue — panel uniformity / dead-pixel field for the blue subpixel.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'blue', label: 'BLUE 100%', name: 'Blue 100%', group: 'SDR', order: 9,
  title: '100% Solid Blue: Checks panel uniformity, backlight bleed, and identifies stuck or dead pixels.',
  href: 'https://en.wikipedia.org/wiki/Defective_pixel',
  draw(g, W, H) { g.fillStyle = '#0000ff'; g.fillRect(0, 0, W, H); },
};
export default pattern;
