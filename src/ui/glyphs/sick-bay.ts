// sick-bay — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-alarm';
export const fallback = '#ff3b3b';
export const glyph = `
    <rect x="220" y="140" width="72" height="232" rx="16" stroke="none"/>
    <rect x="140" y="220" width="232" height="72" rx="16" stroke="none"/>
    <circle cx="256" cy="256" r="48" fill="#ff4444" stroke="none">
      <animate attributeName="opacity" values="1;.2;1" dur="1.1s" repeatCount="indefinite"/></circle>`;
