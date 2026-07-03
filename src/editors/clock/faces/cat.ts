// src/editors/clock/faces/cat — Kit-Cat: wagging tail + shifting eyes over a belly
// clock. Drawn on a DARK panel with a soft WHITE fuzz rim bleeding off the glossy
// black silhouette (a white brush-stroke shadow) — the fur catching a rim light.
import { type FaceDef, type FaceCtx, zoneTime, roundRect, TAU } from './shared.js';

function draw(g: CanvasRenderingContext2D, S: number, c: FaceCtx): void {
  const t = zoneTime(c.z);
  g.clearRect(0, 0, S, S);
  const cx = S / 2;
  const swing = Math.sin(c.now / 420);
  const headCy = S * 0.19, headR = S * 0.17;

  // Faint cool vignette so the black body reads against the dark window.
  const vig = g.createRadialGradient(cx, S * 0.42, S * 0.05, cx, S * 0.45, S * 0.62);
  vig.addColorStop(0, 'rgba(38,42,54,0.55)');
  vig.addColorStop(1, 'rgba(10,11,16,0)');
  g.fillStyle = vig; g.fillRect(0, 0, S, S);

  // Silhouette (tail → body → ears → head) with a WHITE fuzz halo — the rim light.
  const fuzz = 0.42 + 0.14 * Math.abs(swing);   // breathes with the pendulum
  g.save();
  g.shadowColor = `rgba(245,248,255,${fuzz})`;
  g.shadowBlur = S * 0.05;

  g.save();
  g.translate(cx + S * 0.03, S * 0.76); g.rotate(swing * 0.5);
  g.strokeStyle = '#0a0a0a'; g.lineCap = 'round'; g.lineWidth = S * 0.05;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(S * 0.06, S * 0.12, -S * 0.02, S * 0.23); g.stroke();
  g.restore();

  g.fillStyle = '#0d0d0d';
  const bw = S * 0.5, bx = cx - bw / 2, byTop = S * 0.3;
  roundRect(g, bx, byTop, bw, S * 0.78 - byTop, S * 0.12); g.fill();

  const ear = (sgn: number): void => {
    g.beginPath();
    g.moveTo(cx + sgn * headR * 0.7, headCy - headR * 0.6);
    g.lineTo(cx + sgn * headR * 1.05, headCy - headR * 1.5);
    g.lineTo(cx + sgn * headR * 0.2, headCy - headR * 0.85);
    g.closePath(); g.fill();
  };
  ear(-1); ear(1);
  g.beginPath(); g.arc(cx, headCy, headR, 0, TAU); g.fill();
  g.restore();

  // Glossy specular highlights.
  g.save();
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.beginPath(); g.ellipse(cx - headR * 0.4, headCy - headR * 0.4, headR * 0.42, headR * 0.24, -0.6, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(cx - S * 0.11, S * 0.44, S * 0.05, S * 0.16, 0, 0, TAU); g.fill();
  g.restore();

  const eyeR = headR * 0.42, eyeDX = headR * 0.5, eyeY = headCy - headR * 0.12;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * eyeDX;
    g.fillStyle = '#f6f6f2'; g.beginPath(); g.ellipse(ex, eyeY, eyeR * 0.8, eyeR, 0, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(ex + swing * eyeR * 0.5, eyeY, eyeR * 0.28, eyeR * 0.72, 0, 0, TAU); g.fill();
  }
  g.fillStyle = '#111'; g.beginPath(); g.arc(cx, headCy + headR * 0.28, headR * 0.12, 0, TAU); g.fill();
  g.strokeStyle = '#f6f6f2'; g.lineWidth = S * 0.008; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, headCy + headR * 0.12, headR * 0.6, Math.PI * 0.15, Math.PI * 0.85); g.stroke();

  g.fillStyle = '#f2f2ee';
  const bty = S * 0.315;
  g.beginPath();
  g.moveTo(cx, bty); g.lineTo(cx - S * 0.09, bty - S * 0.035); g.lineTo(cx - S * 0.09, bty + S * 0.035); g.closePath();
  g.moveTo(cx, bty); g.lineTo(cx + S * 0.09, bty - S * 0.035); g.lineTo(cx + S * 0.09, bty + S * 0.035); g.closePath();
  g.fill();
  g.beginPath(); g.arc(cx, bty, S * 0.022, 0, TAU); g.fill();

  const clkY = S * 0.55, R = S * 0.15;
  g.fillStyle = '#0a0a0a'; g.beginPath(); g.ellipse(cx, clkY, R * 0.85, R, 0, 0, TAU); g.fill();
  g.strokeStyle = '#f6f6f2'; g.lineWidth = S * 0.006; g.stroke();
  g.fillStyle = '#f6f6f2';
  for (let h = 0; h < 12; h++) {
    const a = -Math.PI / 2 + (h / 12) * TAU;
    g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.72, clkY + Math.sin(a) * R * 0.86, S * 0.006, 0, TAU); g.fill();
  }
  const secF = t.s + t.ms / 1000, minF = t.m + secF / 60, hourF = (t.h % 12) + minF / 60;
  const hand = (frac: number, len: number, w: number): void => {
    const a = -Math.PI / 2 + frac * TAU;
    g.strokeStyle = '#f6f6f2'; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, clkY); g.lineTo(cx + Math.cos(a) * len * 0.85, clkY + Math.sin(a) * len); g.stroke();
  };
  hand(hourF / 12, R * 0.5, S * 0.014);
  hand(minF / 60, R * 0.72, S * 0.01);
  g.fillStyle = '#ddd'; g.beginPath(); g.arc(cx, clkY, S * 0.012, 0, TAU); g.fill();
  g.fillStyle = '#9aa4b4'; g.font = `700 ${Math.round(S * 0.03)}px 'Courier New',monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(c.z.label.toUpperCase(), cx, clkY - R * 0.5);
}

const def: FaceDef = { id: 'cat', label: '◕ Cat', short: 'CAT', order: 60, fit: [0.54, 1.06], draw };
export default def;
