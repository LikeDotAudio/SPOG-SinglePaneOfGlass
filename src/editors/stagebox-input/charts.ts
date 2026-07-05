// src/editors/stagebox-input/charts — the two pure canvas painters extracted from
// view: the PPM rolling 30s history plot and the HPF frequency response curve.
// Both take an explicit canvas + render locals (no closures) so view can thread
// its per-panel state through the call.

export function drawHist(cv: HTMLCanvasElement, hist: number[]): void {
  const w = (cv.width = cv.clientWidth);
  const h = (cv.height = cv.clientHeight);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(80,110,150,.18)';
  [0.25, 0.5, 0.75].forEach((p) => {
    const y = h - p * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  });
  ctx.beginPath();
  hist.forEach((v, i) => {
    const x = (i / 300) * w;
    const y = h - 3 - v * (h - 8);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.strokeStyle = '#39d353';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // red peak markers
  ctx.fillStyle = '#ff3b3b';
  hist.forEach((v, i) => {
    if (v > 0.95) ctx.fillRect((i / 300) * w, 2, 2, 6);
  });
}

// High-pass filter frequency response — log freq (20–20k) × gain (dB), with the
// roll-off set by the slope and the knee character by the window type.
export function drawHPF(cv: HTMLCanvasElement, fc: number, slope: number, win: string): void {
  if (!cv) return;
  const w = (cv.width = cv.clientWidth);
  const h = (cv.height = cv.clientHeight);
  if (!w || !h) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const lmin = Math.log10(20);
  const lmax = Math.log10(20000);
  const xOf = (freq: number): number => ((Math.log10(freq) - lmin) / (lmax - lmin)) * w;
  const dbTop = 6;
  const dbBot = -36;
  const yOf = (db: number): number => h - ((db - dbBot) / (dbTop - dbBot)) * h;
  ctx.font = '8px Courier New, monospace';
  ctx.strokeStyle = 'rgba(80,110,150,.16)';
  ctx.fillStyle = 'rgba(120,150,190,.6)';
  [-24, -12, 0].forEach((db) => {
    const y = yOf(db);
    ctx.beginPath();
    ctx.moveTo(22, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.fillText(db + '', 2, y - 2);
  });
  [100, 1000, 10000].forEach((freq) => {
    const x = xOf(freq);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.fillText(freq >= 1000 ? freq / 1000 + 'k' : '' + freq, x + 2, h - 2);
  });
  ctx.strokeStyle = 'rgba(111,200,240,.4)';
  ctx.beginPath();
  ctx.moveTo(xOf(fc), 0);
  ctx.lineTo(xOf(fc), h);
  ctx.stroke();
  const n = slope / 6;
  const ripple = win === 'Chebyshev' ? 1 : 0;
  const gentle = win === 'Bessel' ? 1 : 0;
  ctx.beginPath();
  for (let px = 22; px <= w; px++) {
    const freq = Math.pow(10, lmin + (px / w) * (lmax - lmin));
    let db = 20 * Math.log10(1 / Math.sqrt(1 + Math.pow(fc / freq, 2 * n)));
    const near = Math.exp(-Math.pow(Math.log10(freq / fc), 2) / 0.05);
    db += ripple * near * 2.5 - gentle * near * 1.5;
    const y = yOf(Math.max(dbBot, Math.min(dbTop, db)));
    if (px === 22) ctx.moveTo(px, y);
    else ctx.lineTo(px, y);
  }
  ctx.strokeStyle = '#6FC8F0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineTo(w, h);
  ctx.lineTo(22, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(111,200,240,.1)';
  ctx.fill();
  ctx.fillStyle = '#6FC8F0';
  ctx.font = 'bold 9px Courier New, monospace';
  ctx.fillText(`${win} · ${fc}Hz · ${slope}dB/oct`, 26, 11);
}
