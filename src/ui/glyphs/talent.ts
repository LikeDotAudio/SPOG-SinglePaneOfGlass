// talent — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-onair';
export const fallback = '#ffaa00';
export const glyph = `
    <circle cx="256" cy="182" r="122" fill="none" stroke-width="12" opacity=".45"><animate attributeName="r" values="122;138;122" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".45;.06;.45" dur="2.6s" repeatCount="indefinite"/></circle>
    <circle cx="256" cy="188" r="60" stroke="none"/>
    <path d="M 154 392 q 0 -114 102 -114 q 102 0 102 114 z" stroke="none"/>
    <circle cx="382" cy="112" r="22" stroke="none"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"/></circle>`;
