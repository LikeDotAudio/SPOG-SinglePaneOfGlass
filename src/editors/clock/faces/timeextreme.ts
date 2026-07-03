// src/editors/clock/faces/timeextreme — TIME-EXTREME: a Timex-Ironman-style sports
// watch. A black/orange resin bezel (with the TIME ZONE across the top) frames a
// greenish LCD showing weekday + date on top and the running time below — the same
// LCD family as the Clasio face.
import { type FaceDef, type FaceCtx, zoneTime, zoneCal, WEEKDAY3, pad, roundRect } from './shared.js';
import { drawLcd, lcdWidth, type LcdStyle } from './lcd.js';

function draw(g: CanvasRenderingContext2D, S: number, c: FaceCtx): void {
  const t = zoneTime(c.z), cal = zoneCal(c.z);
  g.clearRect(0, 0, S, S);
  g.textAlign = 'center'; g.textBaseline = 'middle';

  // ---- black resin body + orange accent ring ----
  // Corner Law (LCARS.md §1.1): each nested level's radius is HALF its parent's.
  const bx = S * 0.05, by = S * 0.02, bw = S * 0.9, bh = S * 0.96, br = S * 0.18;
  const body = g.createLinearGradient(0, by, 0, by + bh);
  body.addColorStop(0, '#4a4d52'); body.addColorStop(0.12, '#2a2c30');
  body.addColorStop(0.5, '#17181b'); body.addColorStop(1, '#242629');
  roundRect(g, bx, by, bw, bh, br); g.fillStyle = body; g.fill();

  // corner screws + side buttons (one orange).
  g.fillStyle = '#3c3e42';
  for (const [sx, sy] of [[0.16, 0.14], [0.84, 0.14], [0.16, 0.86], [0.84, 0.86]] as const) {
    g.beginPath(); g.arc(bx + bw * sx, by + bh * sy, S * 0.02, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#e8801a'; g.fillRect(bx - S * 0.02, by + bh * 0.5, S * 0.035, bh * 0.12);   // MODE
  g.fillStyle = '#3c3e42';
  g.fillRect(bx + bw - S * 0.015, by + bh * 0.22, S * 0.035, bh * 0.1);
  g.fillRect(bx + bw - S * 0.015, by + bh * 0.68, S * 0.035, bh * 0.1);

  // ---- bezel engraving: the TIME ZONE (top) + accents ----
  g.fillStyle = '#e8801a';
  g.font = `800 ${Math.round(S * 0.06)}px Arial,Helvetica,sans-serif`;
  g.fillText(c.z.label.toUpperCase().slice(0, 14), S / 2, by + bh * 0.085);
  g.fillStyle = '#c8ccd2';
  g.font = `700 ${Math.round(S * 0.026)}px Arial,sans-serif`;
  g.fillText('WATER  RESISTANT · 100 METERS', S / 2, by + bh * 0.155);
  g.fillText('8 LAP   MEMORY   STOPWATCH', S / 2, by + bh * 0.9);

  // ---- orange-framed greenish LCD ----
  const fr = br / 2;   // orange frame = ½ body
  const fx = S * 0.13, fy = S * 0.21, fw = S * 0.74, fh = S * 0.58;
  roundRect(g, fx, fy, fw, fh, fr); g.fillStyle = '#e8801a'; g.fill();
  const lx = fx + S * 0.018, ly = fy + S * 0.018, lw = fw - S * 0.036, lh = fh - S * 0.036;
  const lcdbg = g.createLinearGradient(0, ly, 0, ly + lh);
  lcdbg.addColorStop(0, '#cdd3c4'); lcdbg.addColorStop(1, '#b4baa8');
  roundRect(g, lx, ly, lw, lh, fr / 2); g.fillStyle = lcdbg; g.fill();   // LCD = ½ frame

  const on = '#1b1f16', off = 'rgba(30,36,20,0.10)';

  // IRONMAN TRIATHLON header.
  g.textBaseline = 'middle';
  g.fillStyle = '#2b6fb0'; g.font = `900 ${Math.round(S * 0.03)}px Arial,sans-serif`;
  g.textAlign = 'left'; g.fillText('IRONMAN', lx + lw * 0.06, ly + lh * 0.1);
  g.fillStyle = '#23271d'; g.fillText(' TRIATHLON', lx + lw * 0.06 + S * 0.11, ly + lh * 0.1);
  g.textAlign = 'center';

  // Top row: weekday (text) + MM.DD (7-seg, sized to fit the right half).
  const topY = ly + lh * 0.28;
  const wd = WEEKDAY3[cal.day] ?? '';
  const dateStr = `${pad(cal.mon)}.${pad(cal.date)}`;
  g.fillStyle = on; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.font = `900 ${Math.round(lh * 0.17)}px Arial,sans-serif`;
  g.fillText(wd, lx + lw * 0.07, topY);
  const dateH = Math.min(lh * 0.26, (lw * 0.5) / lcdWidth(dateStr, 1));
  drawLcd(g, dateStr, lx + lw * 0.94 - lcdWidth(dateStr, dateH), topY - dateH / 2, dateH, { on, off, thick: Math.max(1.5, dateH * 0.15) });

  // Label strip: CHR · CDR + signal bars.
  g.textAlign = 'left'; g.fillStyle = on; g.font = `800 ${Math.round(S * 0.024)}px Arial,sans-serif`;
  const labY = ly + lh * 0.56;
  g.fillText('CHR', lx + lw * 0.16, labY);
  g.fillText('CDR', lx + lw * 0.56, labY);
  for (let i = 0; i < 4; i++) g.fillRect(lx + lw * 0.8 + i * S * 0.014, labY - i * S * 0.006, S * 0.008, S * 0.006 + i * S * 0.006);
  g.strokeStyle = 'rgba(30,36,20,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(lx + lw * 0.05, labY + lh * 0.06); g.lineTo(lx + lw * 0.95, labY + lh * 0.06); g.stroke();

  // Bottom row: the time HH:MM.SS (big, sized to fit), with an "A" indicator.
  const timeStr = `${pad(t.h)}:${pad(t.m)}.${pad(t.s)}`;
  const bigH = Math.min(lh * 0.28, (lw * 0.9) / lcdWidth(timeStr, 1));
  const styBig: LcdStyle = { on, off, thick: Math.max(1.5, bigH * 0.15) };
  const startX = lx + lw * 0.5 - lcdWidth(timeStr, bigH) / 2;
  const baseY = ly + lh * 0.72;
  drawLcd(g, timeStr, startX, baseY, bigH, styBig, t.ms > 500);
  g.fillStyle = on; g.font = `800 ${Math.round(S * 0.024)}px Arial,sans-serif`;
  g.textAlign = 'center'; g.fillText('A', startX + lcdWidth(`${pad(t.h)}`, bigH) + bigH * 0.22, baseY - S * 0.008);
}

const def: FaceDef = { id: 'timeextreme', label: '⌚ Time-Extreme', short: 'TX-X', order: 17, fit: [1, 1], draw };
export default def;
