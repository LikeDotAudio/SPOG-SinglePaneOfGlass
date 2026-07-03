// src/editors/clock/faces/casio — CLASIO: a classic silver digital wristwatch. A
// metallic bezel (with the TIME ZONE engraved where the brand would be) frames a
// greenish LCD showing the weekday, date, AM/PM and the running time — calendar and
// clock built in, like the real thing.
import { type FaceDef, type FaceCtx, zoneTime, zoneCal, WEEKDAY3, pad, roundRect } from './shared.js';
import { drawLcd, lcdWidth, type LcdStyle } from './lcd.js';

function draw(g: CanvasRenderingContext2D, S: number, c: FaceCtx): void {
  const t = zoneTime(c.z), cal = zoneCal(c.z);
  g.clearRect(0, 0, S, S);

  // ---- metallic silver body ----
  // Corner Law (LCARS.md §1.1): each nested level's radius is HALF its parent's.
  const bx = S * 0.03, by = S * 0.03, bw = S * 0.94, bh = S * 0.94, br = S * 0.16;
  const steel = g.createLinearGradient(0, by, 0, by + bh);
  steel.addColorStop(0, '#eef1f4'); steel.addColorStop(0.45, '#a9b1ba');
  steel.addColorStop(0.55, '#9aa2ab'); steel.addColorStop(1, '#ccd2d8');
  roundRect(g, bx, by, bw, bh, br); g.fillStyle = steel; g.fill();
  roundRect(g, bx + S * 0.015, by + S * 0.015, bw - S * 0.03, bh - S * 0.03, br - S * 0.015);
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = S * 0.006; g.stroke();

  // ---- bezel engraving: the TIME ZONE (top) + accents ----
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#3a3f45';
  g.font = `800 ${Math.round(S * 0.062)}px Arial,Helvetica,sans-serif`;
  g.fillText(c.z.label.toUpperCase().slice(0, 14), S / 2, by + bh * 0.085);
  g.fillStyle = '#6a7076';
  g.font = `700 ${Math.round(S * 0.03)}px Arial,sans-serif`;
  g.fillText('CASIO', bx + bw * 0.24, by + bh * 0.14);
  g.fillText('ALARM  CHRONO', bx + bw * 0.7, by + bh * 0.14);
  g.fillStyle = '#2e3237';
  g.font = `800 ${Math.round(S * 0.032)}px Arial,sans-serif`;
  g.fillText('WATER  RESIST', S / 2, by + bh * 0.915);

  // ---- dark inner frame + greenish LCD ----
  const fr = br / 2;   // frame = ½ body
  const fx = S * 0.12, fy = S * 0.2, fw = S * 0.76, fh = S * 0.6;
  roundRect(g, fx, fy, fw, fh, fr); g.fillStyle = '#26292b'; g.fill();
  const lx = fx + S * 0.03, ly = fy + S * 0.03, lw = fw - S * 0.06, lh = fh - S * 0.06;
  const lcdbg = g.createLinearGradient(0, ly, 0, ly + lh);
  lcdbg.addColorStop(0, '#cfd4c6'); lcdbg.addColorStop(1, '#b3b9a6');
  roundRect(g, lx, ly, lw, lh, fr / 2); g.fillStyle = lcdbg; g.fill();   // LCD = ½ frame

  const on = '#1b1f16', off = 'rgba(30,36,20,0.10)';
  // ---- top strip: AM/PM + signal bars · weekday · date ----
  const topY = ly + lh * 0.16;
  g.fillStyle = on; g.textBaseline = 'middle';
  g.textAlign = 'left'; g.font = `800 ${Math.round(lh * 0.1)}px Arial,sans-serif`;
  g.fillText(t.h >= 12 ? 'PM' : 'AM', lx + lw * 0.05, topY);
  for (let i = 0; i < 4; i++) { const h2 = lh * (0.05 + i * 0.028); g.fillRect(lx + lw * 0.2 + i * lw * 0.028, topY - h2 / 2, lw * 0.018, h2); }
  g.textAlign = 'center'; g.font = `800 ${Math.round(lh * 0.14)}px Arial,sans-serif`;
  g.fillText(WEEKDAY3[cal.day] ?? '', lx + lw * 0.55, topY);
  const dtH = lh * 0.15, dStr = pad(cal.date);
  drawLcd(g, dStr, lx + lw * 0.96 - lcdWidth(dStr, dtH), topY - dtH / 2, dtH, { on, off, thick: Math.max(1, dtH * 0.16) });

  // ---- main time: HH:MM big + seconds small (digits sized to fit the panel) ----
  const timeStr = `${pad(t.h)}:${pad(t.m)}`, secStr = pad(t.s);
  const bigH = Math.min(lh * 0.46, (lw * 0.87) / (lcdWidth(timeStr, 1) + 0.42 * lcdWidth(secStr, 1)));
  const secH = bigH * 0.42;
  const styBig: LcdStyle = { on, off, thick: Math.max(1.5, bigH * 0.15) };
  const stySec: LcdStyle = { on, off, thick: Math.max(1, secH * 0.16) };
  const totalW = lcdWidth(timeStr, bigH) + lw * 0.03 + lcdWidth(secStr, secH);
  const startX = lx + lw * 0.5 - totalW / 2, baseY = ly + lh * 0.5;
  const w1 = drawLcd(g, timeStr, startX, baseY, bigH, styBig, t.ms > 500);
  drawLcd(g, secStr, startX + w1 + lw * 0.03, baseY + bigH - secH, secH, stySec);
}

const def: FaceDef = { id: 'casio', label: '⌚ Clasio', short: 'CSIO', order: 15, fit: [1, 1], draw };
export default def;
