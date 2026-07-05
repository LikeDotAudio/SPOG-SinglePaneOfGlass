// src/ui/icon-glyphs-chrome — glyphs for the console CHROME tiles (Captain's
// Log, chat, MQTT, chirality, settings, academy, rights, log-out, menu,
// credits, 1990s view). Split from icon-glyphs.ts (source/destination
// category glyphs) to honour the 200-line rule; icon-glyphs.ts spread-merges
// this map into the single GLYPHS namespace consumed by icon-tiles.ts.
export const CHROME_GLYPHS: Record<string, string> = {
  'captains-log': `
    <path d="M 256 160 q -50 -28 -108 -18 v 196 q 58 -10 108 18 z" fill-opacity=".8" stroke="none"/>
    <path d="M 256 160 q 50 -28 108 -18 v 196 q -58 -10 -108 18 z" stroke="none"/>
    <line x1="284" y1="196" x2="336" y2="188" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"><animate attributeName="opacity" values=".55;.15;.55" dur="3s" begin="0s" repeatCount="indefinite"/></line>
    <line x1="284" y1="232" x2="336" y2="224" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"><animate attributeName="opacity" values=".55;.15;.55" dur="3s" begin=".5s" repeatCount="indefinite"/></line>
    <line x1="284" y1="268" x2="336" y2="260" stroke-width="10" stroke-linecap="round" stroke="#0a1326" opacity=".55"><animate attributeName="opacity" values=".55;.15;.55" dur="3s" begin="1s" repeatCount="indefinite"/></line>
    <path d="M 300 138 v 44 l 16 -12 16 12 v -50 q -16 2 -32 6 z" stroke="none" fill="#0a1326" opacity=".7"/>`,
  'chat': `
    <path d="M 128 160 h 190 q 22 0 22 22 v 84 q 0 22 -22 22 h -104 l -46 40 v -40 h -40 q -22 0 -22 -22 v -84 q 0 -22 22 -22 z" stroke="none" opacity=".75"><animate attributeName="opacity" values=".75;.4;.75" dur="2.6s" repeatCount="indefinite"/></path>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="2.6s" begin="1.3s" repeatCount="indefinite"/>
    <path d="M 230 250 h 154 q 22 0 22 22 v 62 q 0 22 -22 22 h -30 v 36 l -42 -36 h -82 q -22 0 -22 -22 v -62 q 0 -22 22 -22 z" stroke="none"/></g>`,
  'mqtt': `
    <circle cx="170" cy="256" r="34" stroke="none"/>
    <path d="M 204 256 h 60 M 264 256 q 40 0 40 -60 h 34 M 264 256 h 74 M 264 256 q 40 0 40 60 h 34" fill="none" stroke-width="16" stroke-linecap="round"/>
    <circle cx="372" cy="196" r="22" stroke="none" opacity=".85"><animate attributeName="opacity" values=".85;.2;.85" dur="1.8s" begin="0s" repeatCount="indefinite"/></circle>
    <circle cx="372" cy="256" r="22" stroke="none" opacity=".85"><animate attributeName="opacity" values=".85;.2;.85" dur="1.8s" begin=".6s" repeatCount="indefinite"/></circle>
    <circle cx="372" cy="316" r="22" stroke="none" opacity=".85"><animate attributeName="opacity" values=".85;.2;.85" dur="1.8s" begin="1.2s" repeatCount="indefinite"/></circle>`,
  'chirality': `
    <line x1="256" y1="150" x2="256" y2="362" stroke-width="10" stroke-dasharray="6 20" stroke-linecap="round"/>
    <path d="M 216 176 l -80 80 80 80 v -52 h 44 v -56 h -44 z" stroke="none" opacity=".8"><animate attributeName="opacity" values=".8;.25;.8" dur="2.8s" begin="0s" repeatCount="indefinite"/></path>
    <path d="M 296 176 l 80 80 -80 80 v -52 h -44 v -56 h 44 z" stroke="none"><animate attributeName="opacity" values="1;.25;1" dur="2.8s" begin="1.4s" repeatCount="indefinite"/></path>`,
  'settings': `
    <g><animateTransform attributeName="transform" type="rotate" from="0 256 256" to="360 256 256" dur="14s" repeatCount="indefinite"/>
    <path d="M 256 140 l 14 34 a 88 88 0 0 1 30 12 l 35 -12 20 34 -26 26 a 88 88 0 0 1 0 32 l 26 26 -20 34 -35 -12 a 88 88 0 0 1 -30 12 l -14 34 -14 -34 a 88 88 0 0 1 -30 -12 l -35 12 -20 -34 26 -26 a 88 88 0 0 1 0 -32 l -26 -26 20 -34 35 12 a 88 88 0 0 1 30 -12 z" stroke="none"/>
    <circle cx="256" cy="256" r="44" fill="#0a1326" stroke="none"/></g>`,
  'academy': `
    <path d="M 176 244 v 66 q 80 46 160 0 v -66 l -80 36 z" stroke="none" opacity=".8"/>
    <path d="M 256 148 L 408 214 256 280 104 214 z" stroke="none"/>
    <circle cx="256" cy="214" r="12" fill="#0a1326" stroke="none"/>
    <g><animateTransform attributeName="transform" type="rotate" values="0 400 214;7 400 214;-7 400 214;0 400 214" dur="3.4s" repeatCount="indefinite"/>
    <line x1="400" y1="222" x2="400" y2="304" stroke-width="12" stroke-linecap="round"/>
    <circle cx="400" cy="320" r="14" stroke="none"/></g>`,
  'rights': `
    <path d="M 256 132 l 118 44 v 92 q 0 96 -118 148 q -118 -52 -118 -148 v -92 z" fill="none" stroke-width="20" stroke-linejoin="round">
      <animate attributeName="stroke-opacity" values="1;.45;1" dur="2.6s" repeatCount="indefinite"/></path>
    <circle cx="256" cy="232" r="32" stroke="none"/>
    <path d="M 240 252 h 32 l 12 76 h -56 z" stroke="none"/>`,
  'log-out': `
    <path d="M 150 132 h 140 v 40 h -100 v 168 h 100 v 40 h -140 z" stroke="none"/>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;16 0;0 0" dur="1.8s" repeatCount="indefinite"/>
    <line x1="230" y1="256" x2="352" y2="256" stroke-width="24" stroke-linecap="round"/>
    <path d="M 330 196 l 70 60 -70 60 z" stroke="none"/></g>`,
  'menu': `
    <line x1="140" y1="176" x2="372" y2="176" stroke-width="34" stroke-linecap="round">
      <animate attributeName="x2" values="372;332;372" dur="2.8s" begin="0s" repeatCount="indefinite"/></line>
    <line x1="140" y1="256" x2="372" y2="256" stroke-width="34" stroke-linecap="round">
      <animate attributeName="x2" values="372;332;372" dur="2.8s" begin=".4s" repeatCount="indefinite"/></line>
    <line x1="140" y1="336" x2="372" y2="336" stroke-width="34" stroke-linecap="round">
      <animate attributeName="x2" values="372;332;372" dur="2.8s" begin=".8s" repeatCount="indefinite"/></line>`,
  'credits': `
    <path d="M 256 128 l 30 62 68 10 -49 48 12 68 -61 -32 -61 32 12 -68 -49 -48 68 -10 z" stroke="none">
      <animate attributeName="opacity" values="1;.55;1" dur="2.8s" repeatCount="indefinite"/></path>
    <line x1="176" y1="342" x2="336" y2="342" stroke-width="16" stroke-linecap="round" opacity=".8"/>
    <line x1="206" y1="378" x2="306" y2="378" stroke-width="16" stroke-linecap="round" opacity=".5"/>`,
  '1990s-view': `
    <rect x="122" y="150" width="268" height="212" rx="8" fill="none" stroke-width="14"/>
    <rect x="122" y="150" width="268" height="46" stroke="none"/>
    <rect x="348" y="162" width="24" height="22" fill="#0a1326" stroke="none"/>
    <line x1="196" y1="222" x2="196" y2="336" stroke-width="10"/>
    <line x1="270" y1="222" x2="270" y2="336" stroke-width="10"/>
    <line x1="148" y1="264" x2="364" y2="264" stroke-width="10"/>
    <line x1="148" y1="306" x2="364" y2="306" stroke-width="10"/>
    <rect x="278" y="270" width="30" height="28" stroke="none">
      <animate attributeName="x" values="278;204;204;150;150;278" keyTimes="0;.2;.4;.6;.8;1" dur="5s" repeatCount="indefinite"/>
      <animate attributeName="y" values="270;270;312;312;228;270" keyTimes="0;.2;.4;.6;.8;1" dur="5s" repeatCount="indefinite"/></rect>`,
};
