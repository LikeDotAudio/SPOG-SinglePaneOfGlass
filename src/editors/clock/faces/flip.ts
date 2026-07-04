// src/editors/clock/faces/flip — a split-flap board: HH·MM·SS(·FF) cards flip, settle
// and bounce. Card count follows the resolution. Per-window state rides c.state.flip.
import { type FaceDef, type FaceCtx, zoneTime, pad, frames, roundRect } from './shared.js';

interface FlipCard { shown: string; from: string; t: number; }
interface FlipState { cards: FlipCard[]; last: number; }
const FLIP_MS = 520;

function easeOutBack(p: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}
function drawFlipCard(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, card: FlipCard): void {
  const hinge = y + h / 2, r = h * 0.1;
  const paintHalf = (text: string, top: boolean, scaleY: number): void => {
    if (scaleY <= 0.001) return;
    g.save();
    g.beginPath(); g.rect(x - 1, top ? y : hinge, w + 2, h / 2); g.clip();
    g.translate(0, hinge); g.scale(1, scaleY); g.translate(0, -hinge);
    roundRect(g, x, y, w, h, r); g.fillStyle = '#0c0c0c'; g.fill();
    g.fillStyle = '#f4f4f4';
    g.font = `800 ${Math.round(h * 0.62)}px 'Helvetica Neue',Arial,sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x + w / 2, y + h / 2);
    g.restore();
  };
  paintHalf(card.shown, true, 1);
  paintHalf(card.t < 0.5 ? card.from : card.shown, false, 1);
  if (card.t < 0.5) paintHalf(card.from, true, 1 - card.t / 0.5);
  else paintHalf(card.shown, false, Math.max(0, easeOutBack((card.t - 0.5) / 0.5)));
  g.strokeStyle = '#000'; g.lineWidth = Math.max(1.5, h * 0.03);
  g.beginPath(); g.moveTo(x, hinge); g.lineTo(x + w, hinge); g.stroke();
}

function draw(g: CanvasRenderingContext2D, S: number, c: FaceCtx): void {
  const t = zoneTime(c.z);
  const parts = c.res === 'hm' ? [pad(t.h), pad(t.m)]
    : c.res === 'hms' ? [pad(t.h), pad(t.m), pad(t.s)]
      : [pad(t.h), pad(t.m), pad(t.s), pad(frames(t.ms))];
  
  const N = parts.length * 2;
  const numColons = parts.length - 1;
  const st = (c.state.flip ??= { cards: [], last: c.now }) as FlipState;
  if (st.cards.length !== N) st.cards = [];
  const dt = Math.max(0, Math.min(200, c.now - st.last)); st.last = c.now;
  g.clearRect(0, 0, S, S);
  
  const bw = S * 0.96, bh = S * 0.5, bx = (S - bw) / 2, by = (S - bh) / 2;
  g.fillStyle = '#161616'; roundRect(g, bx, by, bw, bh, bh * 0.14); g.fill();
  g.fillStyle = '#7d8ba0'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${Math.round(S * 0.05)}px 'Courier New',monospace`;
  g.fillText(c.z.label.toUpperCase(), S / 2, by - S * 0.05);
  
  const gap = bw * 0.015;
  const pairGap = bw * 0.06;
  const cw = (bw - gap * (N + 1 - numColons) - pairGap * numColons) / N;
  const ch = bh * 0.82, cy = by + (bh - ch) / 2;
  
  let cx = bx + gap;
  let cardIdx = 0;
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p]!;
    for (let d = 0; d < 2; d++) {
      const char = part[d]!;
      let card = st.cards[cardIdx];
      if (!card) { card = { shown: char, from: char, t: 1 }; st.cards[cardIdx] = card; }
      if (card.t >= 1 && card.shown !== char) { card.from = card.shown; card.shown = char; card.t = 0; }
      else if (card.t < 1) card.t = Math.min(1, card.t + dt / FLIP_MS);
      drawFlipCard(g, cx, cy, cw, ch, card);
      cx += cw + gap;
      cardIdx++;
    }
    if (p < parts.length - 1) {
      g.fillStyle = '#444';
      g.beginPath();
      const cr = Math.min(3, cw * 0.1);
      g.arc(cx - gap + pairGap/2, cy + ch*0.33, cr, 0, Math.PI*2);
      g.arc(cx - gap + pairGap/2, cy + ch*0.67, cr, 0, Math.PI*2);
      g.fill();
      cx += (pairGap - gap);
    }
  }
}

const def: FaceDef = { id: 'flip', label: '▤ Flip', short: 'FLIP', order: 40, fit: [0.96, 0.5], draw };
export default def;
