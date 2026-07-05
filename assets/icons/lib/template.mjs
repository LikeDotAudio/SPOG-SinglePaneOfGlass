// assets/icons/lib/template.mjs — shared macOS-dock-style squircle icon
// template used by BOTH the SOURCE and DESTINATION icon generators.
// Exports the tile builders (shade/tile/hueShift/mouseTile) plus a writeIcons()
// helper that runs the shared write loop into a caller-supplied output dir.
//
// Style: Big-Sur-ish app tile — 512×512 squircle (rx ≈ 22.5%), vertical accent
// gradient, soft top sheen + inner highlight, white glyph with a soft shadow.
// The MOUSEOVER variant is the lit hover state: gradient hue-lifted and a
// hue-shifted accent halo glowing off the squircle. The mouseover SVGs are
// ANIMATED (SMIL, GA dict): each glyph performs its own job.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ── shared squircle template ─────────────────────────────────────────────────
export const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
};

export function tile(accent, glyph) {
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

// Rotate a hex colour's hue by `deg` — the glow is a hue-shifted accent, so the
// hover state reads as "energized", not just brighter.
export const hueShift = (hex, deg) => {
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

// The MOUSEOVER tile — the lit hover state of the same icon: hue-lifted gradient,
// a hue-shifted accent halo off the squircle, and the label on a bottom scrim.
export function mouseTile(accent, glyph) {
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
  <rect x="16" y="16" width="480" height="480" rx="108" fill="none" stroke="${glow}" stroke-width="10" filter="url(#halo)">
    <animate attributeName="stroke-width" values="10;18;10" dur="2s" repeatCount="indefinite"/>
    <animate attributeName="stroke-opacity" values="1;.55;1" dur="2s" repeatCount="indefinite"/>
  </rect>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#sheen)"/>
  <rect x="22" y="22" width="468" height="468" rx="102" fill="none" stroke="${glow}" stroke-opacity=".65" stroke-width="4"/>
  <g filter="url(#gsh)" fill="#FFFFFF" stroke="#FFFFFF">${glyph}</g>
</svg>\n`;
}

// Write every manifest entry's static + mouseover SVG into `outDir`.
export function writeIcons(ICONS, outDir) {
  for (const ic of ICONS) {
    writeFileSync(join(outDir, `${ic.id}.svg`), tile(ic.accent, ic.glyph));
    writeFileSync(join(outDir, `${ic.id}.mouseover.svg`), mouseTile(ic.accent, ic.anim ?? ic.glyph));
    console.log('wrote', `${ic.id}.svg`, '+', `${ic.id}.mouseover.svg`);
  }
}
