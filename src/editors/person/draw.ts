// src/editors/person/draw — the two canvas painters for the virtual channel
// strip: drawEq paints the 4-band EQ frequency-response curve, drawComp paints
// the compressor transfer curve (with threshold marker). Pure of the editor's
// closure — each takes the target canvas + current Strip state.

import { ctx2d } from '../../ui/dom.js';
import type { Strip } from './dsp.js';
import { eqResponse } from './dsp.js';

export function drawEq(eqCanvas: HTMLCanvasElement, s: Strip): void {
  const g = ctx2d(eqCanvas); if (!g) return;
  const w = eqCanvas.width = eqCanvas.clientWidth, h = eqCanvas.height = eqCanvas.clientHeight;
  g.clearRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1;
  [-12, -6, 0, 6, 12].forEach((db) => { const y = h / 2 - (db / 15) * (h / 2 - 6); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
  g.beginPath();
  for (let x = 0; x <= w; x++) {
    const f = 20 * Math.pow(1000, x / w);            // 20 Hz → 20 kHz log
    const db = eqResponse(s, f);
    const y = h / 2 - (db / 15) * (h / 2 - 6);
    x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.strokeStyle = s.eqOn && !s.bypass ? '#F2B74B' : '#3a4c68'; g.lineWidth = 2.5; g.stroke();
}

export function drawComp(compCanvas: HTMLCanvasElement, s: Strip): void {
  const g = ctx2d(compCanvas); if (!g) return;
  const w = compCanvas.width = compCanvas.clientWidth, h = compCanvas.height = compCanvas.clientHeight;
  g.clearRect(0, 0, w, h);
  const map = (db: number): number => (db + 60) / 60;                 // -60..0 → 0..1
  g.strokeStyle = 'rgba(255,255,255,.10)';
  g.beginPath(); g.moveTo(0, h); g.lineTo(w, 0); g.stroke();          // unity line
  const on = s.compOn && !s.bypass;
  g.beginPath();
  for (let x = 0; x <= w; x++) {
    const inDb = -60 + (x / w) * 60;
    const outDb = on && inDb > s.threshold ? s.threshold + (inDb - s.threshold) / s.ratio : inDb;
    const y = h - map(outDb) * h;
    x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.strokeStyle = on ? '#39d353' : '#3a4c68'; g.lineWidth = 2.5; g.stroke();
  if (on) { const tx = map(s.threshold) * w; g.strokeStyle = 'rgba(255,214,0,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(tx, 0); g.lineTo(tx, h); g.stroke(); }
}
