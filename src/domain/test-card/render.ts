// src/domain/test-card/render — paint one square test frame into a canvas.
//
// Layout (1:1): top ⅔ = 75% SMPTE colour bars; a thin reverse-bar castellation;
// bottom = PLUGE strip. Over that: a source-colour border, a lower-third slate
// (name · format · #num · timecode) and a MOVING shape ident badge whose motion
// proves "live" and whose shape/colour/number prove "who". The frame number is
// the LOGICAL 100fps count (decoupled from render rate) — see audit §9.

import { ctx2d } from '../../ui/dom.js';
import { pathShape } from './shapes.js';
import type { CardSpec } from './types.js';

// 75% SMPTE bars (0.75 × 255 ≈ 191), left→right: white, yellow, cyan, green,
// magenta, red, blue. Standard reference — never tinted by the source colour.
const BARS = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'];
const CASTELLATION = ['#0000bf', '#131313', '#bf00bf', '#131313', '#00bfbf', '#131313', '#bfbfbf'];

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** HH:MM:SS:FF at `fps` frames/sec — FF cycles 00..(fps-1) (00-99 at 100p). */
function timecode(frame: number, fps: number): string {
  const ff = frame % fps;
  const secs = Math.floor(frame / fps);
  return `${pad2(Math.floor(secs / 3600) % 24)}:${pad2(Math.floor(secs / 60) % 60)}:${pad2(secs % 60)}:${pad2(ff)}`;
}

/** Paint the card. Sizes to the canvas's laid-out box (DPR-aware); draws in CSS px. */
export function drawCard(canvas: HTMLCanvasElement, spec: CardSpec, frame: number): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = canvas.clientWidth || 160;
  const ch = canvas.clientHeight || cw;
  const W = Math.round(cw * dpr);
  const H = Math.round(ch * dpr);
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = ctx2d(canvas);
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);

  const barsH = Math.round(ch * 0.66);
  const castH = Math.round(ch * 0.08);
  const bw = cw / 7;

  // Colour bars + castellation strip.
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = BARS[i]!;
    ctx.fillRect(Math.round(i * bw), 0, Math.ceil(bw), barsH);
    ctx.fillStyle = CASTELLATION[i]!;
    ctx.fillRect(Math.round(i * bw), barsH, Math.ceil(bw), castH);
  }
  // PLUGE: black field with sub-black / black / above-black pluge bars at right.
  const plugeY = barsH + castH;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, plugeY, cw, ch - plugeY);
  const pl = ['#000000', '#1d1d1d', '#2c2c2c'];
  const pw = cw * 0.06;
  pl.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(cw - pw * (3 - i), plugeY + 2, pw, ch - plugeY - 4);
  });

  drawSlate(ctx, cw, ch, spec, frame);
  drawIdent(ctx, cw, barsH, spec, frame);

  // Source-colour identity border (last, so it frames everything).
  ctx.strokeStyle = spec.color || '#4d94ff';
  ctx.lineWidth = Math.max(2, Math.round(cw * 0.02));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, cw - ctx.lineWidth, ch - ctx.lineWidth);
}

/** Lower-third slate: source-colour wash + name, format, #num and timecode. */
function drawSlate(ctx: CanvasRenderingContext2D, cw: number, ch: number, spec: CardSpec, frame: number): void {
  const h = Math.max(22, Math.round(ch * 0.18));
  const y = ch - h;
  ctx.fillStyle = `hsla(${spec.ident.hue},60%,22%,0.82)`;
  ctx.fillRect(0, y, cw, h);
  ctx.fillStyle = spec.color || '#4d94ff';
  ctx.fillRect(0, y, cw, Math.max(2, Math.round(ch * 0.012)));

  const big = Math.max(9, Math.round(ch * 0.09));
  const small = Math.max(7, Math.round(ch * 0.055));
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f4f8ff';
  ctx.font = `700 ${big}px ui-monospace,Menlo,Consolas,monospace`;
  ctx.fillText(spec.ident.name.slice(0, 18), Math.round(cw * 0.04), y + big + Math.round(h * 0.08));
  ctx.fillStyle = 'rgba(244,248,255,0.72)';
  ctx.font = `500 ${small}px ui-monospace,Menlo,Consolas,monospace`;
  ctx.fillText(`${spec.format.label} · #${spec.ident.num}`, Math.round(cw * 0.04), y + h - Math.round(h * 0.12));
  // Timecode, right-aligned.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7cff9b';
  ctx.font = `700 ${small}px ui-monospace,Menlo,Consolas,monospace`;
  ctx.fillText(timecode(frame, spec.format.fps), cw - Math.round(cw * 0.04), y + h - Math.round(h * 0.12));
  ctx.textAlign = 'left';
}

/** The moving shape ident badge — bounces over the bars, carrying shape+colour+num. */
function drawIdent(ctx: CanvasRenderingContext2D, cw: number, barsH: number, spec: CardSpec, frame: number): void {
  const r = Math.max(8, Math.round(cw * 0.07));
  const t = frame / spec.format.fps; // seconds of logical time
  const margin = r * 1.4;
  const cx = margin + (cw - 2 * margin) * (0.5 + 0.42 * Math.sin(t * 0.9));
  const cy = margin + (barsH - 2 * margin) * (0.5 + 0.42 * Math.sin(t * 1.37 + 1));

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = r * 0.5;
  pathShape(ctx, spec.ident.shape, cx, cy, r);
  ctx.fillStyle = spec.color || '#4d94ff';
  ctx.fill('evenodd');
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1.5, r * 0.13);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  // Numeric ident beside the shape.
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(r * 0.7)}px ui-monospace,Menlo,Consolas,monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText(String(spec.ident.num), cx + r * 1.25, cy);
  ctx.restore();
}
