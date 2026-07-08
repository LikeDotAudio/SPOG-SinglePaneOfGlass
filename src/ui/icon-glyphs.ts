// src/ui/icon-glyphs — the SVG glyph library for the programmatic ICON tiles.
//
// Extracted from icon-tiles.ts to keep that file small. Each entry is the
// inner markup for one tile, verbatim from the offline generators
// (assets/icons/*/make-icons.mjs) — those remain authoring/export references;
// the app renders these at runtime instead of reading their files.
import { CHROME_GLYPHS } from './icon-glyphs-chrome.js';

export const GLYPHS: Record<string, string> = {
  'control-rooms': `
    <rect x="126" y="140" width="260" height="164" rx="16" fill="none" stroke-width="20"/>
    <line x1="256" y1="150" x2="256" y2="294" stroke-width="12"/>
    <line x1="136" y1="222" x2="376" y2="222" stroke-width="12"/>
    <rect x="148" y="160" width="94" height="46" rx="6" stroke="none" opacity=".5">
      <animate attributeName="opacity" values=".5;0;.5;.5;0" keyTimes="0;.2;.4;.8;1" calcMode="discrete" dur="3.1s" repeatCount="indefinite"/></rect>
    <rect x="270" y="160" width="94" height="46" rx="6" stroke="none" opacity=".5">
      <animate attributeName="opacity" values="0;.5;0;.5" keyTimes="0;.3;.6;.85" calcMode="discrete" dur="2.7s" repeatCount="indefinite"/></rect>
    <rect x="148" y="238" width="94" height="46" rx="6" stroke="none" opacity=".5">
      <animate attributeName="opacity" values=".5;0;.5;0" keyTimes="0;.25;.55;.9" calcMode="discrete" dur="3.6s" repeatCount="indefinite"/></rect>
    <rect x="270" y="238" width="94" height="46" rx="6" stroke="none" opacity=".5">
      <animate attributeName="opacity" values="0;.5;0;.5;0" keyTimes="0;.15;.45;.7;.95" calcMode="discrete" dur="3.3s" repeatCount="indefinite"/></rect>
    <circle cx="166" cy="352" r="16" stroke="none"><animate attributeName="opacity" values="1;.25;1" dur="2s" begin="0s" repeatCount="indefinite"/></circle>
    <circle cx="226" cy="352" r="16" stroke="none"><animate attributeName="opacity" values="1;.25;1" dur="2s" begin=".5s" repeatCount="indefinite"/></circle>
    <circle cx="286" cy="352" r="16" stroke="none"><animate attributeName="opacity" values="1;.25;1" dur="2s" begin="1s" repeatCount="indefinite"/></circle>
    <circle cx="346" cy="352" r="16" stroke="none"><animate attributeName="opacity" values="1;.25;1" dur="2s" begin="1.5s" repeatCount="indefinite"/></circle>`,
  'floors': `
    <line x1="108" y1="218" x2="300" y2="218" stroke-width="14" stroke-linecap="round" opacity=".6"/>
    <line x1="108" y1="300" x2="300" y2="300" stroke-width="14" stroke-linecap="round" opacity=".6"/>
    <line x1="108" y1="382" x2="300" y2="382" stroke-width="14" stroke-linecap="round" opacity=".6"/>
    <rect x="300" y="128" width="104" height="266" rx="14" fill="none" stroke-width="14"/>
    <rect x="316" y="314" width="72" height="64" rx="8" stroke="none" opacity=".45">
      <animate attributeName="y" values="314;314;150;150;314" keyTimes="0;.3;.55;.85;1" dur="6s" repeatCount="indefinite"/></rect>
    <g stroke="none">
      <animateTransform attributeName="transform" type="translate"
        values="-170 0;0 0;0 0;0 -164;0 -164;-170 -164;-170 -164" keyTimes="0;.25;.3;.55;.6;.85;1" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;.08;.8;.9;1" dur="6s" repeatCount="indefinite"/>
      <circle cx="352" cy="322" r="12"/><rect x="342" y="338" width="20" height="34" rx="9"/></g>`,
  'encoders': `
    <path d="M 76 256 H 178" fill="none" stroke-width="20" stroke-dasharray="24 20">
      <animate attributeName="stroke-dashoffset" values="0;-88" dur="1.1s" repeatCount="indefinite" calcMode="linear"/></path>
    <circle cx="216" cy="256" r="34" stroke="none"/>
    <path d="M 244 232 L 396 128" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="20 24">
      <animate attributeName="stroke-dashoffset" values="0;-88" dur="1.1s" repeatCount="indefinite" calcMode="linear"/></path>
    <path d="M 252 256 H 436" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="20 24">
      <animate attributeName="stroke-dashoffset" values="0;-88" dur="1.1s" begin=".37s" repeatCount="indefinite" calcMode="linear"/></path>
    <path d="M 244 280 L 396 384" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="20 24">
      <animate attributeName="stroke-dashoffset" values="0;-88" dur="1.1s" begin=".73s" repeatCount="indefinite" calcMode="linear"/></path>`,
  'edit-suites': `
    <g><animateTransform attributeName="transform" type="translate" values="0 0;96 0;96 0;0 0" keyTimes="0;.45;.55;1" dur="5s" repeatCount="indefinite"/>
      <path d="M 244 128 h 24 v 96 l -12 14 -12 -14 z" stroke="none"/></g>
    <rect x="128" y="256" width="256" height="44" rx="10" fill="none" stroke-width="12"/>
    <rect x="140" y="266" width="88" height="24" rx="6" stroke="none"/>
    <rect x="240" y="266" width="56" height="24" rx="6" stroke="none" opacity=".7"/>
    <rect x="128" y="322" width="256" height="44" rx="10" fill="none" stroke-width="12"/>
    <rect x="168" y="332" width="120" height="24" rx="6" stroke="none" opacity=".85"/>`,
  'test-tools': `
    <rect x="126" y="142" width="260" height="170" rx="16" fill="none" stroke-width="18"/>
    <line x1="256" y1="152" x2="256" y2="302" stroke-width="4" opacity=".4"/>
    <line x1="136" y1="227" x2="376" y2="227" stroke-width="4" opacity=".4"/>
    <path d="M 146 227 q 27 -66 55 0 t 55 0 t 55 0 t 55 0" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="40 18">
      <animate attributeName="stroke-dashoffset" values="0;-116" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="d" values="M 146 227 q 27 -66 55 0 t 55 0 t 55 0 t 55 0;M 146 227 q 27 66 55 0 t 55 0 t 55 0 t 55 0;M 146 227 q 27 -66 55 0 t 55 0 t 55 0 t 55 0"
        keyTimes="0;.5;1" dur="3.2s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></path>
    <circle cx="196" cy="356" r="16" stroke="none"/><circle cx="256" cy="356" r="16" stroke="none"/>
    <circle cx="316" cy="356" r="16" stroke="none"><animate attributeName="opacity" values="1;.3;1" dur="1.2s" repeatCount="indefinite"/></circle>`,
  'people': `
    <circle cx="212" cy="196" r="44" stroke="none" opacity=".65"><animate attributeName="opacity" values=".65;.3;.65" dur="3s" repeatCount="indefinite"/></circle>
    <path d="M 132 348 q 0 -84 80 -84 q 80 0 80 84 z" stroke="none" opacity=".65"><animate attributeName="opacity" values=".65;.3;.65" dur="3s" repeatCount="indefinite"/></path>
    <circle cx="300" cy="212" r="52" stroke="none"/>
    <path d="M 204 384 q 0 -96 96 -96 q 96 0 96 96 z" stroke="none"/>`,
  'sound': `
    <rect x="232" y="126" width="92" height="158" rx="46" stroke="none"/>
    <path d="M 198 226 a 80 80 0 0 0 160 0" fill="none" stroke-width="18" stroke-linecap="round"/>
    <line x1="278" y1="308" x2="278" y2="352" stroke-width="18" stroke-linecap="round"/>
    <line x1="228" y1="368" x2="328" y2="368" stroke-width="18" stroke-linecap="round"/>
    <path d="M 158 190 a 70 70 0 0 0 0 128" fill="none" stroke-width="16" stroke-linecap="round"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" begin=".4s" repeatCount="indefinite"/></path>
    <path d="M 112 164 a 118 118 0 0 0 0 180" fill="none" stroke-width="16" stroke-linecap="round" opacity=".55"><animate attributeName="opacity" values=".55;.1;.55" dur="1.6s" begin="0s" repeatCount="indefinite"/></path>`,
  'video': `
    <path d="M 28 208 L 102 242" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 20" opacity=".9">
      <animate attributeName="stroke-dashoffset" values="0;-42" dur=".8s" begin="0s" repeatCount="indefinite" calcMode="linear"/></path>
    <path d="M 20 256 H 102" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 20" opacity=".9">
      <animate attributeName="stroke-dashoffset" values="0;-42" dur=".8s" begin=".27s" repeatCount="indefinite" calcMode="linear"/></path>
    <path d="M 28 304 L 102 270" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 20" opacity=".9">
      <animate attributeName="stroke-dashoffset" values="0;-42" dur=".8s" begin=".53s" repeatCount="indefinite" calcMode="linear"/></path>
    <rect x="180" y="206" width="180" height="150" rx="24" stroke="none"/>
    <path d="M 180 251 l -66 -42 v 134 l 66 -42 z" stroke="none"/>
    <circle cx="270" cy="281" r="66" fill="#ff4444" stroke="none">
      <animate attributeName="opacity" values="1;.15;1" dur="1.1s" repeatCount="indefinite"/></circle>
    <path d="M 360 281 H 492" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="30 18 2 18">
      <animate attributeName="stroke-dashoffset" values="0;-136" dur="1.6s" repeatCount="indefinite" calcMode="linear"/></path>`,
  'streams': `
    <g><animateTransform attributeName="transform" type="translate" values="0 0;-124 0" dur="2.6s" repeatCount="indefinite" calcMode="linear"/>
    <path d="M -54 190 q 31 -34 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round"/>
    <path d="M -54 256 q 31 -34 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round" opacity=".75"/>
    <path d="M -54 322 q 31 -34 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round" opacity=".5"/></g>`,
  'play': `
    <circle cx="256" cy="256" r="140" fill="none" stroke-width="22"/>
    <path d="M 216 186 l 116 70 -116 70 z" stroke="none">
      <animate attributeName="opacity" values="1;0;0" keyTimes="0;.5;.75" calcMode="discrete" dur="4s" repeatCount="indefinite"/></path>
    <g stroke="none"><rect x="206" y="188" width="34" height="136" rx="10"/><rect x="272" y="188" width="34" height="136" rx="10"/>
      <animate attributeName="opacity" values="0;1;0" keyTimes="0;.5;.75" calcMode="discrete" dur="4s" repeatCount="indefinite"/></g>
    <rect x="198" y="198" width="116" height="116" rx="14" stroke="none">
      <animate attributeName="opacity" values="0;0;1" keyTimes="0;.5;.75" calcMode="discrete" dur="4s" repeatCount="indefinite"/></rect>`,
  'prod': `
    <rect x="128" y="238" width="256" height="130" rx="16" stroke="none"/>
    <g><animateTransform attributeName="transform" type="rotate" values="0 124 240;-14 124 240;0 124 240;0 124 240" keyTimes="0;.12;.24;1" dur="4s" repeatCount="indefinite"/>
    <path d="M 124 214 l 252 -50 14 54 -252 50 z" stroke="none" opacity=".85"/>
    <path d="M 160 206 l 30 -34 M 220 194 l 30 -34 M 280 182 l 30 -34 M 340 170 l 30 -34" stroke-width="14"/></g>`,
  'graphics': `
    <rect x="178" y="128" width="204" height="204" rx="20" fill="none" stroke-width="16" opacity=".65"><animate attributeName="opacity" values=".65;.25;.65" dur="2.6s" repeatCount="indefinite"/></rect>
    <path d="M 196 146 l 168 168 M 196 208 l 106 106 M 258 146 l 106 106" stroke-width="10" opacity=".45"><animate attributeName="opacity" values=".45;.15;.45" dur="2.6s" repeatCount="indefinite"/></path>
    <rect x="128" y="180" width="204" height="204" rx="20" stroke="none"/>`,
  'prompter': `
    <clipPath id="tp-clip"><rect x="136" y="154" width="240" height="152" rx="10"/></clipPath>
    <rect x="122" y="140" width="268" height="180" rx="20" fill="none" stroke-width="18"/>
    <g clip-path="url(#tp-clip)"><g>
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -160" dur="4s" repeatCount="indefinite" calcMode="linear"/>
      <line x1="156" y1="176" x2="356" y2="176" stroke-width="18" stroke-linecap="round"/>
      <line x1="156" y1="216" x2="326" y2="216" stroke-width="18" stroke-linecap="round" opacity=".8"/>
      <line x1="156" y1="256" x2="346" y2="256" stroke-width="18" stroke-linecap="round" opacity=".6"/>
      <line x1="156" y1="296" x2="306" y2="296" stroke-width="18" stroke-linecap="round" opacity=".8"/>
      <line x1="156" y1="336" x2="356" y2="336" stroke-width="18" stroke-linecap="round"/>
      <line x1="156" y1="376" x2="326" y2="376" stroke-width="18" stroke-linecap="round" opacity=".8"/>
      <line x1="156" y1="416" x2="346" y2="416" stroke-width="18" stroke-linecap="round" opacity=".6"/>
      <line x1="156" y1="456" x2="306" y2="456" stroke-width="18" stroke-linecap="round" opacity=".8"/>
    </g></g>
    <path d="M 236 392 l 20 -28 20 28 z" stroke="none"/><line x1="256" y1="368" x2="256" y2="330" stroke-width="14"/>`,
  'portals': `
    <circle cx="256" cy="256" r="140" fill="none" stroke-width="20">
      <animate attributeName="opacity" values="1;.35;1" dur="2.4s" begin=".8s" repeatCount="indefinite"/>
      <animate attributeName="r" values="140;152;140" dur="2.4s" begin=".8s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .2 1;.4 0 .6 1"/></circle>
    <circle cx="256" cy="256" r="86" fill="none" stroke-width="18" opacity=".7">
      <animate attributeName="opacity" values=".7;.25;.7" dur="2.4s" begin=".4s" repeatCount="indefinite"/>
      <animate attributeName="r" values="86;102;86" dur="2.4s" begin=".4s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .2 1;.4 0 .6 1"/></circle>
    <circle cx="256" cy="256" r="34" stroke="none">
      <animate attributeName="opacity" values="1;.5;1" dur="2.4s" begin="0s" repeatCount="indefinite"/>
      <animate attributeName="r" values="34;48;34" dur="2.4s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .2 1;.4 0 .6 1"/></circle>`,
  // Studios hold both video stage boxes (cameras) and audio stage boxes (mics) →
  // a combined camera + microphone tile with a blinking record tally.
  'studios': `
    <rect x="96" y="214" width="176" height="128" rx="22" stroke="none"/>
    <path d="M 96 250 l -56 -34 v 96 l 56 -34 z" stroke="none"/>
    <circle cx="184" cy="278" r="40" fill="none" stroke-width="14"/>
    <circle cx="184" cy="278" r="12" fill="#ff4444" stroke="none"><animate attributeName="opacity" values="1;.2;1" dur="1.1s" repeatCount="indefinite"/></circle>
    <rect x="330" y="150" width="64" height="116" rx="32" stroke="none"/>
    <path d="M 306 244 a 56 56 0 0 0 112 0" fill="none" stroke-width="14" stroke-linecap="round"/>
    <line x1="362" y1="300" x2="362" y2="338" stroke-width="14" stroke-linecap="round"/>
    <line x1="326" y1="352" x2="398" y2="352" stroke-width="14" stroke-linecap="round"/>`,
  // Wireless — a mic capsule radiating RF on both sides.
  'wireless': `
    <rect x="222" y="150" width="68" height="150" rx="34" stroke="none"/>
    <line x1="256" y1="300" x2="256" y2="360" stroke-width="16" stroke-linecap="round"/>
    <line x1="212" y1="374" x2="300" y2="374" stroke-width="16" stroke-linecap="round"/>
    <path d="M 330 176 a 118 118 0 0 1 0 148" fill="none" stroke-width="16" stroke-linecap="round" opacity=".8"><animate attributeName="opacity" values=".8;.2;.8" dur="1.6s" repeatCount="indefinite"/></path>
    <path d="M 372 140 a 176 176 0 0 1 0 220" fill="none" stroke-width="16" stroke-linecap="round" opacity=".5"><animate attributeName="opacity" values=".5;.1;.5" dur="1.6s" begin=".3s" repeatCount="indefinite"/></path>
    <path d="M 182 176 a 118 118 0 0 0 0 148" fill="none" stroke-width="16" stroke-linecap="round" opacity=".8"><animate attributeName="opacity" values=".8;.2;.8" dur="1.6s" repeatCount="indefinite"/></path>
    <path d="M 140 140 a 176 176 0 0 0 0 220" fill="none" stroke-width="16" stroke-linecap="round" opacity=".5"><animate attributeName="opacity" values=".5;.1;.5" dur="1.6s" begin=".3s" repeatCount="indefinite"/></path>`,
  // Remotes — an uplink antenna sending ping waves.
  'remotes': `
    <rect x="196" y="356" width="120" height="26" rx="10" stroke="none"/>
    <line x1="256" y1="356" x2="256" y2="238" stroke-width="20" stroke-linecap="round"/>
    <circle cx="256" cy="214" r="28" stroke="none"/>
    <path d="M 180 208 a 110 110 0 0 1 152 0" fill="none" stroke-width="16" stroke-linecap="round" opacity=".85"><animate attributeName="opacity" values=".85;.2;.85" dur="1.5s" repeatCount="indefinite"/></path>
    <path d="M 146 170 a 160 160 0 0 1 220 0" fill="none" stroke-width="16" stroke-linecap="round" opacity=".5"><animate attributeName="opacity" values=".5;.1;.5" dur="1.5s" begin=".3s" repeatCount="indefinite"/></path>`,
  'sick-bay': `
    <rect x="220" y="140" width="72" height="232" rx="16" stroke="none"/>
    <rect x="140" y="220" width="232" height="72" rx="16" stroke="none"/>
    <circle cx="256" cy="256" r="48" fill="#ff4444" stroke="none">
      <animate attributeName="opacity" values="1;.2;1" dur="1.1s" repeatCount="indefinite"/></circle>`,
  ...CHROME_GLYPHS,
};
