// src/ui/console/colour-editor-css — the LCARS stylesheet for the COLOUR &
// VISION editor overlay (colour-editor.ts). Injected once via addStyles(STYLE_ID).

export const STYLE_ID = 'tr-colour-editor';
export const CSS = `
.cse-note{color:#9fb8d8;font-size:12px;line-height:1.55;margin:0 0 18px;max-width:74ch;}
.cse-sec{margin:0 0 24px;}
.cse-presets{display:flex;flex-wrap:wrap;gap:12px;}
/* LCARS Corner Law: inner radius = ½ outer, tops/bottoms square. Ladder pair 16↔8:
   leading (left) corners = outer 16, trailing (right) = inner 8; long edges stay flat. */
.cse-preset{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:126px;flex:1 1 126px;
  max-width:180px;padding:14px 12px 10px;border:2px solid #2b3d5f;border-radius:16px 8px 8px 16px;background:#111c31;
  color:#dce8fb;cursor:pointer;font:700 11px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;text-align:center;}
.cse-preset:hover{border-color:#4a678f;background:#16263f;}
.cse-preset .g{font-size:28px;line-height:1;}
.cse-preset .h{font:400 10px Arial,sans-serif;letter-spacing:0;text-transform:none;color:#7f98b8;line-height:1.3;}
.cse-preset .sel{font-size:9px;letter-spacing:1px;color:#7fd0ff;min-height:11px;}
.cse-preset[aria-pressed="true"]{border-color:#7fd0ff;box-shadow:inset 0 0 0 2px rgba(127,208,255,.35);}
.cse-row{display:flex;align-items:center;gap:16px;margin:0 0 12px;flex-wrap:wrap;}
.cse-lab{width:120px;flex:0 0 auto;color:#8fb0d0;font:700 11px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;}
.cse-seg{display:inline-flex;border:2px solid #2b3d5f;border-radius:15px;overflow:hidden;}
.cse-seg button{padding:9px 18px;background:#111c31;color:#cfe0ff;border:none;border-right:1px solid #2b3d5f;
  cursor:pointer;font:700 12px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;}
.cse-seg button:last-child{border-right:none;}
.cse-seg button:hover{background:#16263f;}
.cse-seg button[aria-pressed="true"]{background:#1d3a5c;color:#fff;box-shadow:inset 0 -3px 0 #7fd0ff;}
.cse-hint{color:#6f88a8;font:400 11px Arial,sans-serif;}
.cse-pals{display:flex;flex-wrap:wrap;gap:10px;}
.cse-pal{position:relative;display:flex;flex-direction:column;gap:7px;align-items:flex-start;min-width:138px;
  padding:11px 13px 9px;border:2px solid #2b3d5f;border-radius:16px 8px 8px 16px;background:#111c31;color:#dce8fb;cursor:pointer;}
.cse-pal:hover{border-color:#4a678f;background:#16263f;}
.cse-pal[aria-pressed="true"]{border-color:#7fd0ff;box-shadow:inset 0 0 0 2px rgba(127,208,255,.35);}
.cse-dots{display:flex;gap:5px;}
.cse-dots i{width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.18);}
.cse-pal .nm{font:700 12px Arial,sans-serif;letter-spacing:.5px;}
.cse-pal .safe{font:800 8px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#0a1322;
  background:#39d98a;border-radius:8px;padding:2px 6px;}
.cse-pal .safe.no{visibility:hidden;}
.cse-pal .selmark{position:absolute;top:8px;right:9px;font:800 12px Arial;color:#7fd0ff;min-width:12px;text-align:right;}
.cse-prev{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:18px;border-radius:16px 8px 8px 16px;
  background:#0a1322;border:1px solid #1d2b47;}
.cse-node{display:flex;align-items:center;gap:8px;padding:11px 24px;font:800 12px Arial,sans-serif;
  letter-spacing:1px;border:2px solid currentColor;border-radius:8px;background:rgba(255,255,255,.02);}
.cse-vid{color:var(--sig-video,#CC99CC);clip-path:polygon(0 0,100% 0,88% 100%,12% 100%);}
.cse-aud{color:var(--sig-audio,#FF9C63);clip-path:polygon(12% 0,88% 0,100% 100%,0 100%);}
.cse-prog{color:var(--sig-program,#646DCC);}
.cse-chip{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:22px;
  border:2px solid currentColor;font:800 12px Arial,sans-serif;letter-spacing:1px;}
.cse-chip .g{font-size:15px;line-height:1;}
.cse-fault{color:var(--state-alarm,#ff3b3b);}
.cse-ok{color:var(--state-ok,#39d98a);}
.cse-onair{color:var(--state-onair,#ffaa00);}
/* Sample LCARS windows — mini elbow frames painted by the live palette tokens,
   so a palette pick shows real chrome, not just pills. Corner Law: outer 16,
   inner elbow radius 8 (= ½ outer), tops/bottoms square where edges join. */
.cse-wins{display:flex;flex-wrap:wrap;gap:14px;width:100%;margin-top:14px;}
.cse-win{--wc:#CC99CC;position:relative;flex:0 0 176px;height:104px;background:#060d1c;
  border-radius:16px 8px 8px 8px;overflow:hidden;border:1px solid rgba(255,255,255,.07);}
.cse-win-rail{position:absolute;top:0;left:0;right:0;height:22px;background:var(--wc);
  border-radius:16px 8px 0 0;color:#04101e;font:800 9px Arial,sans-serif;letter-spacing:2px;
  text-transform:uppercase;display:flex;align-items:center;justify-content:flex-end;padding:0 10px;}
.cse-win-spine{position:absolute;top:22px;left:0;bottom:0;width:16px;background:var(--wc);}
.cse-win-elbow{position:absolute;top:22px;left:16px;width:8px;height:8px;
  background:radial-gradient(circle at 100% 100%,transparent 8px,var(--wc) 8px);}
.cse-win-body{position:absolute;top:30px;left:26px;right:10px;bottom:9px;display:flex;flex-direction:column;gap:6px;}
.cse-win-body i{display:block;height:10px;border-radius:4px;background:color-mix(in srgb,var(--wc) 32%,#0a1626);}
.cse-win-states{display:flex;gap:7px;margin-top:auto;}
.cse-win-states b{width:12px;height:12px;border-radius:50%;}
.cse-win-states .d-alarm{background:var(--state-alarm,#ff3b3b);}
.cse-win-states .d-ok{background:var(--state-ok,#39d98a);}
.cse-win-states .d-onair{background:var(--state-onair,#ffaa00);}
.cse-hue-row{display:flex;align-items:center;gap:16px;margin:0 0 12px;opacity:0.3;pointer-events:none;transition:opacity 0.2s;}
.cse-hue-row.active{opacity:1;pointer-events:auto;}
.cse-hue-slider{-webkit-appearance:none;appearance:none;width:160px;height:8px;border-radius:4px;background:linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);outline:none;}
.cse-hue-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #2b3d5f;cursor:pointer;}
.cse-hue-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #2b3d5f;cursor:pointer;}
`;
