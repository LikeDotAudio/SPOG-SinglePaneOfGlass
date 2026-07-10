// engineering — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-program';
export const fallback = '#646DCC';
export const glyph = `
    <g><animateTransform attributeName="transform" type="rotate" from="0 256 256" to="360 256 256" dur="9s" repeatCount="indefinite"/>
      <circle cx="256" cy="256" r="118" fill="none" stroke-width="52" stroke-dasharray="46 46.4"/>
      <circle cx="256" cy="256" r="74" fill="none" stroke-width="40"/></g>
    <circle cx="256" cy="256" r="30" stroke="none"><animate attributeName="opacity" values="1;.35;1" dur="2s" repeatCount="indefinite"/></circle>`;
