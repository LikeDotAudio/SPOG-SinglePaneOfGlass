// src/ui/icon-face — the ICON face resolver (docs/Audit/Icon-View-Aesthetic-Audit.md).
//
// The FACE axis (colour-scheme.ts, html[data-face]="lcars"|"icons") swaps the LCARS
// chrome for macOS-style dock tiles. Tiles are rendered PROGRAMMATICALLY
// (src/ui/icon-tiles.ts) as data: SVG URLs in the ACTIVE palette's accents —
// nothing fetched, nothing stored — and every stamped element re-tints live when
// the palette changes (colour-scheme-change event).
//
// A label without a glyph in the library simply never gets `has-face-icon`, so it
// keeps its LCARS pill even in icon face — degrade to text, never to a hole.

import { tileDataUrl, hasTile } from './icon-tiles.js';

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Group RENAMES (e.g. "STUDIOS" → "STUDIO") orphaned the glyph keys, which are
// keyed by the original names. IRREGULAR renames map explicitly here; the regular
// singular→plural case (studio→studios, encoder→encoders, control-room→
// control-rooms…) is handled by the `+ 's'` fallback in iconId().
const ALIASES: Record<string, string> = {
  'studio-spaces': 'studios',
  production: 'prod',
  player: 'play',
  testing: 'test-tools',
};
/** Resolve a label to a glyph id: explicit alias → exact id → pluralized id. */
const iconId = (label: string): string => {
  const s = slug(label);
  if (ALIASES[s]) return ALIASES[s];
  if (hasTile(s)) return s;
  if (hasTile(`${s}s`)) return `${s}s`;   // singular label → plural glyph key
  return s;
};

export type IconKind = 'src' | 'dest' | 'chrome';

// Every stamped element, so a palette change can re-tint the whole face.
const STAMPED = new Map<HTMLElement, string>();

function paint(target: HTMLElement, id: string): void {
  const url = tileDataUrl(id);
  const hover = tileDataUrl(id, true);
  if (!url || !hover) return;
  target.style.setProperty('--face-icon', `url("${url}")`);
  target.style.setProperty('--face-icon-hover', `url("${hover}")`);
  target.classList.add('has-face-icon');
}

/** Stamp an element with the tile for `label` (kind kept for call-site clarity —
 *  the glyph namespace is shared). No-op when no glyph exists for the label. */
export function stampIcon(target: HTMLElement, _kind: IconKind, label: string): void {
  const id = iconId(label);
  if (!hasTile(id)) return;
  STAMPED.set(target, id);
  paint(target, id);
}

// Palette switched → re-render every tile in the new accents. Detached elements
// are dropped from the registry as they're encountered.
document.addEventListener('colour-scheme-change', () => {
  for (const [el, id] of STAMPED) {
    if (!el.isConnected) { STAMPED.delete(el); continue; }
    paint(el, id);
  }
});
