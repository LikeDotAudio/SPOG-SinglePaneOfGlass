// studios — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-video';
export const fallback = '#CC99CC';
export const glyph = `
    <rect x="96" y="214" width="176" height="128" rx="22" stroke="none"/>
    <path d="M 96 250 l -56 -34 v 96 l 56 -34 z" stroke="none"/>
    <circle cx="184" cy="278" r="40" fill="none" stroke-width="14"/>
    <circle cx="184" cy="278" r="12" fill="#ff4444" stroke="none"><animate attributeName="opacity" values="1;.2;1" dur="1.1s" repeatCount="indefinite"/></circle>
    <rect x="330" y="150" width="64" height="116" rx="32" stroke="none"/>
    <path d="M 306 244 a 56 56 0 0 0 112 0" fill="none" stroke-width="14" stroke-linecap="round"/>
    <line x1="362" y1="300" x2="362" y2="338" stroke-width="14" stroke-linecap="round"/>
    <line x1="326" y1="352" x2="398" y2="352" stroke-width="14" stroke-linecap="round"/>`;
