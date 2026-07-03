// src/editors/chronos/displays/stopwatch — a classic mechanical analog stopwatch.
//
// A chrome bezel with two crowns, a white 0–60 SECOND scale around the rim swept by
// a long magenta hand, and a concentric black 0–60 MINUTE sub-dial swept by a short
// silver hand (one full rim sweep = +1 minute). Reads any controller's `ms`; on a
// count-up chrono it counts up, on a wall clock it tracks seconds. Drawn centred in
// the W×H box at radius min(W,H)·0.46 — pure canvas, no DOM.

import { TAU, type DisplayDef, type DisplayCtx } from '../shared.js';

function draw(g: CanvasRenderingContext2D, W: number, H: number, c: DisplayCtx): void {
  // The crown pushers (start/stop + reset) poke ~1.4·R above the bezel, so size R to
  // include that overhang and drop the centre down — otherwise the crowns clip the top.
  const CROWN_REACH = 1.4;
  const margin = Math.min(W, H) * 0.05;
  const R = Math.max(20, Math.min((W - margin * 2) / 2, (H - margin * 2) / (1 + CROWN_REACH)));
  const cx = W / 2, cy = margin + CROWN_REACH * R;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);

  // Two crowns poking out of the top of the bezel (wind + start/stop pushers).
  const crown = (ang: number, size: number, cap: string): void => {
    const bx = cx + Math.cos(ang) * R, by = cy + Math.sin(ang) * R;
    const tx = cx + Math.cos(ang) * (R + size * 1.5), ty = cy + Math.sin(ang) * (R + size * 1.5);
    g.strokeStyle = '#9aa0aa'; g.lineWidth = size * 0.7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
    const kn = g.createRadialGradient(tx - size * 0.3, ty - size * 0.3, size * 0.2, tx, ty, size);
    kn.addColorStop(0, '#f4f6f8'); kn.addColorStop(0.6, cap); kn.addColorStop(1, '#31343a');
    g.fillStyle = kn; g.beginPath(); g.arc(tx, ty, size, 0, TAU); g.fill();
  };
  // Crowns sit on the dial marks: the start/stop pusher at 60 (top), reset at 52.
  const markAng = (n: number): number => -Math.PI / 2 + (n / 60) * TAU;
  crown(markAng(60), R * 0.15, '#3a3d44');   // big knurled start/stop crown at 60 (top)
  crown(markAng(52), R * 0.10, '#5b6f86');   // small blue reset crown at 52

  // Chrome bezel ring.
  const bez = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.2, cx, cy, R * 1.05);
  bez.addColorStop(0, '#fdfefe'); bez.addColorStop(0.42, '#c9ccd2'); bez.addColorStop(0.7, '#7d828c');
  bez.addColorStop(0.86, '#eaedf1'); bez.addColorStop(1, '#565a62');
  g.fillStyle = bez; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  // Coloured rim reflections (the green + magenta glints on the real chrome).
  g.lineWidth = R * 0.02; g.lineCap = 'round';
  g.strokeStyle = 'rgba(60,170,90,0.75)'; g.beginPath(); g.arc(cx, cy, R * 0.99, Math.PI * 0.78, Math.PI * 1.02); g.stroke();
  g.strokeStyle = 'rgba(200,40,120,0.55)'; g.beginPath(); g.arc(cx, cy, R * 0.99, Math.PI * 1.02, Math.PI * 1.2); g.stroke();

  // White dial face.
  const rF = R * 0.9;
  g.fillStyle = '#f6f7f4'; g.beginPath(); g.arc(cx, cy, rF, 0, TAU); g.fill();

  // Outer SECOND scale: 60 ticks, numbers 5..60 by 5 (60 at top).
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * TAU, major = i % 5 === 0;
    const rO = rF * 0.98, rI = rF * (major ? 0.86 : 0.92);
    g.strokeStyle = '#141414'; g.lineWidth = major ? R * 0.012 : R * 0.004;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * rI, cy + Math.sin(a) * rI); g.lineTo(cx + Math.cos(a) * rO, cy + Math.sin(a) * rO); g.stroke();
  }
  g.fillStyle = '#141414'; g.font = `800 ${Math.round(R * 0.10)}px Arial,Helvetica,sans-serif`;
  for (let n = 5; n <= 60; n += 5) {
    const a = -Math.PI / 2 + (n / 60) * TAU;
    g.fillText(String(n), cx + Math.cos(a) * rF * 0.73, cy + Math.sin(a) * rF * 0.73);
  }

  // Inner black MINUTE sub-dial (concentric): 60 ticks + white numbers by 5.
  const rS = rF * 0.52;
  g.fillStyle = '#101012'; g.beginPath(); g.arc(cx, cy, rS, 0, TAU); g.fill();
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * TAU, major = i % 5 === 0;
    const rO = rS * 0.96, rI = rS * (major ? 0.82 : 0.9);
    g.strokeStyle = '#e6e6e6'; g.lineWidth = major ? R * 0.006 : R * 0.002;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * rI, cy + Math.sin(a) * rI); g.lineTo(cx + Math.cos(a) * rO, cy + Math.sin(a) * rO); g.stroke();
  }
  g.fillStyle = '#e6e6e6'; g.font = `700 ${Math.round(R * 0.058)}px Arial,Helvetica,sans-serif`;
  for (let n = 5; n <= 60; n += 5) {
    const a = -Math.PI / 2 + (n / 60) * TAU;
    g.fillText(String(n), cx + Math.cos(a) * rS * 0.72, cy + Math.sin(a) * rS * 0.72);
  }

  // Hands, from the controller's elapsed ms.
  const totalS = Math.max(0, c.ms) / 1000;
  const secF = (totalS % 60) / 60;             // magenta rim sweep (smooth)
  const minF = ((totalS / 60) % 60) / 60;      // silver sub-dial hand
  const hand = (frac: number, len: number, w: number, color: string, tail = 0): void => {
    const a = -Math.PI / 2 + frac * TAU;
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - Math.cos(a) * tail, cy - Math.sin(a) * tail);
    g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.stroke();
  };
  hand(minF, rS * 0.82, R * 0.02, '#f0f0f0');                 // minute hand (short, in sub-dial)
  g.fillStyle = '#f0f0f0'; g.beginPath(); g.arc(cx, cy, R * 0.028, 0, TAU); g.fill();
  hand(secF, rF * 0.84, R * 0.018, '#e0219a', rF * 0.2);      // second hand (long magenta sweep)
  g.fillStyle = '#e0219a'; g.beginPath(); g.arc(cx, cy, R * 0.04, 0, TAU); g.fill();
  g.fillStyle = '#7a1152'; g.beginPath(); g.arc(cx, cy, R * 0.017, 0, TAU); g.fill();
}

const def: DisplayDef = { id: 'stopwatch', label: '◴ Stopwatch', short: 'STOP', order: 20, h: 300, draw };
export default def;
