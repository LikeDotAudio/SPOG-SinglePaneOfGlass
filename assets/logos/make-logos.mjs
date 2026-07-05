// assets/logos/make-logos.mjs — generates the SPOG.like.audio logo lockups,
// written next to this script.
//
//   node make-logos.mjs          → writes logo-horizontal.svg + logo-icon.svg
//
// Both marks share the neon DNA-helix motif (two phase-opposed sine strands,
// cyan + magenta, sampled every 1/120th of the run with base-pair rungs and
// endpoint dots on the extremes) inside LCARS chrome:
//   logo-horizontal (720×240) — helix left, top LCARS rail, SPOG wordmark
//   logo-icon       (240×240) — helix centred in a rounded LCARS panel with
//                               orange/lilac elbow accents; no wordmark
// Same authoring pattern as the icon generators (assets/icons/*/make-icons.mjs):
// the SVGs beside this script are its output — regenerate, don't hand-edit.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const CYAN = '#00FFFF', MAGENTA = '#FF00FF';
const f2 = (n) => n.toFixed(2);

/** The double-helix group: strands A/B (± amp around cx), 120 segments from
 *  yTop to yBot, a rung + dot pair every `segs/8`th of the run. The rung tint
 *  pattern (c c c m m c c m m) matches the original mark. */
function helix({ cx, amp, yTop, yBot, strokeW, rungW, dotR, glowId }) {
  const SEGS = 120, RUNGS = 8;
  const period = (yBot - yTop) / 2;                    // two full twists
  const xa = (y) => cx + amp * Math.sin((2 * Math.PI * (y - yTop)) / period);
  const xb = (y) => cx - amp * Math.sin((2 * Math.PI * (y - yTop)) / period);
  const strand = (fx) => Array.from({ length: SEGS + 1 }, (_, i) => {
    const y = yTop + (i * (yBot - yTop)) / SEGS;
    return `${i ? 'L' : 'M'}${f2(fx(y))},${f2(y)}`;
  }).join(' ');
  const rungTint = (k) => ['c', 'c', 'c', 'm', 'm', 'c', 'c', 'm', 'm'][k] === 'c' ? CYAN : MAGENTA;

  let lines = '', dots = '';
  for (let k = 0; k <= RUNGS; k++) {
    const y = yTop + (k * (yBot - yTop)) / RUNGS;
    lines += `<line x1="${f2(xa(y))}" y1="${f2(y)}" x2="${f2(xb(y))}" y2="${f2(y)}" stroke="${rungTint(k)}" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/>\n`;
    dots += `<circle cx="${f2(xa(y))}" cy="${f2(y)}" r="${dotR}" fill="${CYAN}"/><circle cx="${f2(xb(y))}" cy="${f2(y)}" r="${dotR}" fill="${MAGENTA}"/>`;
  }
  return `<g filter="url(#${glowId})">
    ${lines.trimEnd()}

    <path d="${strand(xa)}" fill="none" stroke="${CYAN}" stroke-width="${strokeW}" stroke-linecap="round"/>
    <path d="${strand(xb)}" fill="none" stroke="${MAGENTA}" stroke-width="${strokeW}" stroke-linecap="round"/>
    ${dots}
  </g>`;
}

const glow = (id, dev) => `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${dev}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;

// ── horizontal lockup: rail + helix + wordmark ───────────────────────────────
const horizontal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 240" width="720" height="240" role="img" aria-label="SPOG.like.audio">
  <defs>
    <radialGradient id="bgg2" cx="30%" cy="40%" r="90%">
      <stop offset="0%" stop-color="#10203c"/>
      <stop offset="85%" stop-color="#050a15"/>
    </radialGradient>
    ${glow('glow2', 2)}
  </defs>
  <rect x="0" y="0" width="720" height="240" rx="28" fill="url(#bgg2)"/>
  <!-- top LCARS rail -->
  <path d="M28 26 L600 26 A12 12 0 0 1 600 50 L28 50 A12 12 0 0 1 28 26 Z" fill="#FF9C00"/>
  <path d="M616 26 L692 26 A12 12 0 0 1 692 50 L616 50 A12 12 0 0 1 616 26 Z" fill="#FF9C63"/>
  ${helix({ cx: 130, amp: 42, yTop: 43.2, yBot: 196.8, strokeW: 5, dotR: 4, glowId: 'glow2' })}
  <!-- wordmark -->
  <text x="208" y="150" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="900" letter-spacing="4" fill="#e0f0ff">SPOG</text>
  <text x="212" y="190" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="#FF9C00">.LIKE<tspan fill="${CYAN}">.</tspan><tspan fill="#9fb6cc">AUDIO</tspan></text>
</svg>
`;

// ── icon: rounded LCARS panel + elbows + helix ───────────────────────────────
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="SPOG.like.audio">
  <defs>
    <radialGradient id="bgg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#1a2a4c"/>
      <stop offset="80%" stop-color="#050a15"/>
    </radialGradient>
    ${glow('glow', 2.2)}
  </defs>
  <!-- LCARS rounded panel -->
  <rect x="6" y="6" width="228" height="228" rx="46" ry="46" fill="url(#bgg)" stroke="rgba(255,255,255,0.10)"/>
  <!-- LCARS elbow accents: top-left orange, bottom-right lilac -->
  <path d="M6 70 L6 52 A46 46 0 0 1 52 6 L78 6 L78 26 L60 26 A34 34 0 0 0 26 60 L26 70 Z" fill="#FF9C00"/>
  <path d="M234 170 L234 188 A46 46 0 0 1 188 234 L162 234 L162 214 L180 214 A34 34 0 0 0 214 180 L214 170 Z" fill="#CC99CC"/>
  ${helix({ cx: 120, amp: 48, yTop: 38.4, yBot: 201.6, strokeW: 6, dotR: 4.4, glowId: 'glow' })}
</svg>
`;

writeFileSync(join(HERE, 'logo-horizontal.svg'), horizontal);
console.log('wrote logo-horizontal.svg');
writeFileSync(join(HERE, 'logo-icon.svg'), icon);
console.log('wrote logo-icon.svg');
