// src/editors/timer/styles — the LCARS chrome for the dual-count timer (split from
// index.ts, audit §4.5). Injected once via addStyles('twist-editor-timer', CSS).

export const CSS = `
.rc{display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;overflow:auto;color:#e7d3ea;
  font-family:'Courier New',Consolas,monospace;}
.rc-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:16px;}
/* Locked wall-clock header — sticky at the top of the scroll, can't move/close. */
.rc-clock{position:sticky;top:0;z-index:6;flex:0 0 auto;display:flex;align-items:center;gap:14px;
  background:#0a080d;border:1px solid #241a26;border-radius:14px;padding:8px 12px;
  box-shadow:0 10px 22px rgba(0,0,0,.6);}
.rc-clock-lbl{display:flex;flex-direction:column;gap:4px;min-width:118px;}
.rc-clock-lbl b{font:800 12px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;}
.rc-clock-zone{font:700 10px 'Courier New',monospace;letter-spacing:1px;color:#9fe0b0;text-transform:uppercase;}
.rc-clock-lock{font:700 8px 'Courier New',monospace;letter-spacing:1px;color:#6b7686;text-transform:uppercase;}
.rc-clock-body{position:relative;flex:1;min-width:0;height:108px;}
.rc-clock-body canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
.rc-clock-cfg{display:flex;flex-direction:column;gap:5px;align-items:stretch;}
.rc-clock-sel{font:800 9px 'Courier New',monospace;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;min-width:0;
  background:#241a26;color:#e0c6ec;border:1px solid #3a2b46;border-radius:6px;padding:3px 4px;max-width:200px;}
.rc-panel{display:flex;flex-direction:column;gap:10px;background:#0a080d;border:1px solid #241a26;border-radius:14px;padding:12px;}
.rc-phead{display:flex;align-items:center;gap:10px;font:800 12px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;}
.rc-phead .st{margin-left:auto;font:700 10px 'Courier New',monospace;letter-spacing:1px;color:#9fe0b0;text-transform:none;}
.rc-bezel{background:#050506;border:2px solid #201620;border-radius:10px;padding:8px 10px;display:flex;align-items:center;gap:8px;}
.rc-canvas{flex:1;min-width:0;height:auto;display:block;}
.rc-badges{display:flex;flex-direction:column;gap:3px;align-items:flex-end;min-width:40px;font:700 9px 'Courier New',monospace;letter-spacing:1px;}
.rc-badge{color:#6b7686;}.rc-badge.hot{color:#ff5a5a;}
.rc-fnrow,.rc-keys{display:grid;gap:7px;grid-template-columns:repeat(4,1fr);}
.rc-k{border:none;border-radius:9px;padding:12px 4px;cursor:pointer;font:800 12px 'Courier New',monospace;letter-spacing:1px;
  background:#161020;color:#d8c6e2;text-transform:uppercase;position:relative;}
.rc-k .sub{display:block;font:700 7px 'Courier New',monospace;color:#8a5aa0;letter-spacing:1px;margin-bottom:2px;min-height:8px;}
.rc-k.op{background:#241028;}
.rc-k.go{background:#7a1f2a;color:#ffe;}
.rc-k.wide{grid-column:span 2;}
.rc-k.shift{background:#2a2036;}
.rc-k.shift.on{background:#ffd23c;color:#241a12;}
.rc-k:active{filter:brightness(1.3);}
.rc-drawer{background:#0a0a0d;border:1px solid #20202a;border-radius:8px;padding:6px 10px;}
.rc-drawer summary{cursor:pointer;font:800 11px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;}
.rc-fns{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:8px;}
.rc-fn{border:1px solid #2a2030;background:#120c18;color:#c9b6d6;border-radius:7px;padding:7px 9px;cursor:pointer;
  font:700 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;text-align:left;}
.rc-fn:hover{background:#1c1226;}
.rc-gstat{font:700 10px 'Courier New',monospace;letter-spacing:1px;color:#6b7686;display:flex;gap:14px;flex-wrap:wrap;padding:0 4px;}
.rc-gstat b{color:#9fe0b0;}
.rc-bezel{cursor:pointer;}
.rc-panel.sel{border-color:#C864C8;box-shadow:0 0 0 1px #C864C8,0 0 16px rgba(200,100,200,.22);}
.rc-panel.sel .rc-phead{color:#e79ae7;}
.rc-phead .kb{margin-left:8px;font:700 9px 'Courier New',monospace;letter-spacing:1px;color:#C864C8;opacity:0;transition:opacity .12s;}
.rc-panel.sel .rc-phead .kb{opacity:1;}
.rc-hint{font:700 10px 'Courier New',monospace;letter-spacing:.4px;color:#6b7686;padding:0 4px;}
.rc-hint b{color:#C864C8;}
.rc-sc{background:#0a0a0d;border:1px solid #20202a;border-radius:8px;padding:10px 12px;}
.rc-sc-title{font:800 11px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;margin-bottom:9px;}
.rc-sc-title span{color:#6b7686;letter-spacing:.4px;text-transform:none;font-weight:700;}
.rc-sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:7px 16px;}
.rc-sc-row{display:flex;align-items:center;gap:10px;font:700 10px 'Courier New',monospace;}
.rc-kbd{display:inline-flex;align-items:center;justify-content:center;min-width:38px;padding:4px 8px;border-radius:6px;
  background:#161020;border:1px solid #2a2030;box-shadow:0 1px 0 #000;color:#ffd23c;font:800 11px 'Courier New',monospace;letter-spacing:1px;flex:0 0 auto;}
.rc-sc-desc{color:#c9b6d6;}
`;
