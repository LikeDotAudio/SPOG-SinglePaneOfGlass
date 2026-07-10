// wireless — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-audio';
export const fallback = '#FF9C63';
export const glyph = `
    <rect x="222" y="150" width="68" height="150" rx="34" stroke="none"/>
    <line x1="256" y1="300" x2="256" y2="360" stroke-width="16" stroke-linecap="round"/>
    <line x1="212" y1="374" x2="300" y2="374" stroke-width="16" stroke-linecap="round"/>
    <path d="M 330 176 a 118 118 0 0 1 0 148" fill="none" stroke-width="16" stroke-linecap="round" opacity=".8"><animate attributeName="opacity" values=".8;.2;.8" dur="1.6s" repeatCount="indefinite"/></path>
    <path d="M 372 140 a 176 176 0 0 1 0 220" fill="none" stroke-width="16" stroke-linecap="round" opacity=".5"><animate attributeName="opacity" values=".5;.1;.5" dur="1.6s" begin=".3s" repeatCount="indefinite"/></path>
    <path d="M 182 176 a 118 118 0 0 0 0 148" fill="none" stroke-width="16" stroke-linecap="round" opacity=".8"><animate attributeName="opacity" values=".8;.2;.8" dur="1.6s" repeatCount="indefinite"/></path>
    <path d="M 140 140 a 176 176 0 0 0 0 220" fill="none" stroke-width="16" stroke-linecap="round" opacity=".5"><animate attributeName="opacity" values=".5;.1;.5" dur="1.6s" begin=".3s" repeatCount="indefinite"/></path>`;
