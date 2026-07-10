// telemetry — icon glyph (inner SVG markup for the programmatic tile; fill/stroke
// inherit from the tile's <g>). One icon per file (glob-collected by icon-glyphs.ts).
export const token = '--state-ok';
export const fallback = '#39d98a';
export const glyph = `
    <line x1="92" y1="388" x2="420" y2="388" stroke-width="10" stroke-linecap="round" opacity=".4"/>
    <rect x="116" y="280" width="52" height="108" rx="8" stroke="none"><animate attributeName="y" values="280;170;300;280" dur="2.4s" repeatCount="indefinite"/><animate attributeName="height" values="108;218;88;108" dur="2.4s" repeatCount="indefinite"/></rect>
    <rect x="192" y="210" width="52" height="178" rx="8" stroke="none" opacity=".82"><animate attributeName="y" values="210;318;150;210" dur="2.4s" begin=".3s" repeatCount="indefinite"/><animate attributeName="height" values="178;70;238;178" dur="2.4s" begin=".3s" repeatCount="indefinite"/></rect>
    <rect x="268" y="300" width="52" height="88" rx="8" stroke="none"><animate attributeName="y" values="300;196;250;300" dur="2.4s" begin=".6s" repeatCount="indefinite"/><animate attributeName="height" values="88;192;138;88" dur="2.4s" begin=".6s" repeatCount="indefinite"/></rect>
    <rect x="344" y="240" width="52" height="148" rx="8" stroke="none" opacity=".82"><animate attributeName="y" values="240;180;322;240" dur="2.4s" begin=".9s" repeatCount="indefinite"/><animate attributeName="height" values="148;208;66;148" dur="2.4s" begin=".9s" repeatCount="indefinite"/></rect>`;
