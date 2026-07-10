// floors — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--sig-video';
export const fallback = '#CC99CC';
export const glyph = `
    <line x1="108" y1="218" x2="300" y2="218" stroke-width="14" stroke-linecap="round" opacity=".6"/>
    <line x1="108" y1="300" x2="300" y2="300" stroke-width="14" stroke-linecap="round" opacity=".6"/>
    <line x1="108" y1="382" x2="300" y2="382" stroke-width="14" stroke-linecap="round" opacity=".6"/>
    <rect x="300" y="128" width="104" height="266" rx="14" fill="none" stroke-width="14"/>
    <rect x="316" y="314" width="72" height="64" rx="8" stroke="none" opacity=".45">
      <animate attributeName="y" values="314;314;150;150;314" keyTimes="0;.3;.55;.85;1" dur="6s" repeatCount="indefinite"/></rect>
    <g stroke="none">
      <animateTransform attributeName="transform" type="translate"
        values="-170 0;0 0;0 0;0 -164;0 -164;-170 -164;-170 -164" keyTimes="0;.25;.3;.55;.6;.85;1" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;.08;.8;.9;1" dur="6s" repeatCount="indefinite"/>
      <circle cx="352" cy="322" r="12"/><rect x="342" y="338" width="20" height="34" rx="9"/></g>`;
