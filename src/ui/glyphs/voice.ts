// voice — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-alarm';
export const fallback = '#ff3366';
export const glyph = `
    <rect x="216" y="116" width="80" height="180" rx="40" stroke="none"/>
    <path d="M 176 238 a 80 80 0 0 0 160 0" fill="none" stroke-width="18" stroke-linecap="round"/>
    <line x1="256" y1="318" x2="256" y2="372" stroke-width="18" stroke-linecap="round"/>
    <line x1="210" y1="380" x2="302" y2="380" stroke-width="18" stroke-linecap="round"/>
    <path d="M 150 180 q -20 58 0 116 M 362 180 q 20 58 0 116" fill="none" stroke-width="12" stroke-linecap="round" opacity=".5">
      <animate attributeName="opacity" values=".5;.15;.5" dur="1.8s" repeatCount="indefinite"/></path>`;
