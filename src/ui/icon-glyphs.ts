// src/ui/icon-glyphs — assembles the GLYPHS namespace for the programmatic ICON
// tiles. Source/destination category icons live ONE-PER-FILE in ./glyphs/<id>.ts
// (glob-collected below, so adding an icon is "drop a file"); each exports its
// inner SVG `glyph` markup plus its accent `token`/`fallback`. The console CHROME
// glyphs stay in icon-glyphs-chrome.ts and are merged into the same namespace.
import { CHROME_GLYPHS } from './icon-glyphs-chrome.js';

interface GlyphModule { glyph: string; token?: string; fallback?: string }
const modules = import.meta.glob<GlyphModule>('./glyphs/*.ts', { eager: true });

export const GLYPHS: Record<string, string> = { ...CHROME_GLYPHS };
// Accent token per icon, co-located with its glyph file (chrome tokens live in
// icon-tiles.ts). icon-tiles.ts merges this over its chrome map.
export const GLYPH_TOKENS: Record<string, [token: string, fallback: string]> = {};

for (const [path, mod] of Object.entries(modules)) {
  const id = path.slice(path.lastIndexOf('/') + 1).replace(/\.ts$/, '');   // filename = glyph id
  GLYPHS[id] = mod.glyph;
  if (mod.token && mod.fallback) GLYPH_TOKENS[id] = [mod.token, mod.fallback];
}
