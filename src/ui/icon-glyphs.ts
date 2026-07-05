// src/ui/icon-glyphs — the SVG glyph library for the programmatic ICON tiles.
//
// Extracted from icon-tiles.ts to keep that file small. Each entry is the
// inner markup for one tile, verbatim from the offline generators
// (assets/icons/*/make-icons.mjs) — those remain authoring/export references;
// the app renders these at runtime instead of reading their files.
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
    <rect x="212" y="206" width="180" height="150" rx="24" stroke="none"/>
    <path d="M 212 251 l -66 -42 v 134 l 66 -42 z" stroke="none"/>
    <circle cx="352" cy="240" r="16" fill="#ff4444" stroke="none">
      <animate attributeName="opacity" values="1;.12;1" dur="1.1s" repeatCount="indefinite"/>
    </circle>
    <path d="M 128 256 H 28" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="2 16 18 14">
      <animate attributeName="stroke-dashoffset" values="0;-100" dur="1.4s" repeatCount="indefinite" calcMode="linear"/></path>`,
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
  'captains-log': `
    <path d="M 256 160 q -50 -28 -108 -18 v 196 q 58 -10 108 18 z" fill-opacity=".8" stroke="none"/>
    <path d="M 256 160 q 50 -28 108 -18 v 196 q -58 -10 -108 18 z" stroke="none"/>
    <line x1="284" y1="196" x2="336" y2="188" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"><animate attributeName="opacity" values=".55;.15;.55" dur="3s" begin="0s" repeatCount="indefinite"/></line>
    <line x1="284" y1="232" x2="336" y2="224" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"><animate attributeName="opacity" values=".55;.15;.55" dur="3s" begin=".5s" repeatCount="indefinite"/></line>
    <line x1="284" y1="268" x2="336" y2="260" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"><animate attributeName="opacity" values=".55;.15;.55" dur="3s" begin="1s" repeatCount="indefinite"/></line>
    <path d="M 300 138 v 44 l 16 -12 16 12 v -50 q -16 2 -32 6 z" stroke="none" fill="#0a1326" opacity=".7"/>`,
  'chat': `
    <path d="M 128 160 h 190 q 22 0 22 22 v 84 q 0 22 -22 22 h -104 l -46 40 v -40 h -40 q -22 0 -22 -22 v -84 q 0 -22 22 -22 z" stroke="none" opacity=".75"><animate attributeName="opacity" values=".75;.4;.75" dur="2.6s" repeatCount="indefinite"/></path>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="2.6s" begin="1.3s" repeatCount="indefinite"/>
    <path d="M 230 250 h 154 q 22 0 22 22 v 62 q 0 22 -22 22 h -30 v 36 l -42 -36 h -82 q -22 0 -22 -22 v -62 q 0 -22 22 -22 z" stroke="none"/></g>`,
  'mqtt': `
    <circle cx="170" cy="256" r="34" stroke="none"/>
    <path d="M 204 256 h 60 M 264 256 q 40 0 40 -60 h 34 M 264 256 h 74 M 264 256 q 40 0 40 60 h 34" fill="none" stroke-width="16" stroke-linecap="round"/>
    <circle cx="372" cy="196" r="22" stroke="none" opacity=".85"><animate attributeName="opacity" values=".85;.2;.85" dur="1.8s" begin="0s" repeatCount="indefinite"/></circle>
    <circle cx="372" cy="256" r="22" stroke="none" opacity=".85"><animate attributeName="opacity" values=".85;.2;.85" dur="1.8s" begin=".6s" repeatCount="indefinite"/></circle>
    <circle cx="372" cy="316" r="22" stroke="none" opacity=".85"><animate attributeName="opacity" values=".85;.2;.85" dur="1.8s" begin="1.2s" repeatCount="indefinite"/></circle>`,
  'chirality': `
    <line x1="256" y1="150" x2="256" y2="362" stroke-width="10" stroke-dasharray="6 20" stroke-linecap="round"/>
    <path d="M 216 176 l -80 80 80 80 v -52 h 44 v -56 h -44 z" stroke="none" opacity=".8"><animate attributeName="opacity" values=".8;.25;.8" dur="2.8s" begin="0s" repeatCount="indefinite"/></path>
    <path d="M 296 176 l 80 80 -80 80 v -52 h -44 v -56 h 44 z" stroke="none"><animate attributeName="opacity" values="1;.25;1" dur="2.8s" begin="1.4s" repeatCount="indefinite"/></path>`,
  'settings': `
    <g><animateTransform attributeName="transform" type="rotate" from="0 256 256" to="360 256 256" dur="14s" repeatCount="indefinite"/>
    <path d="M 256 140 l 14 34 a 88 88 0 0 1 30 12 l 35 -12 20 34 -26 26 a 88 88 0 0 1 0 32 l 26 26 -20 34 -35 -12 a 88 88 0 0 1 -30 12 l -14 34 -14 -34 a 88 88 0 0 1 -30 -12 l -35 12 -20 -34 26 -26 a 88 88 0 0 1 0 -32 l -26 -26 20 -34 35 12 a 88 88 0 0 1 30 -12 z" stroke="none"/>
    <circle cx="256" cy="256" r="44" fill="#0a1326" stroke="none"/></g>`,
  'academy': `
    <path d="M 176 244 v 66 q 80 46 160 0 v -66 l -80 36 z" stroke="none" opacity=".8"/>
    <path d="M 256 148 L 408 214 256 280 104 214 z" stroke="none"/>
    <circle cx="256" cy="214" r="12" fill="#0a1326" stroke="none"/>
    <g><animateTransform attributeName="transform" type="rotate" values="0 400 214;7 400 214;-7 400 214;0 400 214" dur="3.4s" repeatCount="indefinite"/>
    <line x1="400" y1="222" x2="400" y2="304" stroke-width="12" stroke-linecap="round"/>
    <circle cx="400" cy="320" r="14" stroke="none"/></g>`,
  'rights': `
    <path d="M 256 132 l 118 44 v 92 q 0 96 -118 148 q -118 -52 -118 -148 v -92 z" fill="none" stroke-width="20" stroke-linejoin="round">
      <animate attributeName="stroke-opacity" values="1;.45;1" dur="2.6s" repeatCount="indefinite"/></path>
    <circle cx="256" cy="232" r="32" stroke="none"/>
    <path d="M 240 252 h 32 l 12 76 h -56 z" stroke="none"/>`,
  'log-out': `
    <path d="M 150 132 h 140 v 40 h -100 v 168 h 100 v 40 h -140 z" stroke="none"/>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;16 0;0 0" dur="1.8s" repeatCount="indefinite"/>
    <line x1="230" y1="256" x2="352" y2="256" stroke-width="24" stroke-linecap="round"/>
    <path d="M 330 196 l 70 60 -70 60 z" stroke="none"/></g>`,
  'menu': `
    <line x1="140" y1="176" x2="372" y2="176" stroke-width="34" stroke-linecap="round">
      <animate attributeName="x2" values="372;332;372" dur="2.8s" begin="0s" repeatCount="indefinite"/></line>
    <line x1="140" y1="256" x2="372" y2="256" stroke-width="34" stroke-linecap="round">
      <animate attributeName="x2" values="372;332;372" dur="2.8s" begin=".4s" repeatCount="indefinite"/></line>
    <line x1="140" y1="336" x2="372" y2="336" stroke-width="34" stroke-linecap="round">
      <animate attributeName="x2" values="372;332;372" dur="2.8s" begin=".8s" repeatCount="indefinite"/></line>`,
  'credits': `
    <path d="M 256 128 l 30 62 68 10 -49 48 12 68 -61 -32 -61 32 12 -68 -49 -48 68 -10 z" stroke="none">
      <animate attributeName="opacity" values="1;.55;1" dur="2.8s" repeatCount="indefinite"/></path>
    <line x1="176" y1="342" x2="336" y2="342" stroke-width="16" stroke-linecap="round" opacity=".8"/>
    <line x1="206" y1="378" x2="306" y2="378" stroke-width="16" stroke-linecap="round" opacity=".5"/>`,
  '1990s-view': `
    <rect x="122" y="150" width="268" height="212" rx="8" fill="none" stroke-width="14"/>
    <rect x="122" y="150" width="268" height="46" stroke="none"/>
    <rect x="348" y="162" width="24" height="22" fill="#0a1326" stroke="none"/>
    <line x1="196" y1="222" x2="196" y2="336" stroke-width="10"/>
    <line x1="270" y1="222" x2="270" y2="336" stroke-width="10"/>
    <line x1="148" y1="264" x2="364" y2="264" stroke-width="10"/>
    <line x1="148" y1="306" x2="364" y2="306" stroke-width="10"/>
    <rect x="278" y="270" width="30" height="28" stroke="none">
      <animate attributeName="x" values="278;204;204;150;150;278" keyTimes="0;.2;.4;.6;.8;1" dur="5s" repeatCount="indefinite"/>
      <animate attributeName="y" values="270;270;312;312;228;270" keyTimes="0;.2;.4;.6;.8;1" dur="5s" repeatCount="indefinite"/></rect>`,
};
