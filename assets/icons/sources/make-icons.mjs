// Routes/Sources/icons/make-icons.mjs — generates the macOS-dock-style
// squircle icons for the SOURCE categories, written next to this script.
//
//   node make-icons.mjs   → writes <id>.svg + <id>.mouseover.svg (SVG ONLY — no rasters)
//
// The squircle template, tile builders and glyph libraries are shared with the
// DESTINATION generator; see assets/icons/lib/. This file keeps ONLY the
// SOURCE category manifest and hands it to writeIcons().

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeIcons } from '../lib/template.mjs';
import { G } from '../lib/glyphs.mjs';
import { GA } from '../lib/glyphs-animated.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── this folder's manifest: SOURCE categories ────────────────────────────────
const ICONS = [
  { id: 'sound',    label: 'SOUND',    accent: '#FF9C63', glyph: G.sound,    anim: GA.sound },
  { id: 'video',    label: 'VIDEO',    accent: '#C88BC8', glyph: G.video,    anim: GA.video },
  { id: 'streams',  label: 'STREAMS',  accent: '#646DCC', glyph: G.streams,  anim: GA.streams },
  { id: 'play',     label: 'PLAY',     accent: '#3FC1C9', glyph: G.play,     anim: GA.play },
  { id: 'prod',     label: 'PROD',     accent: '#C67825', glyph: G.prod,     anim: GA.prod },
  { id: 'graphics', label: 'GRAPHICS', accent: '#78A05A', glyph: G.graphics, anim: GA.graphics },
  { id: 'prompter', label: 'PROMPTER', accent: '#C99BD1', glyph: G.prompter, anim: GA.prompter },
  { id: 'people',   label: 'PEOPLE',   accent: '#FF9C63', glyph: G.people,   anim: GA.people },
  { id: 'portals',  label: 'PORTALS',  accent: '#46A06E', glyph: G.portals,  anim: GA.portals },
];

writeIcons(ICONS, HERE);
