// src/editors/clock/faces/bigben — the Great Clock of Westminster: a gilded Gothic
// tower dial. Gilt bezel + bronze ring, cream opal face, blackletter Roman numerals
// in a barred minute ring, a gilt filigree rosette, and pierced Gothic hour + minute
// hands. No second hand, as on the real clock.
import { type FaceDef, type FaceCtx, zoneTime, TAU } from './shared.js';

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

// A pierced Gothic hand, drawn pointing UP in local space then rotated to `frac`.
function benHand(g: CanvasRenderingContext2D, cx: number, cy: number, frac: number,
                 len: number, w: number, tail: number): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(frac * TAU);
  g.beginPath();
  g.moveTo(0, tail);
  g.lineTo(w, tail * 0.2);
  g.lineTo(w * 0.5, -len * 0.5);
  g.lineTo(w * 1.9, -len * 0.62);
  g.lineTo(w * 0.35, -len * 0.74);
  g.lineTo(w * 0.55, -len * 0.9);
  g.lineTo(0, -len);
  g.lineTo(-w * 0.55, -len * 0.9);
  g.lineTo(-w * 0.35, -len * 0.74);
  g.lineTo(-w * 1.9, -len * 0.62);
  g.lineTo(-w * 0.5, -len * 0.5);
  g.lineTo(-w, tail * 0.2);
  g.closePath();
  g.fillStyle = '#1c130b'; g.fill();
  g.strokeStyle = 'rgba(214,176,74,0.9)'; g.lineWidth = Math.max(1, w * 0.5); g.stroke();
  g.fillStyle = '#e9d9ad'; g.beginPath(); g.arc(0, -len * 0.62, w * 0.7, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(120,90,30,0.8)'; g.lineWidth = 1; g.stroke();
  g.restore();
}

function draw(g: CanvasRenderingContext2D, S: number, c: FaceCtx): void {
  const t = zoneTime(c.z);
  const cx = S / 2, cy = S / 2, R = S * 0.47;
  g.clearRect(0, 0, S, S);
  const px = (f: number, r: number): number => cx + Math.sin(f * TAU) * r;
  const py = (f: number, r: number): number => cy - Math.cos(f * TAU) * r;

  const gold = g.createRadialGradient(cx, cy, R * 0.86, cx, cy, R);
  gold.addColorStop(0, '#7a5a12'); gold.addColorStop(0.35, '#e8c53a');
  gold.addColorStop(0.6, '#fff1a8'); gold.addColorStop(0.82, '#e0b52e'); gold.addColorStop(1, '#8c6a16');
  g.fillStyle = gold; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  g.fillStyle = '#3a2a18'; g.beginPath(); g.arc(cx, cy, R * 0.9, 0, TAU); g.fill();
  const cream = g.createRadialGradient(cx, cy - R * 0.12, R * 0.1, cx, cy, R * 0.86);
  cream.addColorStop(0, '#fbf5df'); cream.addColorStop(1, '#e8d6ac');
  g.fillStyle = cream; g.beginPath(); g.arc(cx, cy, R * 0.86, 0, TAU); g.fill();

  const rOut = R * 0.84, rIn = R * 0.60;
  g.strokeStyle = '#2a1c10'; g.lineWidth = S * 0.006;
  g.beginPath(); g.arc(cx, cy, rOut, 0, TAU); g.stroke();
  g.beginPath(); g.arc(cx, cy, rIn, 0, TAU); g.stroke();
  for (let i = 0; i < 60; i++) {
    const f = i / 60, major = i % 5 === 0;
    g.lineWidth = S * (major ? 0.013 : 0.004);
    g.beginPath(); g.moveTo(px(f, rIn), py(f, rIn)); g.lineTo(px(f, rOut), py(f, rOut)); g.stroke();
  }

  g.fillStyle = '#1a1208';
  g.font = `800 ${Math.round(S * 0.11)}px Georgia,'Times New Roman',serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const rNum = (rOut + rIn) / 2;
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * TAU;
    g.save(); g.translate(px(h / 12, rNum), py(h / 12, rNum)); g.rotate(a);
    g.fillText(ROMAN[h] ?? '', 0, 0);
    g.restore();
  }

  g.fillStyle = '#f7efd6'; g.beginPath(); g.arc(cx, cy, rIn * 0.98, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(176,138,44,0.75)'; g.lineWidth = Math.max(1, S * 0.0035);
  const petals = 16;
  for (let i = 0; i < petals; i++) {
    const f1 = i / petals, f2 = (i + 1) / petals, fm = (i + 0.5) / petals;
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(px(f1, rIn * 0.9), py(f1, rIn * 0.9), px(fm, rIn * 0.5), py(fm, rIn * 0.5));
    g.quadraticCurveTo(px(f2, rIn * 0.9), py(f2, rIn * 0.9), cx, cy);
    g.stroke();
  }
  for (const rr of [0.3, 0.55, 0.8]) { g.beginPath(); g.arc(cx, cy, rIn * rr, 0, TAU); g.stroke(); }

  g.fillStyle = '#6b4a1c';
  g.font = `700 ${Math.round(S * 0.045)}px Georgia,serif`;
  g.fillText(c.z.label.toUpperCase(), cx, cy - rIn * 0.55);

  const minF = t.m + t.s / 60, hourF = (t.h % 12) + minF / 60;
  benHand(g, cx, cy, minF / 60, R * 0.78, S * 0.016, R * 0.13);
  benHand(g, cx, cy, hourF / 12, R * 0.52, S * 0.021, R * 0.11);
  g.fillStyle = '#d6b04a'; g.beginPath(); g.arc(cx, cy, S * 0.028, 0, TAU); g.fill();
  g.fillStyle = '#3a2a12'; g.beginPath(); g.arc(cx, cy, S * 0.012, 0, TAU); g.fill();
}

const def: FaceDef = { id: 'bigben', label: '☒ Big Ben', short: 'BEN', order: 50, fit: [1, 1], draw };
export default def;
