// src/editors/audio-monitor/painters — the loudness-history + Lissajous canvas
// painters driven by the audio-monitor animation loop (view.ts).

// Loudness-over-time plot, with the −23 LUFS broadcast target line.
export function drawLoud(cv: HTMLCanvasElement, hist: number[]): void {
  const w = (cv.width = cv.clientWidth);
  const h = (cv.height = cv.clientHeight);
  const ctx = cv.getContext('2d');
  if (!ctx || !w || !h) return;
  ctx.clearRect(0, 0, w, h);
  const lo = -40;
  const hi = -8;
  const y = (v: number): number => h - ((v - lo) / (hi - lo)) * h;
  // gridlines + labels
  ctx.font = '8px Courier New, monospace';
  [-12, -18, -23, -30].forEach((v) => {
    const yy = y(v);
    ctx.strokeStyle = v === -23 ? 'rgba(57,211,83,.45)' : 'rgba(80,110,150,.18)';
    ctx.beginPath();
    ctx.moveTo(20, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
    ctx.fillStyle = v === -23 ? 'rgba(120,235,150,.8)' : 'rgba(120,150,190,.6)';
    ctx.fillText(String(v), 1, yy + 3);
  });
  ctx.beginPath();
  hist.forEach((v, i) => {
    const x = 20 + (i / 240) * (w - 20);
    const yy = y(v);
    i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
  });
  ctx.strokeStyle = '#6FC8F0';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

export function drawLiss(cv: HTMLCanvasElement, corr: number, frame: number, amp: number): void {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const w = cv.width;
  const h = cv.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(80,110,150,.25)';
  ctx.beginPath();
  ctx.moveTo(w / 2, 4);
  ctx.lineTo(w / 2, h - 4);
  ctx.moveTo(4, h / 2);
  ctx.lineTo(w - 4, h / 2);
  ctx.stroke();
  ctx.strokeStyle = corr < 0 ? 'rgba(255,90,90,.85)' : 'rgba(120,235,150,.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const a = (0.5 + amp * 0.5) * (w / 2 - 8);
  const spread = (1 - Math.abs(corr)) * 0.9;
  for (let i = 0; i <= 60; i++) {
    const t = (i / 60) * Math.PI * 2;
    const l = Math.sin(t + frame * 0.06);
    const r = Math.sin(t + frame * 0.06 + spread * Math.PI * (corr < 0 ? 1 : 0.3));
    // rotate L/R into X/Y (45°): the classic audio Lissajous
    const x = w / 2 + (l - r) * a * 0.5;
    const yv = h / 2 - (l + r) * a * 0.5;
    i ? ctx.lineTo(x, yv) : ctx.moveTo(x, yv);
  }
  ctx.stroke();
}
