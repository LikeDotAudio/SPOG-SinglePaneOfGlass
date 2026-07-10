// prompter — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-video';
export const fallback = '#CC99CC';
export const glyph = `
    <clipPath id="tp-clip"><rect x="136" y="154" width="240" height="152" rx="10"/></clipPath>
    <rect x="122" y="140" width="268" height="180" rx="20" fill="none" stroke-width="18"/>
    <g clip-path="url(#tp-clip)"><g>
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -160" dur="4s" repeatCount="indefinite" calcMode="linear"/>
      <line x1="156" y1="176" x2="356" y2="176" stroke-width="18" stroke-linecap="round"/>
      <line x1="156" y1="216" x2="326" y2="216" stroke-width="18" stroke-linecap="round" opacity=".8"/>
      <line x1="156" y1="256" x2="346" y2="256" stroke-width="18" stroke-linecap="round" opacity=".6"/>
      <line x1="156" y1="296" x2="306" y2="296" stroke-width="18" stroke-linecap="round" opacity=".8"/>
      <line x1="156" y1="336" x2="356" y2="336" stroke-width="18" stroke-linecap="round"/>
      <line x1="156" y1="376" x2="326" y2="376" stroke-width="18" stroke-linecap="round" opacity=".8"/>
      <line x1="156" y1="416" x2="346" y2="416" stroke-width="18" stroke-linecap="round" opacity=".6"/>
      <line x1="156" y1="456" x2="306" y2="456" stroke-width="18" stroke-linecap="round" opacity=".8"/>
    </g></g>
    <path d="M 236 392 l 20 -28 20 28 z" stroke="none"/><line x1="256" y1="368" x2="256" y2="330" stroke-width="14"/>`;
