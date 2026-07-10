// prod — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-onair';
export const fallback = '#ffaa00';
export const glyph = `
    <rect x="128" y="238" width="256" height="130" rx="16" stroke="none"/>
    <g><animateTransform attributeName="transform" type="rotate" values="0 124 240;-14 124 240;0 124 240;0 124 240" keyTimes="0;.12;.24;1" dur="4s" repeatCount="indefinite"/>
    <path d="M 124 214 l 252 -50 14 54 -252 50 z" stroke="none" opacity=".85"/>
    <path d="M 160 206 l 30 -34 M 220 194 l 30 -34 M 280 182 l 30 -34 M 340 170 l 30 -34" stroke-width="14"/></g>`;
