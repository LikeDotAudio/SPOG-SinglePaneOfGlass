// remotes — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-onair';
export const fallback = '#ffaa00';
export const glyph = `
    <rect x="196" y="356" width="120" height="26" rx="10" stroke="none"/>
    <line x1="256" y1="356" x2="256" y2="238" stroke-width="20" stroke-linecap="round"/>
    <circle cx="256" cy="214" r="28" stroke="none"/>
    <path d="M 180 208 a 110 110 0 0 1 152 0" fill="none" stroke-width="16" stroke-linecap="round" opacity=".85"><animate attributeName="opacity" values=".85;.2;.85" dur="1.5s" repeatCount="indefinite"/></path>
    <path d="M 146 170 a 160 160 0 0 1 220 0" fill="none" stroke-width="16" stroke-linecap="round" opacity=".5"><animate attributeName="opacity" values=".5;.1;.5" dur="1.5s" begin=".3s" repeatCount="indefinite"/></path>`;
