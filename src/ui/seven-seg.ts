// src/ui/seven-seg — a shared canvas seven-segment (+ Arial) time renderer.
//
// Extracted from the Chronos editor so the Chronos graphic set and the dual
// timer draw identical LED read-outs. Renders a time string (digits, ':' and '.')
// centered in a canvas: authentic 7-segment digits with lit + faint ghost
// segments (the real-LED look), or a bold Arial fallback. Colour is red or white
// on whatever background the caller clears to (default black).

export type SegFont = 'seg' | 'arial';
export type SegColor = 'red' | 'white';

const COLORS: Record<SegColor, { on: string; glow: string; ghost: number }> = {
  red: { on: '#ff2b2b', glow: '#ff2b2b', ghost: 0.09 },
  white: { on: '#f2f4f7', glow: '#9fb8ff', ghost: 0.07 },
};

// Segment on-sets per glyph (a=top, b=top-right, c=bot-right, d=bottom,
// e=bot-left, f=top-left, g=middle).
const SEGS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgcde', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '',
};

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

function segDigit(g: CanvasRenderingContext2D, x: number, y: number, dw: number, dh: number, ch: string, col: { on: string; glow: string; ghost: number }): void {
  const on = SEGS[ch] ?? '';
  const t = dh * 0.135;
  const midY = dh / 2;
  const r = t * 0.38;
  const hIn = t * 0.85;
  const rects: Record<string, [number, number, number, number]> = {
    a: [x + hIn, y, dw - 2 * hIn, t],
    g: [x + hIn, y + midY - t / 2, dw - 2 * hIn, t],
    d: [x + hIn, y + dh - t, dw - 2 * hIn, t],
    f: [x, y + hIn, t, midY - 1.3 * t],
    b: [x + dw - t, y + hIn, t, midY - 1.3 * t],
    e: [x, y + midY + 0.3 * t, t, midY - 1.3 * t],
    c: [x + dw - t, y + midY + 0.3 * t, t, midY - 1.3 * t],
  };
  for (const [name, [rx, ry, rw, rh]] of Object.entries(rects)) {
    const lit = on.includes(name);
    g.save();
    g.globalAlpha = lit ? 1 : col.ghost;
    g.fillStyle = col.on;
    if (lit) { g.shadowColor = col.glow; g.shadowBlur = dh * 0.09; }
    roundRect(g, rx, ry, rw, rh, r); g.fill();
    g.restore();
  }
}

function advance(ch: string, dw: number, gap: number): number {
  if (ch === ':' || ch === '.') return dw * 0.5 + gap;
  return dw + gap;
}

/**
 * Render `str` centered in a W×H canvas context, in the chosen font + colour.
 * `sepVisible` optionally controls each separator (':' or '.') in order — pass
 * `false` to hide one this frame (used for the countdown blink); omitted = all on.
 */
export function drawSegString(
  g: CanvasRenderingContext2D, W: number, H: number, str: string,
  font: SegFont, color: SegColor, bg = '#000', sepVisible?: boolean[],
): void {
  const col = COLORS[color];
  g.clearRect(0, 0, W, H);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }

  if (font === 'arial') {
    const dh = H * 0.62;
    // Blink: blank any hidden separator with a space so the layout doesn't shift.
    let shown = str;
    if (sepVisible) {
      let si = 0;
      shown = [...str].map((ch) => (ch === ':' || ch === '.') ? (sepVisible[si++] === false ? ' ' : ch) : ch).join('');
    }
    g.font = `800 ${Math.round(dh)}px Arial, Helvetica, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = col.on;
    g.shadowColor = col.glow; g.shadowBlur = color === 'red' ? H * 0.06 : 0;
    g.fillText(shown, W / 2, H / 2 + H * 0.02);
    g.shadowBlur = 0;
    return;
  }

  const dh = H * 0.66;
  const dw = dh * 0.6;
  const gap = dw * 0.22;
  const y = (H - dh) / 2;
  let total = 0;
  for (const ch of str) total += advance(ch, dw, gap);
  total -= gap;
  let x = (W - total) / 2;
  let sepIdx = 0;
  for (const ch of str) {
    if (ch === ':' || ch === '.') {
      const show = sepVisible ? sepVisible[sepIdx] !== false : true;
      sepIdx++;
      if (show) {
        const cx = x + (dw * 0.5) / 2, rr = dh * 0.075;
        g.save(); g.fillStyle = col.on; g.shadowColor = col.glow; g.shadowBlur = dh * 0.09;
        if (ch === ':') {
          g.beginPath(); g.arc(cx, y + dh * 0.34, rr, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(cx, y + dh * 0.66, rr, 0, Math.PI * 2); g.fill();
        } else {
          g.beginPath(); g.arc(cx, y + dh - rr, rr, 0, Math.PI * 2); g.fill();
        }
        g.restore();
      }
    } else {
      segDigit(g, x, y, dw, dh, ch, col);
    }
    x += advance(ch, dw, gap);
  }
}
