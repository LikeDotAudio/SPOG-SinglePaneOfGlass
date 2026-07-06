// ITU-R BT.2111 (HLG) — the Hybrid Log-Gamma HDR colour-bar pattern (darker grey
// rails + a white base row, for SDR-compatible rendering checks).
import type { TsgPattern } from '../types.js';
import { drawBt2111 } from './bt2111pq.js';

const pattern: TsgPattern = {
  id: 'bt2111hlg', label: 'BT.2111 HLG', name: 'BT.2111 HLG', group: 'HDR', order: 14,
  title: 'ITU-R BT.2111 (HLG): Standardized Rec. 2100 test pattern for verifying Hybrid Log-Gamma HDR broadcasting and backwards compatibility rendering.',
  href: 'https://www.itu.int/rec/R-REC-BT.2111/en',
  draw: (g, W, H) => drawBt2111(g, W, H, 'rgb(77,77,77)', '#ffffff'),
};
export default pattern;
