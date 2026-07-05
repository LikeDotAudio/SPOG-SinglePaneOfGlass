// src/editors/clock/paint — the date read-out + per-face canvas draw. dateParts
// is pure; createPaint closes over the shared context (C) for dpr + the face
// registry and owns the paint cache (lastDate) that index's rAF loop resets.

import { type Zone, pad } from './faces/shared.js';
import type { ClockCtx, Device } from './windows.js';

// ---- date read-out ----------------------------------------------------------
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
export function dateParts(): { yyyy: string; mm: string; dd: string; day: string } {
  const d = new Date();
  return { yyyy: String(d.getFullYear()), mm: pad(d.getMonth() + 1), dd: pad(d.getDate()), day: WEEKDAYS[d.getDay()] ?? '' };
}

export interface PaintApi {
  paintDate: (cells: NonNullable<Device['cells']>) => void;
  drawFace: (d: Device, now: number) => void;
  resetDateCache: () => void;
}

export function createPaint(C: ClockCtx): PaintApi {
  let lastDate = '';
  const paintDate = (cells: NonNullable<Device['cells']>): void => {
    const d = dateParts();
    const key = `${d.yyyy}${d.mm}${d.dd}${d.day}`;
    if (key === lastDate && cells.yyyy.textContent) return;
    lastDate = key;
    cells.yyyy.textContent = d.yyyy; cells.mm.textContent = d.mm; cells.dd.textContent = d.dd; cells.day.textContent = d.day;
  };
  const drawFace = (d: Device, now: number): void => {
    const cvs = d.cvs, g = d.g;
    if (!cvs || !g) return;
    const cw = cvs.clientWidth, ch = cvs.clientHeight;
    if (!cw || !ch) return;
    const bw = Math.round(cw * C.dpr), bh = Math.round(ch * C.dpr);
    if (cvs.width !== bw) cvs.width = bw;
    if (cvs.height !== bh) cvs.height = bh;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    const def = C.faceById(d.face ?? C.defaultFace);
    const [fw, fh] = def.fit;
    const S = Math.max(40, Math.min(cw / fw, ch / fh));
    const ox = (cw - S) / 2, oy = (ch - S) / 2;
    g.setTransform(C.dpr, 0, 0, C.dpr, ox * C.dpr, oy * C.dpr);
    def.draw(g, S, { z: d.zone as Zone, now, res: d.res ?? 'hms', state: (d.state ??= {}) });
  };
  const resetDateCache = (): void => { lastDate = ''; };
  return { paintDate, drawFace, resetDateCache };
}
