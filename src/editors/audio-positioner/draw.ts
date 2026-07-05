// src/editors/audio-positioner/draw.ts — canvas painters for the CMDP face + top/side POVs.
import type { Fader } from './fader.js';

export function drawFace(c: CanvasRenderingContext2D, cx: number, cy: number, target: Fader | null): void {
  const r = 40, orange = '#f4902c'; c.save(); c.translate(cx, cy);
  c.fillStyle = '#333'; c.strokeStyle = orange; c.lineWidth = 2;
  c.beginPath(); c.ellipse(-r - 5, 0, 10, 15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(r + 5, 0, 10, 15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = '#444'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.stroke();
  if (target) { c.fillStyle = '#fff'; c.font = 'bold 10px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; let t = target.label; if (t.length > 10) t = t.slice(0, 8) + '..'; c.fillText(t, 0, 0); }
  c.fillStyle = orange; c.beginPath(); c.moveTo(0, -r - 10); c.lineTo(-10, -r + 5); c.lineTo(10, -r + 5); c.closePath(); c.fill(); c.stroke();
  c.restore();
}

export function drawPOVs(
  ctxTop: CanvasRenderingContext2D, ctxSide: CanvasRenderingContext2D,
  cvsTop: HTMLCanvasElement, cvsSide: HTMLCanvasElement,
  faders: Fader[], active: Fader | null, hovered: Fader | null,
): void {
  const w1 = cvsTop.width, h1 = cvsTop.height;
  ctxTop.clearRect(0, 0, w1, h1);
  ctxTop.strokeStyle = '#333'; ctxTop.beginPath(); ctxTop.arc(w1 / 2, h1 / 2, w1 * 0.35, 0, Math.PI * 2); ctxTop.stroke();
  ctxTop.beginPath(); ctxTop.moveTo(w1 / 2, 0); ctxTop.lineTo(w1 / 2, h1); ctxTop.stroke();
  ctxTop.beginPath(); ctxTop.moveTo(0, h1 / 2); ctxTop.lineTo(w1, h1 / 2); ctxTop.stroke();
  ctxTop.fillStyle = '#888'; ctxTop.beginPath(); ctxTop.arc(w1 / 2, h1 / 2, 4, 0, Math.PI * 2); ctxTop.fill();

  const w2 = cvsSide.width, h2 = cvsSide.height;
  ctxSide.clearRect(0, 0, w2, h2);
  ctxSide.strokeStyle = '#333'; ctxSide.beginPath(); ctxSide.moveTo(w2 / 2, 0); ctxSide.lineTo(w2 / 2, h2); ctxSide.stroke();
  ctxSide.setLineDash([5, 5]); ctxSide.beginPath(); ctxSide.moveTo(0, h2 - 40); ctxSide.lineTo(w2, h2 - 40); ctxSide.stroke(); ctxSide.setLineDash([]);
  ctxSide.fillStyle = '#888'; ctxSide.beginPath(); ctxSide.arc(w2 / 2, h2 - 40, 4, 0, Math.PI * 2); ctxSide.fill();

  faders.forEach(f => {
    if (!f.visible) return;
    const rad = (f.angle - 90) * Math.PI / 180;
    const r = (f.val / 100) * (w1 * 0.35);
    const tx = w1 / 2 + r * Math.cos(rad);
    const ty = h1 / 2 + r * Math.sin(rad);
    ctxTop.fillStyle = f.color; ctxTop.beginPath(); ctxTop.arc(tx, ty, 6, 0, Math.PI * 2); ctxTop.fill();
    if (f === active || f === hovered) { ctxTop.strokeStyle = '#fff'; ctxTop.lineWidth = 2; ctxTop.stroke(); }

    const sx = w2 / 2 + r * Math.cos(rad); // X projection (Left/Right)
    const sy = h2 - 40 - (f.height / 100) * (h2 - 80); // Y projection (Height)
    ctxSide.fillStyle = f.color; ctxSide.beginPath(); ctxSide.arc(sx, sy, 6, 0, Math.PI * 2); ctxSide.fill();
    if (f === active || f === hovered) { ctxSide.strokeStyle = '#fff'; ctxSide.lineWidth = 2; ctxSide.stroke(); }
  });
}
