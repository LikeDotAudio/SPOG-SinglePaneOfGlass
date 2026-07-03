// src/editors/chronos/displays/sevenseg — the digital LED read-out (the classic
// timer rack-panel look). HH:MM:SS in authentic seven-segment digits (lit + ghost
// segments) or a bold Arial fallback, red or white on black — driven by the card's
// global FONT + COLOUR controls. A finished down count blinks its separators.

import { drawSegString } from '../../../ui/seven-seg.js';
import { fmt, type DisplayDef, type DisplayCtx } from '../shared.js';

function draw(g: CanvasRenderingContext2D, W: number, H: number, c: DisplayCtx): void {
  // A landed egg timer (down count at zero, stopped) blinks the colons ~2 Hz.
  const blink = c.kind === 'down' && c.ms <= 0 && !c.running;
  const sep = blink && Math.floor(c.now / 250) % 2 === 0 ? [false, false] : undefined;
  drawSegString(g, W, H, fmt(c.ms), c.font, c.color, '#000', sep);
}

const def: DisplayDef = { id: 'sevenseg', label: '▦ Digital', short: 'DIG', order: 10, h: 150, draw };
export default def;
