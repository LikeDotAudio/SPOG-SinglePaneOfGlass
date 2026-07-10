// portals — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-ok';
export const fallback = '#39d98a';
export const glyph = `
    <circle cx="256" cy="256" r="140" fill="none" stroke-width="20">
      <animate attributeName="opacity" values="1;.35;1" dur="2.4s" begin=".8s" repeatCount="indefinite"/>
      <animate attributeName="r" values="140;152;140" dur="2.4s" begin=".8s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .2 1;.4 0 .6 1"/></circle>
    <circle cx="256" cy="256" r="86" fill="none" stroke-width="18" opacity=".7">
      <animate attributeName="opacity" values=".7;.25;.7" dur="2.4s" begin=".4s" repeatCount="indefinite"/>
      <animate attributeName="r" values="86;102;86" dur="2.4s" begin=".4s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .2 1;.4 0 .6 1"/></circle>
    <circle cx="256" cy="256" r="34" stroke="none">
      <animate attributeName="opacity" values="1;.5;1" dur="2.4s" begin="0s" repeatCount="indefinite"/>
      <animate attributeName="r" values="34;48;34" dur="2.4s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .2 1;.4 0 .6 1"/></circle>`;
