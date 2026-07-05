// assets/icons/lib/glyphs.mjs — static glyph path library (shared by SOURCE and
// DESTINATION generators). Each glyph is drawn in the 512 canvas, centred
// ~128..384. Pure SVG-path data.

export const G = {
  controlRooms: `
    <rect x="126" y="140" width="260" height="164" rx="16" fill="none" stroke-width="20"/>
    <line x1="256" y1="150" x2="256" y2="294" stroke-width="12"/>
    <line x1="136" y1="222" x2="376" y2="222" stroke-width="12"/>
    <circle cx="166" cy="352" r="16" stroke="none"/><circle cx="226" cy="352" r="16" stroke="none"/>
    <circle cx="286" cy="352" r="16" stroke="none"/><circle cx="346" cy="352" r="16" stroke="none"/>`,
  floors: `
    <rect x="140" y="146" width="232" height="52" rx="12" stroke="none"/>
    <rect x="140" y="222" width="232" height="52" rx="12" stroke="none" opacity=".75"/>
    <rect x="140" y="298" width="232" height="52" rx="12" stroke="none" opacity=".5"/>
    <circle cx="352" cy="172" r="12" fill="${'#0a1326'}" stroke="none"/>`,
  encoders: `
    <circle cx="186" cy="256" r="30" stroke="none"/>
    <path d="M 238 196 a 86 86 0 0 1 0 120" fill="none" stroke-width="22" stroke-linecap="round"/>
    <path d="M 286 158 a 140 140 0 0 1 0 196" fill="none" stroke-width="22" stroke-linecap="round" opacity=".7"/>
    <path d="M 330 120 a 194 194 0 0 1 0 272" fill="none" stroke-width="22" stroke-linecap="round" opacity=".4"/>`,
  editSuites: `
    <path d="M 244 128 h 24 v 96 l -12 14 -12 -14 z" stroke="none"/>
    <rect x="128" y="256" width="256" height="44" rx="10" fill="none" stroke-width="12"/>
    <rect x="140" y="266" width="88" height="24" rx="6" stroke="none"/>
    <rect x="240" y="266" width="56" height="24" rx="6" stroke="none" opacity=".7"/>
    <rect x="128" y="322" width="256" height="44" rx="10" fill="none" stroke-width="12"/>
    <rect x="168" y="332" width="120" height="24" rx="6" stroke="none" opacity=".85"/>`,
  testTools: `
    <rect x="126" y="142" width="260" height="170" rx="16" fill="none" stroke-width="18"/>
    <line x1="256" y1="152" x2="256" y2="302" stroke-width="4" opacity=".4"/>
    <line x1="136" y1="227" x2="376" y2="227" stroke-width="4" opacity=".4"/>
    <path d="M 146 227 q 27 -66 55 0 t 55 0 t 55 0 t 55 0" fill="none" stroke-width="14" stroke-linecap="round"/>
    <circle cx="196" cy="356" r="16" stroke="none"/><circle cx="256" cy="356" r="16" stroke="none"/>
    <circle cx="316" cy="356" r="16" stroke="none"/>`,
  people: `
    <circle cx="212" cy="196" r="44" stroke="none" opacity=".65"/>
    <path d="M 132 348 q 0 -84 80 -84 q 80 0 80 84 z" stroke="none" opacity=".65"/>
    <circle cx="300" cy="212" r="52" stroke="none"/>
    <path d="M 204 384 q 0 -96 96 -96 q 96 0 96 96 z" stroke="none"/>`,
  sound: `
    <rect x="232" y="126" width="92" height="158" rx="46" stroke="none"/>
    <path d="M 198 226 a 80 80 0 0 0 160 0" fill="none" stroke-width="18" stroke-linecap="round"/>
    <line x1="278" y1="308" x2="278" y2="352" stroke-width="18" stroke-linecap="round"/>
    <line x1="228" y1="368" x2="328" y2="368" stroke-width="18" stroke-linecap="round"/>
    <path d="M 158 190 a 70 70 0 0 0 0 128" fill="none" stroke-width="16" stroke-linecap="round"/>
    <path d="M 112 164 a 118 118 0 0 0 0 180" fill="none" stroke-width="16" stroke-linecap="round" opacity=".55"/>`,
  video: `
    <rect x="120" y="206" width="200" height="150" rx="24" stroke="none"/>
    <path d="M 336 251 l 66 -42 v 134 l -66 -42 z" stroke="none"/>
    <circle cx="356" cy="140" r="50" fill="#ff4444" stroke="none">
      <animate attributeName="opacity" values="1;.12;1" dur="1.1s" repeatCount="indefinite"/>
    </circle>`,
  streams: `
    <path d="M 132 190 q 31 -34 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round"/>
    <path d="M 132 256 q 31 -34 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round" opacity=".75"/>
    <path d="M 132 322 q 31 -34 62 0 t 62 0 t 62 0 t 62 0" fill="none" stroke-width="22" stroke-linecap="round" opacity=".5"/>`,
  play: `
    <circle cx="256" cy="256" r="140" fill="none" stroke-width="22"/>
    <path d="M 216 186 l 116 70 -116 70 z" stroke="none"/>`,
  prod: `
    <rect x="128" y="238" width="256" height="130" rx="16" stroke="none"/>
    <path d="M 124 214 l 252 -50 14 54 -252 50 z" stroke="none" opacity=".85"/>
    <path d="M 160 206 l 30 -34 M 220 194 l 30 -34 M 280 182 l 30 -34 M 340 170 l 30 -34" stroke-width="14"/>`,
  graphics: `
    <rect x="178" y="128" width="204" height="204" rx="20" fill="none" stroke-width="16" opacity=".65"/>
    <path d="M 196 146 l 168 168 M 196 208 l 106 106 M 258 146 l 106 106" stroke-width="10" opacity=".45"/>
    <rect x="128" y="180" width="204" height="204" rx="20" stroke="none"/>`,
  prompter: `
    <rect x="122" y="140" width="268" height="180" rx="20" fill="none" stroke-width="18"/>
    <line x1="156" y1="192" x2="356" y2="192" stroke-width="18" stroke-linecap="round"/>
    <line x1="156" y1="232" x2="326" y2="232" stroke-width="18" stroke-linecap="round" opacity=".7"/>
    <line x1="156" y1="272" x2="346" y2="272" stroke-width="18" stroke-linecap="round" opacity=".45"/>
    <path d="M 236 392 l 20 -28 20 28 z" stroke="none"/><line x1="256" y1="368" x2="256" y2="330" stroke-width="14"/>`,
  portals: `
    <circle cx="256" cy="256" r="140" fill="none" stroke-width="20"/>
    <circle cx="256" cy="256" r="86" fill="none" stroke-width="18" opacity=".7"/>
    <circle cx="256" cy="256" r="34" stroke="none"/>`,
};
