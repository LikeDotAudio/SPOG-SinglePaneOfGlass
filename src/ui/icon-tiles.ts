// src/ui/icon-tiles — PROGRAMMATIC icon tiles for the ICON face.
//
// The macOS-style squircle tiles are rendered at RUNTIME as data: SVG URLs —
// nothing is fetched or stored. The accent for each tile comes from the ACTIVE
// palette's semantic tokens (--sig-video/--sig-audio/--sig-program and the
// state trio), so switching palettes in Colour & Vision re-tints every tile.
// The template + glyph library mirror the offline generators (assets/icons/*/
// make-icons.mjs, assets/icons/chrome/make-icons.mjs) — those remain as authoring/export
// references; the app no longer reads their files.

// ── colour helpers (ports of the generator's shade / hueShift) ───────────────
const shade = (hex: string, f: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number): number => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
};

const hueShift = (hex: string, deg: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + deg + 360) % 360;
  const l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [R, G, B] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number): string => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(R)}${to(G)}${to(B)}`;
};

// ── glyph library — category glyphs + their accents come one-per-file from
// ./glyphs/ (GLYPH_TOKENS), assembled in icon-glyphs.ts alongside CHROME_GLYPHS.
import { GLYPHS, GLYPH_TOKENS } from './icon-glyphs.js';

// ── palette hookup: each icon's accent = a SEMANTIC token of the active palette
// (colour-scheme.ts writes these inline on <html>), so palette choices re-tint
// the tiles. Fallback hexes cover a cold start before the engine paints. Chrome
// tiles (glyphs in icon-glyphs-chrome.ts) keep their accents here; category
// icons carry theirs in ./glyphs/<id>.ts and merge in via GLYPH_TOKENS.
const CHROME_TOKENS: Record<string, [token: string, fallback: string]> = {
  'captains-log': ['--state-onair', '#ffaa00'],
  'chat':         ['--state-ok', '#39d98a'],
  'mqtt':         ['--sig-program', '#646DCC'],
  'chirality':    ['--sig-video', '#CC99CC'],
  'settings':     ['--sig-program', '#646DCC'],
  '1990s-view':   ['--sig-audio', '#FF9C63'],
  'academy':      ['--sig-audio', '#FF9C63'],
  'rights':       ['--state-onair', '#ffaa00'],
  'log-out':      ['--state-alarm', '#ff3b3b'],
  'menu':         ['--sig-program', '#646DCC'],
  'credits':      ['--sig-video', '#CC99CC'],
};
const TOKENS: Record<string, [token: string, fallback: string]> = { ...CHROME_TOKENS, ...GLYPH_TOKENS };

export const hasTile = (id: string): boolean => id in GLYPHS;

function accentFor(id: string): string {
  const [token, fallback] = TOKENS[id] ?? ['--sig-program', '#646DCC'];
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

// ── the squircle templates (verbatim geometry from the generators) ───────────
function tileSvg(accent: string, glyph: string): string {
  const hi = shade(accent, 0.98), lo = shade(accent, 0.38);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".18"/>
      <stop offset=".5" stop-color="#ffffff" stop-opacity=".04"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="gsh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#sheen)"/>
  <rect x="22" y="22" width="468" height="468" rx="102" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="3"/>
  <g filter="url(#gsh)" fill="#F4F8FF" stroke="#F4F8FF">${glyph}</g>
</svg>`;
}

function mouseTileSvg(accent: string, glyph: string): string {
  const hi = shade(hueShift(accent, 10), 1.18), lo = shade(accent, 0.5);
  const glow = shade(hueShift(accent, 35), 1.6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".26"/>
      <stop offset=".5" stop-color="#ffffff" stop-opacity=".07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="gsh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="halo" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="none" stroke="${glow}" stroke-width="10" filter="url(#halo)"/>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#sheen)"/>
  <rect x="22" y="22" width="468" height="468" rx="102" fill="none" stroke="${glow}" stroke-opacity=".65" stroke-width="4"/>
  <g filter="url(#gsh)" fill="#FFFFFF" stroke="#FFFFFF">${glyph}</g>
</svg>`;
}

/** Render tile `id` (normal or lit) with the ACTIVE palette accent → data: URL. */
export function tileDataUrl(id: string, hover = false): string | null {
  const glyph = GLYPHS[id];
  if (!glyph) return null;
  const svg = hover ? mouseTileSvg(accentFor(id), glyph) : tileSvg(accentFor(id), glyph);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
