// src/domain/test-card/shapes — path the roster geometry onto a 2D context.
//
// Each drawer traces a shape centred at (cx,cy) with radius r into the CURRENT
// path (caller fills/strokes). Kept path-only so the ident badge can fill with
// the source colour and stroke white in one place (render.ts).

import type { ShapeKind } from './types.js';

function poly(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, n: number, rot: number): void {
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number): void {
  const inner = r * 0.42;
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? inner : r;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function plus(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const a = r * 0.38;
  ctx.moveTo(cx - a, cy - r);
  ctx.lineTo(cx + a, cy - r);
  ctx.lineTo(cx + a, cy - a);
  ctx.lineTo(cx + r, cy - a);
  ctx.lineTo(cx + r, cy + a);
  ctx.lineTo(cx + a, cy + a);
  ctx.lineTo(cx + a, cy + r);
  ctx.lineTo(cx - a, cy + r);
  ctx.lineTo(cx - a, cy + a);
  ctx.lineTo(cx - r, cy + a);
  ctx.lineTo(cx - r, cy - a);
  ctx.lineTo(cx - a, cy - a);
  ctx.closePath();
}

function chevron(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.moveTo(cx - r, cy - r * 0.6);
  ctx.lineTo(cx, cy - r * 0.05);
  ctx.lineTo(cx + r, cy - r * 0.6);
  ctx.lineTo(cx + r, cy - r * 0.05);
  ctx.lineTo(cx, cy + r * 0.55);
  ctx.lineTo(cx - r, cy - r * 0.05);
  ctx.closePath();
}

function bowtie(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.moveTo(cx - r, cy - r);
  ctx.lineTo(cx + r, cy + r);
  ctx.lineTo(cx + r, cy - r);
  ctx.lineTo(cx - r, cy + r);
  ctx.closePath();
}

/** Trace `kind` into the current path. Fill/stroke is the caller's job. */
export function pathShape(ctx: CanvasRenderingContext2D, kind: ShapeKind, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  switch (kind) {
    case 'circle': ctx.arc(cx, cy, r, 0, 2 * Math.PI); break;
    case 'ring':
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI, true);
      break;
    case 'square': ctx.rect(cx - r, cy - r, 2 * r, 2 * r); break;
    case 'triangleUp': poly(ctx, cx, cy, r, 3, -Math.PI / 2); break;
    case 'triangleDown': poly(ctx, cx, cy, r, 3, Math.PI / 2); break;
    case 'diamond': poly(ctx, cx, cy, r, 4, -Math.PI / 2); break;
    case 'pentagon': poly(ctx, cx, cy, r, 5, -Math.PI / 2); break;
    case 'hexagon': poly(ctx, cx, cy, r, 6, -Math.PI / 2); break;
    case 'star5': star(ctx, cx, cy, r, 5); break;
    case 'plus': plus(ctx, cx, cy, r); break;
    case 'chevron': chevron(ctx, cx, cy, r); break;
    case 'bowtie': bowtie(ctx, cx, cy, r); break;
  }
}
