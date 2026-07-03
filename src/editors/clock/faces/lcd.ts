// src/editors/clock/faces/lcd — a seven-segment LCD renderer shared by the digital
// wristwatch faces (Casio, Time-Extreme). Draws beveled segment bars with faint
// "off" ghost segments — the characteristic look of a monochrome LCD. Not a face
// itself (no default export), so the faces/ glob skips it.

import { TAU } from './shared.js';

// Segment order: a(top) b(top-right) c(bottom-right) d(bottom) e(bottom-left) f(top-left) g(middle)
const SEG7: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0], '1': [0, 1, 1, 0, 0, 0, 0], '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1], '4': [0, 1, 1, 0, 0, 1, 1], '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1], '7': [1, 1, 1, 0, 0, 0, 0], '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1], '-': [0, 0, 0, 0, 0, 0, 1], ' ': [0, 0, 0, 0, 0, 0, 0],
  'A': [1, 1, 1, 0, 1, 1, 1], 'P': [1, 1, 0, 0, 1, 1, 1], 'E': [1, 0, 0, 1, 1, 1, 1],
  'C': [1, 0, 0, 1, 1, 1, 0], 'D': [0, 1, 1, 1, 1, 0, 1], 'H': [0, 1, 1, 0, 1, 1, 1],
  'R': [0, 0, 0, 0, 1, 0, 1], 'S': [1, 0, 1, 1, 0, 1, 1], 'U': [0, 1, 1, 1, 1, 1, 0],
  'O': [1, 1, 1, 1, 1, 1, 0], 'T': [0, 0, 0, 1, 1, 1, 1], 'F': [1, 0, 0, 0, 1, 1, 1],
  'M': [1, 1, 1, 0, 1, 1, 0], 'W': [0, 1, 1, 1, 1, 1, 0], 'L': [0, 0, 0, 1, 1, 1, 0],
};

export interface LcdStyle { on: string; off: string; thick: number; }

/** A horizontal beveled segment bar centred at (cx,cy). */
function hseg(g: CanvasRenderingContext2D, cx: number, cy: number, len: number, th: number): void {
  const hl = len / 2, ht = th / 2;
  g.beginPath();
  g.moveTo(cx - hl, cy); g.lineTo(cx - hl + ht, cy - ht); g.lineTo(cx + hl - ht, cy - ht);
  g.lineTo(cx + hl, cy); g.lineTo(cx + hl - ht, cy + ht); g.lineTo(cx - hl + ht, cy + ht);
  g.closePath(); g.fill();
}
/** A vertical beveled segment bar centred at (cx,cy). */
function vseg(g: CanvasRenderingContext2D, cx: number, cy: number, len: number, th: number): void {
  const hl = len / 2, ht = th / 2;
  g.beginPath();
  g.moveTo(cx, cy - hl); g.lineTo(cx + ht, cy - hl + ht); g.lineTo(cx + ht, cy + hl - ht);
  g.lineTo(cx, cy + hl); g.lineTo(cx - ht, cy + hl - ht); g.lineTo(cx - ht, cy - hl + ht);
  g.closePath(); g.fill();
}

/** Draw one 7-seg glyph in box (x,y,w,h). Off segments render faint (LCD ghosting). */
export function drawDigit(g: CanvasRenderingContext2D, ch: string, x: number, y: number,
                          w: number, h: number, s: LcdStyle): void {
  const seg = SEG7[ch] ?? SEG7[' ']!;
  const th = s.thick, hlen = w - th, vlen = (h - th * 1.5) / 2;
  const midX = x + w / 2, topY = y + th / 2, midY = y + h / 2, botY = y + h - th / 2;
  const upY = y + h * 0.27, dnY = y + h * 0.73, lX = x + th / 2, rX = x + w - th / 2;
  const put = (on: number, fn: () => void): void => { g.fillStyle = on ? s.on : s.off; fn(); };
  put(seg[0]!, () => hseg(g, midX, topY, hlen, th));
  put(seg[1]!, () => vseg(g, rX, upY, vlen, th));
  put(seg[2]!, () => vseg(g, rX, dnY, vlen, th));
  put(seg[3]!, () => hseg(g, midX, botY, hlen, th));
  put(seg[4]!, () => vseg(g, lX, dnY, vlen, th));
  put(seg[5]!, () => vseg(g, lX, upY, vlen, th));
  put(seg[6]!, () => hseg(g, midX, midY, hlen, th));
}

/**
 * Draw an LCD string left-to-right from (x,y) at digit height `dh`. Supports 0-9,
 * A-Z (subset), space, '-', ':' (blinking colon when `blink` is false hides it),
 * '.' (decimal dot). Returns the total width drawn.
 */
export function drawLcd(g: CanvasRenderingContext2D, str: string, x: number, y: number,
                        dh: number, s: LcdStyle, blinkOff = false): number {
  const dw = dh * 0.60, gap = dh * 0.14, colonW = dh * 0.30, dotW = dh * 0.34, dotR = s.thick * 0.7;
  let cx = x;
  for (const ch of str) {
    if (ch === ':') {
      g.fillStyle = blinkOff ? s.off : s.on;
      for (const cy of [y + dh * 0.33, y + dh * 0.67]) { g.beginPath(); g.arc(cx + colonW / 2, cy, dotR, 0, TAU); g.fill(); }
      cx += colonW + gap;
    } else if (ch === '.') {
      g.fillStyle = s.on; g.beginPath(); g.arc(cx + dotW * 0.4, y + dh - dotR, dotR, 0, TAU); g.fill();
      cx += dotW + gap;
    } else {
      drawDigit(g, ch, cx, y, dw, dh, s);
      cx += dw + gap;
    }
  }
  return cx - gap - x;
}

/** Measured width of a string at digit height `dh` (mirrors drawLcd's metrics). */
export function lcdWidth(str: string, dh: number): number {
  const dw = dh * 0.60, gap = dh * 0.14, colonW = dh * 0.30, dotW = dh * 0.34;
  let w = 0;
  for (const ch of str) w += (ch === ':' ? colonW : ch === '.' ? dotW : dw) + gap;
  return Math.max(0, w - gap);
}
