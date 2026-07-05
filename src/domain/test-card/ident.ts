// src/domain/test-card/ident — resolve a source's three identity channels.
//
// Deterministic: the same seed → the same shape / number / hue forever, so a
// source stays recognisable AFTER routing, on any preview surface. Name comes
// from the source label (order-prefix stripped); shape+number from a stable hash
// of the seed; hue from the authored colour (falls back to a hashed hue).

import { stripOrder } from '../../ui/sources/format.js';
import { SHAPE_ROSTER, type CardIdent, type ShapeKind } from './types.js';

/** FNV-1a — a cheap, stable string hash (no crypto needed for visual idents). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A stable hue in [0,360) from any seed — the colour fallback when unauthored. */
export function hashHue(seed: string): number {
  return hash(seed) % 360;
}

/** Extract a hue from a #rrggbb colour; 210 (LCARS blue) for anything unparseable. */
export function hueOf(hex: string | undefined): number {
  const m = hex ? /^#?([0-9a-f]{6})$/i.exec(hex.trim()) : null;
  if (!m) return 210;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (!d) return 210;
  let hh: number;
  if (max === r) hh = ((g - b) / d) % 6;
  else if (max === g) hh = (b - r) / d + 2;
  else hh = (r - g) / d + 4;
  return Math.round(((hh * 60) + 360) % 360);
}

/** Resolve name (text), hue (colour), shape + numeric ident (id/label hash). */
export function identFor(seed: string, color?: string): CardIdent {
  const h = hash(seed);
  const shape: ShapeKind = SHAPE_ROSTER[h % SHAPE_ROSTER.length]!;
  const num = (h % 999) + 1; // 1..999 — the burn-in tie-breaker for shape+hue collisions
  const hue = color ? hueOf(color) : h % 360;
  return { name: stripOrder(seed) || seed, hue, shape, num };
}
