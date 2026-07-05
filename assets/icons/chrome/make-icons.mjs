// assets/make-icons.mjs — generates the macOS-dock-style squircle icons for the
// console CHROME buttons (the fixed UI furniture, not Routes data), written next
// to this script.
//
//   node make-icons.mjs          → writes <id>.svg + <id>.mouseover.svg (SVG ONLY — no rasters)
//
// Same tile template as assets/icons/*/make-icons.mjs (squircle rx 108, accent
// gradient, sheen, white glyph). The MOUSEOVER variant is the lit hover state:
// gradient hue-lifted and a hue-shifted accent halo — no text in the tile.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── shared squircle template ─────────────────────────────────────────────────
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
};

const hueShift = (hex, deg) => {
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
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(R)}${to(G)}${to(B)}`;
};

function tile(accent, glyph) {
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
</svg>\n`;
}

function mouseTile(accent, glyph) {
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
</svg>\n`;
}

// ── glyphs (each drawn in the 512 canvas, centred ~128..384) ─────────────────
const G = {
  // Captain's Log — the journal: open book, bookmark ribbon, entry lines.
  captainsLog: `
    <path d="M 256 160 q -50 -28 -108 -18 v 196 q 58 -10 108 18 z" fill-opacity=".8" stroke="none"/>
    <path d="M 256 160 q 50 -28 108 -18 v 196 q -58 -10 -108 18 z" stroke="none"/>
    <line x1="284" y1="196" x2="336" y2="188" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"/>
    <line x1="284" y1="232" x2="336" y2="224" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"/>
    <line x1="284" y1="268" x2="336" y2="260" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"/>
    <path d="M 300 138 v 44 l 16 -12 16 12 v -50 q -16 2 -32 6 z" stroke="none" fill="#0a1326" opacity=".7"/>`,
  // Chat — paired speech bubbles.
  chat: `
    <path d="M 128 160 h 190 q 22 0 22 22 v 84 q 0 22 -22 22 h -104 l -46 40 v -40 h -40 q -22 0 -22 -22 v -84 q 0 -22 22 -22 z" stroke="none" opacity=".75"/>
    <path d="M 230 250 h 154 q 22 0 22 22 v 62 q 0 22 -22 22 h -30 v 36 l -42 -36 h -82 q -22 0 -22 -22 v -62 q 0 -22 22 -22 z" stroke="none"/>`,
  // MQTT — the broker node fanning a topic tree.
  mqtt: `
    <circle cx="170" cy="256" r="34" stroke="none"/>
    <path d="M 204 256 h 60 M 264 256 q 40 0 40 -60 h 34 M 264 256 h 74 M 264 256 q 40 0 40 60 h 34" fill="none" stroke-width="16" stroke-linecap="round"/>
    <circle cx="372" cy="196" r="22" stroke="none" opacity=".85"/>
    <circle cx="372" cy="256" r="22" stroke="none" opacity=".85"/>
    <circle cx="372" cy="316" r="22" stroke="none" opacity=".85"/>`,
  // Chirality — mirrored hands (two opposing chevrons around an axis).
  chirality: `
    <line x1="256" y1="150" x2="256" y2="362" stroke-width="10" stroke-dasharray="6 20" stroke-linecap="round"/>
    <path d="M 216 176 l -80 80 80 80 v -52 h 44 v -56 h -44 z" stroke="none" opacity=".8"/>
    <path d="M 296 176 l 80 80 -80 80 v -52 h -44 v -56 h 44 z" stroke="none"/>`,
  // Settings — the gear.
  settings: `
    <path d="M 256 140 l 14 34 a 88 88 0 0 1 30 12 l 35 -12 20 34 -26 26 a 88 88 0 0 1 0 32 l 26 26 -20 34 -35 -12 a 88 88 0 0 1 -30 12 l -14 34 -14 -34 a 88 88 0 0 1 -30 -12 l -35 12 -20 -34 26 -26 a 88 88 0 0 1 0 -32 l -26 -26 20 -34 35 12 a 88 88 0 0 1 30 -12 z" stroke="none"/>
    <circle cx="256" cy="256" r="44" fill="#0a1326" stroke="none"/>`,
  // Academy — the school: mortarboard cap, tassel, cap band.
  academy: `
    <path d="M 176 244 v 66 q 80 46 160 0 v -66 l -80 36 z" stroke="none" opacity=".8"/>
    <path d="M 256 148 L 408 214 256 280 104 214 z" stroke="none"/>
    <circle cx="256" cy="214" r="12" fill="#0a1326" stroke="none"/>
    <line x1="400" y1="222" x2="400" y2="304" stroke-width="12" stroke-linecap="round"/>
    <circle cx="400" cy="320" r="14" stroke="none"/>`,
  // 1990s view — the retro OS window: title bar, close box, crosspoint grid.
  nineties: `
    <rect x="122" y="150" width="268" height="212" rx="8" fill="none" stroke-width="14"/>
    <rect x="122" y="150" width="268" height="46" stroke="none"/>
    <rect x="348" y="162" width="24" height="22" fill="#0a1326" stroke="none"/>
    <line x1="196" y1="222" x2="196" y2="336" stroke-width="10"/>
    <line x1="270" y1="222" x2="270" y2="336" stroke-width="10"/>
    <line x1="148" y1="264" x2="364" y2="264" stroke-width="10"/>
    <line x1="148" y1="306" x2="364" y2="306" stroke-width="10"/>
    <rect x="278" y="270" width="30" height="28" stroke="none"/>`,
};

// ── manifest: console chrome buttons ─────────────────────────────────────────
const ICONS = [
  { id: 'captains-log', accent: '#C2B74B', glyph: G.captainsLog },
  { id: 'chat',         accent: '#39D353', glyph: G.chat },
  { id: 'mqtt',         accent: '#8E6AC8', glyph: G.mqtt },
  { id: 'chirality',    accent: '#6FC8F0', glyph: G.chirality },
  { id: 'settings',     accent: '#7E93B5', glyph: G.settings },
  { id: '1990s-view',   accent: '#3FC1C9', glyph: G.nineties },
  { id: 'academy',      accent: '#FF9C63', glyph: G.academy },
];

for (const ic of ICONS) {
  writeFileSync(join(HERE, `${ic.id}.svg`), tile(ic.accent, ic.glyph));
  writeFileSync(join(HERE, `${ic.id}.mouseover.svg`), mouseTile(ic.accent, ic.glyph));
  console.log('wrote', `${ic.id}.svg`, '+', `${ic.id}.mouseover.svg`);
}
