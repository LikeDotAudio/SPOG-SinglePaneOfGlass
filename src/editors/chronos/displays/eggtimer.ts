// src/editors/chronos/displays/eggtimer — a classic wind-up kitchen egg timer.
//
// A white rounded-square body with a rotating 0–60 MINUTE ring, a fixed red triangle
// pointer at 12 o'clock, and a white centre grip. The ring turns so the count-down's
// remaining minutes sit under the pointer; as it unwinds it rotates back toward 0.
// Best paired with a `down` controller, but reads any controller's `ms` (a count-up
// simply winds the ring the other way). When a down count lands, the rim pulses red.

import { TAU, roundRect, type DisplayDef, type DisplayCtx } from '../shared.js';

function draw(g: CanvasRenderingContext2D, W: number, H: number, c: DisplayCtx): void {
  const cx = W / 2, cy = H / 2, S = Math.min(W, H);
  g.clearRect(0, 0, W, H);

  // White rounded-square body.
  const bR = S * 0.47;
  roundRect(g, cx - bR, cy - bR, bR * 2, bR * 2, S * 0.1);
  const body = g.createLinearGradient(0, cy - bR, 0, cy + bR);
  body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#e4e6e9');
  g.fillStyle = body; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = S * 0.006; g.stroke();

  const R = S * 0.4;                                   // dial radius
  const remainMin = Math.max(0, Math.min(60, c.ms / 60_000));
  const theta = -(remainMin / 60) * TAU;              // bring `remainMin` to the top pointer

  // Rotating number ring: ticks (minor per minute, major per 5) + numbers 0..55 by 5.
  g.save();
  g.translate(cx, cy); g.rotate(theta);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * TAU, major = i % 5 === 0;
    const rO = R, rI = R * (major ? 0.87 : 0.93);
    g.strokeStyle = '#151515'; g.lineWidth = major ? S * 0.008 : S * 0.0028;
    g.beginPath(); g.moveTo(Math.cos(a) * rI, Math.sin(a) * rI); g.lineTo(Math.cos(a) * rO, Math.sin(a) * rO); g.stroke();
  }
  g.fillStyle = '#151515'; g.font = `800 ${Math.round(S * 0.072)}px Arial,Helvetica,sans-serif`;
  for (let n = 0; n < 60; n += 5) {
    const a = -Math.PI / 2 + (n / 60) * TAU;
    g.save();
    g.translate(Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75);
    g.rotate(a + Math.PI / 2);                          // numerals stand upright around the ring
    g.fillText(String(n), 0, 0);
    g.restore();
  }
  g.restore();

  // Recessed dial rim (the moulded well the ring turns in).
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = S * 0.004;
  g.beginPath(); g.arc(cx, cy, R * 0.82, 0, TAU); g.stroke();

  // Landed alarm: a red rim pulse while a finished down count sits at zero.
  if (c.kind === 'down' && c.ms <= 0 && !c.running) {
    const p = 0.5 + 0.5 * Math.sin(c.now / 140);
    g.strokeStyle = `rgba(224,31,31,${0.35 + 0.55 * p})`; g.lineWidth = S * 0.02;
    g.beginPath(); g.arc(cx, cy, R * 1.03, 0, TAU); g.stroke();
  }

  // White centre grip (the knob you twist to wind it).
  const kw = S * 0.1, kh = S * 0.34;
  roundRect(g, cx - kw / 2, cy - kh / 2, kw, kh, kw * 0.5);
  const kg = g.createLinearGradient(cx - kw / 2, 0, cx + kw / 2, 0);
  kg.addColorStop(0, '#e9e9e9'); kg.addColorStop(0.5, '#ffffff'); kg.addColorStop(1, '#d6d6d6');
  g.fillStyle = kg; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = S * 0.003; g.stroke();

  // Fixed red triangle pointer at 12 o'clock.
  g.fillStyle = '#e01f1f';
  const tTip = cy - R * 0.86, tBase = cy - R * 1.0, tw = S * 0.045;
  g.beginPath(); g.moveTo(cx, tTip); g.lineTo(cx - tw, tBase); g.lineTo(cx + tw, tBase); g.closePath(); g.fill();
}

const def: DisplayDef = { id: 'eggtimer', label: '◔ Egg Timer', short: 'EGG', order: 30, h: 300, draw };
export default def;
