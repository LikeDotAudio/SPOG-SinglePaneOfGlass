// src/editors/ifb/painters — the two canvas painters for one IFB strip: the
// talent confidence-feed waveform and the ducker-history trace. Pure drawing;
// no state, no DOM beyond the passed-in canvas.

/** Confidence-feed waveform — exactly what the earpiece hears. */
export function drawFeed(cv: HTMLCanvasElement, level: number, talk: number): void {
  const w = (cv.width = cv.clientWidth);
  const h = (cv.height = cv.clientHeight);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = talk ? 'rgba(255,120,120,.9)' : 'rgba(90,224,140,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const t = (x / w) * Math.PI * 2 * 6;
    const y =
      h / 2 +
      Math.sin(t + performance.now() * 0.004) * level * (h * 0.42) * (0.6 + Math.random() * 0.4);
    if (x) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

/** Ducker history — program gain over time while a talk key is held. */
export function drawDuck(cv: HTMLCanvasElement, hist: readonly number[]): void {
  const w = (cv.width = cv.clientWidth);
  const h = (cv.height = cv.clientHeight);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(80,110,150,.25)';
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(w, 6);
  ctx.stroke();
  ctx.strokeStyle = '#ffd400';
  ctx.lineWidth = 2;
  ctx.beginPath();
  hist.forEach((g, i) => {
    const x = (i / 120) * w;
    const y = h - 4 - g * (h - 10);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.stroke();
}
