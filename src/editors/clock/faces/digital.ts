// src/editors/clock/faces/digital — big red LED read-out (honours the resolution).
import { type FaceDef, type FaceCtx, zoneTime, formatTime, roundRect } from './shared.js';

function draw(g: CanvasRenderingContext2D, S: number, c: FaceCtx): void {
  const t = zoneTime(c.z);
  const cx = S / 2, cy = S / 2;
  g.clearRect(0, 0, S, S);
  const pw = S * 0.92, ph = S * 0.52, x = cx - pw / 2, y = cy - ph / 2;
  g.fillStyle = '#050505'; roundRect(g, x, y, pw, ph, ph * 0.12); g.fill();
  g.fillStyle = '#7d8ba0';
  g.font = `700 ${Math.round(S * 0.07)}px 'Courier New',monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(c.z.label.toUpperCase(), cx, y + ph * 0.2);
  const size = c.res === 'hm' ? 0.28 : c.res === 'hms' ? 0.2 : 0.148;
  g.fillStyle = '#ff2f2f'; g.shadowColor = '#ff2f2f'; g.shadowBlur = S * 0.05;
  g.font = `800 ${Math.round(S * size)}px 'Courier New',Consolas,monospace`;
  g.fillText(formatTime(t, c.res), cx, cy + ph * 0.14);
  g.shadowBlur = 0;
}

const def: FaceDef = { id: 'digital', label: '◷ Digital', short: 'H:M', order: 10, fit: [0.92, 0.52], draw };
export default def;
