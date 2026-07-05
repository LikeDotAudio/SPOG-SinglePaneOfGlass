// src/editors/clock/styles — the CLOCK editor stylesheet, extracted verbatim
// from index.ts (the 200-line split). index injects it once via
// addStyles('twist-editor-clock', CSS); visuals are unchanged.

export const CSS = `
.ck{display:flex;flex-direction:column;gap:12px;height:100%;min-height:0;color:#dfe8f5;
  font-family:'Courier New',Consolas,monospace;}
.ck-bar{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;}
.ck-grp{display:flex;flex-direction:column;gap:7px;}
.ck-grp-lbl{font:800 10px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;}
.ck-grp-row{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;}
.ck-seg{display:inline-flex;border:1px solid #3a2b46;border-radius:10px;overflow:hidden;}
.ck-btn{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:8px 13px;border:none;
  background:#1a1220;color:#c9b6d6;cursor:pointer;}
.ck-btn:hover{filter:brightness(1.25);}
.ck-btn.on{background:#C864C8;color:#160a18;}
.ck-add{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:8px 14px;cursor:pointer;
  border:1px solid #3a6a3a;border-radius:10px;background:#12210f;color:#a6e2a6;}
.ck-add:hover{background:#1a3216;}
.ck-hint{font:700 10px 'Courier New',monospace;letter-spacing:.4px;color:#6b7686;}

.ck-stage{position:relative;flex:1;min-height:360px;overflow:auto;resize:vertical;
  background:#05060a;border:1px solid #191b24;border-radius:12px;
  background-image:radial-gradient(rgba(200,100,200,.09) 1px,transparent 1px);background-size:22px 22px;}

.ck-win{position:absolute;display:flex;flex-direction:column;min-width:120px;min-height:120px;
  background:#07080c;border:1px solid #20222c;border-radius:12px;overflow:hidden;resize:both;box-shadow:0 6px 20px rgba(0,0,0,.5);}
.ck-win.sel{border-color:#C864C8;box-shadow:0 0 0 1px #C864C8,0 8px 26px rgba(200,100,200,.28);}
.ck-win-head{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0;padding:5px 7px;cursor:move;user-select:none;
  background:#160c1a;border-bottom:1px solid #241a26;}
.ck-win-title{flex:1 1 40px;min-width:0;font:800 10px 'Courier New',monospace;letter-spacing:1px;color:#e79ae7;text-transform:uppercase;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;outline:none;cursor:text;}
.ck-win-title:focus{color:#fff;}
.ck-ico{cursor:pointer;color:#c9b6d6;background:rgba(255,255,255,.06);border-radius:6px;font:800 9px 'Courier New',monospace;
  letter-spacing:1px;line-height:1;padding:4px 6px;}
.ck-ico:hover{background:rgba(200,100,200,.3);color:#fff;}
.ck-ico.ck-x{color:#f0a0a0;}
/* Per-window pickers (zone offset · resolution · face) — each clock is independent. */
.ck-face-sel{font:800 9px 'Courier New',monospace;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;min-width:0;
  background:#241a26;color:#e0c6ec;border:1px solid #3a2b46;border-radius:6px;padding:3px 3px;}
.ck-win-body{flex:1;min-height:0;position:relative;}
.ck-win-body canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:auto;display:block;}

.ck-date{display:flex;align-items:stretch;justify-content:center;gap:1px;width:100%;height:100%;--vf:26px;
  background:#050505;box-shadow:inset 0 0 22px rgba(255,47,47,.12);}
.ck-date .ck-cell{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2em;min-width:0;}
.ck-date .ck-cell + .ck-cell{border-left:1px solid #1b1d24;}
.ck-date .ck-cap{font:700 max(7px,calc(var(--vf)*.34)) 'Courier New',monospace;letter-spacing:2px;color:#7d8ba0;text-transform:uppercase;}
.ck-date .ck-val{font:800 var(--vf) 'Courier New',Consolas,monospace;letter-spacing:1px;color:#ff2f2f;line-height:1;
  text-shadow:0 0 12px rgba(255,47,47,.75);}
.ck-date .ck-day .ck-val{font-size:calc(var(--vf)*.77);letter-spacing:2px;}

.ck-saved{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;}
.ck-empty{font:700 10px 'Courier New',monospace;color:#5a6472;letter-spacing:.4px;}
`;
