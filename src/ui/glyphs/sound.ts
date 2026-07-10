// sound — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-audio';
export const fallback = '#FF9C63';
export const glyph = `
    <rect x="232" y="126" width="92" height="158" rx="46" stroke="none"/>
    <path d="M 198 226 a 80 80 0 0 0 160 0" fill="none" stroke-width="18" stroke-linecap="round"/>
    <line x1="278" y1="308" x2="278" y2="352" stroke-width="18" stroke-linecap="round"/>
    <line x1="228" y1="368" x2="328" y2="368" stroke-width="18" stroke-linecap="round"/>
    <path d="M 158 190 a 70 70 0 0 0 0 128" fill="none" stroke-width="16" stroke-linecap="round"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" begin=".4s" repeatCount="indefinite"/></path>
    <path d="M 112 164 a 118 118 0 0 0 0 180" fill="none" stroke-width="16" stroke-linecap="round" opacity=".55"><animate attributeName="opacity" values=".55;.1;.55" dur="1.6s" begin="0s" repeatCount="indefinite"/></path>`;
