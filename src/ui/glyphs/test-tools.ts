// test-tools — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-onair';
export const fallback = '#ffaa00';
export const glyph = `
    <rect x="126" y="142" width="260" height="170" rx="16" fill="none" stroke-width="18"/>
    <line x1="256" y1="152" x2="256" y2="302" stroke-width="4" opacity=".4"/>
    <line x1="136" y1="227" x2="376" y2="227" stroke-width="4" opacity=".4"/>
    <path d="M 146 227 q 27 -66 55 0 t 55 0 t 55 0 t 55 0" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="40 18">
      <animate attributeName="stroke-dashoffset" values="0;-116" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="d" values="M 146 227 q 27 -66 55 0 t 55 0 t 55 0 t 55 0;M 146 227 q 27 66 55 0 t 55 0 t 55 0 t 55 0;M 146 227 q 27 -66 55 0 t 55 0 t 55 0 t 55 0"
        keyTimes="0;.5;1" dur="3.2s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></path>
    <circle cx="196" cy="356" r="16" stroke="none"/><circle cx="256" cy="356" r="16" stroke="none"/>
    <circle cx="316" cy="356" r="16" stroke="none"><animate attributeName="opacity" values="1;.3;1" dur="1.2s" repeatCount="indefinite"/></circle>`;
