// control-rooms — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-program';
export const fallback = '#646DCC';
export const glyph = `
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
    <circle cx="346" cy="352" r="16" stroke="none"><animate attributeName="opacity" values="1;.25;1" dur="2s" begin="1.5s" repeatCount="indefinite"/></circle>`;
