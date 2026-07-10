// play — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-ok';
export const fallback = '#39d98a';
export const glyph = `
    <circle cx="256" cy="256" r="140" fill="none" stroke-width="22"/>
    <path d="M 216 186 l 116 70 -116 70 z" stroke="none">
      <animate attributeName="opacity" values="1;0;0" keyTimes="0;.5;.75" calcMode="discrete" dur="4s" repeatCount="indefinite"/></path>
    <g stroke="none"><rect x="206" y="188" width="34" height="136" rx="10"/><rect x="272" y="188" width="34" height="136" rx="10"/>
      <animate attributeName="opacity" values="0;1;0" keyTimes="0;.5;.75" calcMode="discrete" dur="4s" repeatCount="indefinite"/></g>
    <rect x="198" y="198" width="116" height="116" rx="14" stroke="none">
      <animate attributeName="opacity" values="0;0;1" keyTimes="0;.5;.75" calcMode="discrete" dur="4s" repeatCount="indefinite"/></rect>`;
