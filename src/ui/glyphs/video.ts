// video — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-video';
export const fallback = '#CC99CC';
export const glyph = `
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
      <animate attributeName="stroke-dashoffset" values="0;-136" dur="1.6s" repeatCount="indefinite" calcMode="linear"/></path>`;
