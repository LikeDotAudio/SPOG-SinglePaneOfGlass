// src/ui/console/colour-scheme — the COLOUR & VISION barrel + launcher.
// Strategy: docs/Colours and shapes.md. Sibling to chirality.ts: a persistent
// toolbar button (a painter's palette, docked beside the handedness toggle) opens a
// full LCARS editor that drives three orthogonal accessibility axes, each a `data-*`
// attribute on <html>:
//
//   data-vision  low | normal | high    — contrast / luminance (dark-adapted ↔ hi-contrast)
//   data-chroma  full | grey | mono      — hue → desaturated → single-hue amber phosphor
//   data-cvd     <palette id>            — the active colour palette (see PALETTES)
//
// Vision + chroma are pure CSS (a composed root filter, see lcars.css). The PALETTE
// is TS-driven: PALETTES (colour-palettes.ts) is the single source of truth, and the
// engine (colour-engine.ts) writes each palette's six semantic tokens INLINE onto
// <html>, so adding a palette is a one-line edit — no CSS. Persisted per device and
// painted BEFORE first render (applyStored…) so the console lands in the chosen mode
// with no flash — exactly like chirality. This file wires the launcher + re-exports.

import { el } from '../dom.js';
import { applyStoredColourScheme } from './colour-engine.js';
import { openColourEditor } from './colour-editor.js';

// Public surface — the split is internal; importers keep using ./colour-scheme.js.
export type { Vision, Chroma, Face, ColourScheme } from './colour-palettes.js';
export { getScheme, setScheme, applyStoredColourScheme } from './colour-engine.js';
export { openColourEditor } from './colour-editor.js';

// A painter's-palette glyph as inline SVG: monochrome (currentColor, so it honours
// grey/mono modes), and renders without an emoji font. Paint wells are cut-outs.
const PALETTE_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
  '<path fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'd="M12 3C7 3 3 6.6 3 11c0 3.3 2.5 5.5 5.5 5.5.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1' +
  '-.2-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H13c3.3 0 6-2.4 6-5.3C19 5.9 15.9 3 12 3z"/>' +
  '<circle cx="7.4" cy="11" r="1.1" fill="currentColor"/>' +
  '<circle cx="9.6" cy="7.4" r="1.1" fill="currentColor"/>' +
  '<circle cx="13.2" cy="6.7" r="1.1" fill="currentColor"/>' +
  '<circle cx="16" cy="9" r="1.1" fill="currentColor"/></svg>';

/** Mount the palette launcher (docked beside the chirality toggle). */
export function initColourScheme(): void {
  applyStoredColourScheme();
  const btn = el('button', { class: 'palette-toggle', type: 'button', title: 'Colour & Vision modes' });
  btn.innerHTML = PALETTE_SVG;
  btn.setAttribute('aria-label', 'Colour & Vision modes');
  btn.addEventListener('click', openColourEditor);
  document.body.appendChild(btn);
}
