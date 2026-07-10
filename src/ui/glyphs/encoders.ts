// encoders — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-alarm';
export const fallback = '#ff3b3b';
export const glyph = `
    <path d="M 76 256 H 178" fill="none" stroke-width="20" stroke-dasharray="24 20">
      <animate attributeName="stroke-dashoffset" values="0;-88" dur="1.1s" repeatCount="indefinite" calcMode="linear"/></path>
    <circle cx="216" cy="256" r="34" stroke="none"/>
    <path d="M 244 232 L 396 128" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="20 24">
      <animate attributeName="stroke-dashoffset" values="0;-88" dur="1.1s" repeatCount="indefinite" calcMode="linear"/></path>
    <path d="M 252 256 H 436" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="20 24">
      <animate attributeName="stroke-dashoffset" values="0;-88" dur="1.1s" begin=".37s" repeatCount="indefinite" calcMode="linear"/></path>
    <path d="M 244 280 L 396 384" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="20 24">
      <animate attributeName="stroke-dashoffset" values="0;-88" dur="1.1s" begin=".73s" repeatCount="indefinite" calcMode="linear"/></path>`;
