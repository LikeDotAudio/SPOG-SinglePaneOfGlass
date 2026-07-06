// 100% solid green — panel uniformity / dead-pixel field for the green subpixel.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'green', label: 'GREEN 100%', name: 'Green 100%', group: 'SDR', order: 8,
  title: '100% Solid Green: Checks panel uniformity, backlight bleed, and identifies stuck or dead pixels.',
  href: 'https://en.wikipedia.org/wiki/Defective_pixel',
  draw(g, W, H) { g.fillStyle = '#00ff00'; g.fillRect(0, 0, W, H); },
};
export default pattern;
