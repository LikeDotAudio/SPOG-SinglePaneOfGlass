// graphics — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-program';
export const fallback = '#646DCC';
export const glyph = `
    <rect x="178" y="128" width="204" height="204" rx="20" fill="none" stroke-width="16" opacity=".65"><animate attributeName="opacity" values=".65;.25;.65" dur="2.6s" repeatCount="indefinite"/></rect>
    <path d="M 196 146 l 168 168 M 196 208 l 106 106 M 258 146 l 106 106" stroke-width="10" opacity=".45"><animate attributeName="opacity" values=".45;.15;.45" dur="2.6s" repeatCount="indefinite"/></path>
    <rect x="128" y="180" width="204" height="204" rx="20" stroke="none"/>`;
