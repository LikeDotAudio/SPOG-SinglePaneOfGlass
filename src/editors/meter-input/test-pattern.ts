// src/editors/meter-input/test-pattern — the offline SMPTE colour-bars generator.
// Split from live-input.ts: a pure ImageData painter (no closure coupling) that
// proves the scope pipeline end-to-end without any real source.
//
// standard SMPTE colour bars (SMPTE ECR 1-1978)
// Static: top 2/3 = seven 75% colour bars; a reverse "castellation" strip; then
// the -I / 100 % white / +Q patches and the PLUGE (-4 % · 0 · +4 %) at the bottom.
export function drawTestPattern(gctx: CanvasRenderingContext2D, AW: number, AH: number): void {
  const topH = Math.round(AH * 2 / 3), midH = Math.round(AH / 12), botY = topH + midH, botH = AH - botY, bw = AW / 7;
  const top = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'];
  top.forEach((c, i) => { gctx.fillStyle = c; gctx.fillRect(i * bw, 0, bw + 1, topH); });
  const mid = ['#0000bf', '#131313', '#bf00bf', '#131313', '#00bfbf', '#131313', '#bfbfbf'];
  mid.forEach((c, i) => { gctx.fillStyle = c; gctx.fillRect(i * bw, topH, bw + 1, midH); });
  // Bottom row in 28ths: -I, white, +Q, black, then PLUGE (-4 % · 0 · +4 %), black.
  const seg: Array<[number, string]> = [
    [5, '#00214c'], [5, '#ffffff'], [5, '#32006a'], [1, '#0a0a0a'],
    [1, '#000000'], [1, '#0a0a0a'], [1, '#141414'], [9, '#0a0a0a'],
  ];
  let x = 0;
  for (const [u, c] of seg) { const w = (u / 28) * AW; gctx.fillStyle = c; gctx.fillRect(x, botY, w + 1, botH); x += w; }
}
