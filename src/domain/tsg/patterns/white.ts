// 100% solid white — panel uniformity / backlight-bleed / dead-pixel field.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'white', label: 'WHITE 100%', name: 'White 100%', group: 'SDR', order: 6,
  title: '100% Solid White: Checks panel uniformity, backlight bleed, and identifies stuck or dead pixels.',
  href: 'https://en.wikipedia.org/wiki/Defective_pixel',
  draw(g, W, H) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); },
};
export default pattern;
