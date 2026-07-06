// 100% solid red — panel uniformity / dead-pixel field for the red subpixel.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'red', label: 'RED 100%', name: 'Red 100%', group: 'SDR', order: 7,
  title: '100% Solid Red: Checks panel uniformity, backlight bleed, and identifies stuck or dead pixels.',
  href: 'https://en.wikipedia.org/wiki/Defective_pixel',
  draw(g, W, H) { g.fillStyle = '#ff0000'; g.fillRect(0, 0, W, H); },
};
export default pattern;
