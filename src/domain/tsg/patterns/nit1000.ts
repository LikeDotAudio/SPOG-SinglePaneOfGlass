// VESA DisplayHDR 1000-nit window — a centred 10%-area white patch on black, so the
// panel's Auto Brightness Limiter doesn't dim the peak-luminance measurement.
import type { TsgPattern } from '../types.js';

const pattern: TsgPattern = {
  id: 'nit1000', label: '1000-NIT WINDOW', name: '1000-Nit Window', group: 'HDR', order: 17,
  title: 'VESA DisplayHDR / 1000-Nit Window: Measures absolute peak luminance output. A 10% window size prevents the display\'s Auto Brightness Limiter (ABL) from incorrectly dimming the test patch.',
  href: 'https://displayhdr.org/',
  draw(g, W, H) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const ww = W * 0.316, wh = H * 0.316;   // √10% ≈ 31.6% per side = 10% area
    g.fillStyle = '#ffffff'; g.fillRect((W - ww) / 2, (H - wh) / 2, ww, wh);
  },
};
export default pattern;
