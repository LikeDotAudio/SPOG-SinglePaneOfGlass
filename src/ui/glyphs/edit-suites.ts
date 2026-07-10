// edit-suites — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-ok';
export const fallback = '#39d98a';
export const glyph = `
    <g><animateTransform attributeName="transform" type="translate" values="0 0;96 0;96 0;0 0" keyTimes="0;.45;.55;1" dur="5s" repeatCount="indefinite"/>
      <path d="M 244 128 h 24 v 96 l -12 14 -12 -14 z" stroke="none"/></g>
    <rect x="128" y="256" width="256" height="44" rx="10" fill="none" stroke-width="12"/>
    <rect x="140" y="266" width="88" height="24" rx="6" stroke="none"/>
    <rect x="240" y="266" width="56" height="24" rx="6" stroke="none" opacity=".7"/>
    <rect x="128" y="322" width="256" height="44" rx="10" fill="none" stroke-width="12"/>
    <rect x="168" y="332" width="120" height="24" rx="6" stroke="none" opacity=".85"/>`;
