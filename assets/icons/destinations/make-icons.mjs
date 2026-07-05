// Routes/Destinations/icons/make-icons.mjs — generates the macOS-dock-style
// squircle icons for the DESTINATION categories, written next to this script.
//
//   node make-icons.mjs   → writes <id>.svg + <id>.mouseover.svg (SVG ONLY — no rasters)
//
// The squircle template, tile builders and glyph libraries are shared with the
// SOURCE generator; see assets/icons/lib/. This file keeps ONLY the
// DESTINATION category manifest and hands it to writeIcons().

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeIcons } from '../lib/template.mjs';
import { G } from '../lib/glyphs.mjs';
import { GA } from '../lib/glyphs-animated.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── this folder's manifest: DESTINATION categories ───────────────────────────
const ICONS = [
  { id: 'control-rooms', label: 'CONTROL ROOMS', accent: '#646DCC', glyph: G.controlRooms, anim: GA.controlRooms },
  { id: 'floors',        label: 'FLOORS', accent: '#A06EB4', glyph: G.floors, anim: GA.floors },
  { id: 'encoders',      label: 'ENCODERS', accent: '#FF3366', glyph: G.encoders, anim: GA.encoders },
  { id: 'edit-suites',   label: 'EDIT SUITES', accent: '#3FC1C9', glyph: G.editSuites, anim: GA.editSuites },
  { id: 'test-tools',    label: 'TEST TOOLS', accent: '#C67825', glyph: G.testTools, anim: GA.testTools },
  { id: 'people',        label: 'PEOPLE', accent: '#78A05A', glyph: G.people, anim: GA.people },
];

writeIcons(ICONS, HERE);
