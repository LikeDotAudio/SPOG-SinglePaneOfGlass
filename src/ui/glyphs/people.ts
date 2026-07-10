// people — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-audio';
export const fallback = '#FF9C63';
export const glyph = `
    <circle cx="212" cy="196" r="44" stroke="none" opacity=".65"><animate attributeName="opacity" values=".65;.3;.65" dur="3s" repeatCount="indefinite"/></circle>
    <path d="M 132 348 q 0 -84 80 -84 q 80 0 80 84 z" stroke="none" opacity=".65"><animate attributeName="opacity" values=".65;.3;.65" dur="3s" repeatCount="indefinite"/></path>
    <circle cx="300" cy="212" r="52" stroke="none"/>
    <path d="M 204 384 q 0 -96 96 -96 q 96 0 96 96 z" stroke="none"/>`;
