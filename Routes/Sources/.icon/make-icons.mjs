// Routes/Sources/.icon/make-icons.mjs — generates the macOS-dock-style
// squircle icons for the SOURCE categories, written next to this script.
//
//   node make-icons.mjs          → writes <id>.svg + <id>.mouseover.svg for every icon
//   node make-icons.mjs --png    → also renders both at 512×512 (puppeteer)
//
// Style: Big-Sur-ish app tile — 512×512 squircle (rx ≈ 22.5%), vertical accent
// gradient, soft top sheen + inner highlight, white glyph with a soft shadow.
// The MOUSEOVER variant is the lit hover state: gradient hue-lifted, a hue-shifted
// accent halo glowing off the squircle, and the category name overlaid on a
// bottom scrim (glowing to match).

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

function tile(accent, glyph) {
  const hi = shade(accent, 1.35), lo = shade(accent, 0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".28"/>
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

// The MOUSEOVER tile — the lit hover state of the same icon: hue-lifted gradient,
// a hue-shifted accent halo off the squircle, and the label on a bottom scrim.
function mouseTile(accent, glyph, label) {
  const hi = shade(hueShift(accent, 10), 1.55), lo = shade(accent, 0.7);
  const glow = shade(hueShift(accent, 35), 1.6);
  // Courier ≈ 0.6em/char + tracking — size the label to fit the 448px band.
  const fs = Math.min(56, Math.round(440 / (label.length * 0.66)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".38"/>
      <stop offset=".5" stop-color="#ffffff" stop-opacity=".07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="gsh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="halo" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <filter id="tglow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="${glow}" flood-opacity="0.95"/>
    </filter>
    <clipPath id="sq"><rect x="16" y="16" width="480" height="480" rx="108"/></clipPath>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="none" stroke="${glow}" stroke-width="10" filter="url(#halo)"/>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#sheen)"/>
  <rect x="22" y="22" width="468" height="468" rx="102" fill="none" stroke="${glow}" stroke-opacity=".65" stroke-width="4"/>
  <g filter="url(#gsh)" fill="#FFFFFF" stroke="#FFFFFF">${glyph}</g>
  <rect x="16" y="390" width="480" height="106" fill="#000" opacity=".3" clip-path="url(#sq)"/>
  <text x="256" y="454" text-anchor="middle" fill="#FFFFFF" filter="url(#tglow)"
    font-family="'Courier New',Consolas,monospace" font-weight="900" letter-spacing="3"
    font-size="${fs}">${label}</text>
</svg>\n`;
}

// ── glyphs (each drawn in the 512 canvas, centred ~128..384) ─────────────────
const G = {
  controlRooms: `
    <rect x="126" y="140" width="260" height="164" rx="16" fill="none" stroke-width="20"/>
    <line x1="256" y1="150" x2="256" y2="294" stroke-width="12"/>
    <line x1="136" y1="222" x2="376" y2="222" stroke-width="12"/>
    <circle cx="166" cy="352" r="16" stroke="none"/><circle cx="226" cy="352" r="16" stroke="none"/>
    <circle cx="286" cy="352" r="16" stroke="none"/><circle cx="346" cy="352" r="16" stroke="none"/>`,
  floors: `
    <rect x="140" y="146" width="232" height="52" rx="12" stroke="none"/>
    <rect x="140" y="222" width="232" height="52" rx="12" stroke="none" opacity=".75"/>
    <rect x="140" y="298" width="232" height="52" rx="12" stroke="none" opacity=".5"/>
    <circle cx="352" cy="172" r="12" fill="${'#0a1326'}" stroke="none"/>`,
  encoders: `
    <circle cx="186" cy="256" r="30" stroke="none"/>
    <path d="M 238 196 a 86 86 0 0 1 0 120" fill="none" stroke-width="22" stroke-linecap="round"/>
    <path d="M 286 158 a 140 140 0 0 1 0 196" fill="none" stroke-width="22" stroke-linecap="round" opacity=".7"/>
    <path d="M 330 120 a 194 194 0 0 1 0 272" fill="none" stroke-width="22" stroke-linecap="round" opacity=".4"/>`,
  editSuites: `
    <path d="M 244 128 h 24 v 96 l -12 14 -12 -14 z" stroke="none"/>
    <rect x="128" y="256" width="256" height="44" rx="10" fill="none" stroke-width="12"/>
    <rect x="140" y="266" width="88" height="24" rx="6" stroke="none"/>
    <rect x="240" y="266" width="56" height="24" rx="6" stroke="none" opacity=".7"/>
    <rect x="128" y="322" width="256" height="44" rx="10" fill="none" stroke-width="12"/>
    <rect x="168" y="332" width="120" height="24" rx="6" stroke="none" opacity=".85"/>`,
  testTools: `
    <rect x="126" y="142" width="260" height="170" rx="16" fill="none" stroke-width="18"/>
    <line x1="256" y1="152" x2="256" y2="302" stroke-width="4" opacity=".4"/>
    <line x1="136" y1="227" x2="376" y2="227" stroke-width="4" opacity=".4"/>
    <path d="M 146 227 q 27 -66 55 0 t 55 0 t 55 0 t 55 0" fill="none" stroke-width="14" stroke-linecap="round"/>
    <circle cx="196" cy="356" r="16" stroke="none"/><circle cx="256" cy="356" r="16" stroke="none"/>
    <circle cx="316" cy="356" r="16" stroke="none"/>`,
  people: `
    <circle cx="212" cy="196" r="44" stroke="none" opacity=".65"/>
    <path d="M 132 348 q 0 -84 80 -84 q 80 0 80 84 z" stroke="none" opacity=".65"/>
    <circle cx="300" cy="212" r="52" stroke="none"/>
    <path d="M 204 384 q 0 -96 96 -96 q 96 0 96 96 z" stroke="none"/>`,
  sound: `
    <path d="M 150 216 h 56 l 72 -60 v 200 l -72 -60 h -56 z" stroke="none"/>
    <path d="M 306 206 a 62 62 0 0 1 0 100" fill="none" stroke-width="20" stroke-linecap="round"/>
    <path d="M 342 176 a 108 108 0 0 1 0 160" fill="none" stroke-width="20" stroke-linecap="round" opacity=".6"/>`,
  video: `
    <rect x="120" y="176" width="200" height="160" rx="24" stroke="none"/>
    <path d="M 336 226 l 66 -42 v 144 l -66 -42 z" stroke="none"/>
    <circle cx="160" cy="152" r="10" fill="#ff5a5a" stroke="none"/>`,
  streams: `
    <path d="M 132 190 q 31 -34 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round"/>
    <path d="M 132 256 q 31 -34 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round" opacity=".75"/>
    <path d="M 132 322 q 31 -34 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round" opacity=".5"/>`,
  play: `
    <circle cx="256" cy="256" r="140" fill="none" stroke-width="22"/>
    <path d="M 216 186 l 116 70 -116 70 z" stroke="none"/>`,
  prod: `
    <rect x="128" y="238" width="256" height="130" rx="16" stroke="none"/>
    <path d="M 124 214 l 252 -50 14 54 -252 50 z" stroke="none" opacity=".85"/>
    <path d="M 160 206 l 30 -34 M 220 194 l 30 -34 M 280 182 l 30 -34 M 340 170 l 30 -34" stroke-width="14"/>`,
  graphics: `
    <rect x="178" y="128" width="204" height="204" rx="20" fill="none" stroke-width="16" opacity=".65"/>
    <path d="M 196 146 l 168 168 M 196 208 l 106 106 M 258 146 l 106 106" stroke-width="10" opacity=".45"/>
    <rect x="128" y="180" width="204" height="204" rx="20" stroke="none"/>`,
  prompter: `
    <rect x="122" y="140" width="268" height="180" rx="20" fill="none" stroke-width="18"/>
    <line x1="156" y1="192" x2="356" y2="192" stroke-width="18" stroke-linecap="round"/>
    <line x1="156" y1="232" x2="326" y2="232" stroke-width="18" stroke-linecap="round" opacity=".7"/>
    <line x1="156" y1="272" x2="346" y2="272" stroke-width="18" stroke-linecap="round" opacity=".45"/>
    <path d="M 236 392 l 20 -28 20 28 z" stroke="none"/><line x1="256" y1="368" x2="256" y2="330" stroke-width="14"/>`,
  portals: `
    <circle cx="256" cy="256" r="140" fill="none" stroke-width="20"/>
    <circle cx="256" cy="256" r="86" fill="none" stroke-width="18" opacity=".7"/>
    <circle cx="256" cy="256" r="34" stroke="none"/>`,
};

// ── this folder's manifest: SOURCE categories ────────────────────────────────
const ICONS = [
  { id: 'sound',    label: 'SOUND',    accent: '#C88BC8', glyph: G.sound },
  { id: 'video',    label: 'VIDEO',    accent: '#FF9C63', glyph: G.video },
  { id: 'streams',  label: 'STREAMS',  accent: '#646DCC', glyph: G.streams },
  { id: 'play',     label: 'PLAY',     accent: '#3FC1C9', glyph: G.play },
  { id: 'prod',     label: 'PROD',     accent: '#C67825', glyph: G.prod },
  { id: 'graphics', label: 'GRAPHICS', accent: '#78A05A', glyph: G.graphics },
  { id: 'prompter', label: 'PROMPTER', accent: '#C99BD1', glyph: G.prompter },
  { id: 'people',   label: 'PEOPLE',   accent: '#FF9C63', glyph: G.people },
  { id: 'portals',  label: 'PORTALS',  accent: '#46A06E', glyph: G.portals },
];

for (const ic of ICONS) {
  writeFileSync(join(HERE, `${ic.id}.svg`), tile(ic.accent, ic.glyph));
  writeFileSync(join(HERE, `${ic.id}.mouseover.svg`), mouseTile(ic.accent, ic.glyph, ic.label));
  console.log('wrote', `${ic.id}.svg`, '+', `${ic.id}.mouseover.svg`);
}

if (process.argv.includes('--png')) {
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512 });
  for (const ic of ICONS) {
    const variants = [
      [`${ic.id}.png`, tile(ic.accent, ic.glyph)],
      [`${ic.id}.mouseover.png`, mouseTile(ic.accent, ic.glyph, ic.label)],
    ];
    for (const [name, svg] of variants) {
      await page.goto(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
      await page.screenshot({ path: join(HERE, name), omitBackground: true });
      console.log('wrote', name);
    }
  }
  await browser.close();
}
