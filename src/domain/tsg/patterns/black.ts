// 100% solid black — panel uniformity / backlight-bleed / dead-pixel field.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'black', label: 'BLACK 100%', name: 'Black 100%', group: 'SDR', order: 5,
  title: '100% Solid Black: Checks panel uniformity, backlight bleed, and identifies stuck or dead pixels.',
  href: 'https://en.wikipedia.org/wiki/Defective_pixel',
  draw(g, W, H) { g.fillStyle = '#000000'; g.fillRect(0, 0, W, H); },
};
export default pattern;
