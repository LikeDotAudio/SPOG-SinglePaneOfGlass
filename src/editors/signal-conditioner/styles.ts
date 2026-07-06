// src/editors/signal-conditioner/styles — all CSS for the SIGNAL CONDITIONER.
// Split out of index.ts verbatim so visuals match 1:1.

export const CSS = `
.sc{display:flex;flex-direction:column;gap:14px;padding:4px 2px;color:#cfe6ff;font-family:sans-serif;}
.sc-top{display:flex;flex-wrap:wrap;gap:12px;align-items:center;}
.sc-title{font:900 14px sans-serif;letter-spacing:3px;text-transform:uppercase;color:#08131f;
  background:#64c8a0;padding:9px 20px;border-radius:6px 6px 6px 18px;white-space:nowrap;}
.sc-src{font:bold 10px 'Courier New',monospace;letter-spacing:1px;padding:6px 11px;border-radius:6px;
  background:#0c1730;border:1px solid #2c3e5e;color:#cfe6ff;}
.sc-src.empty{opacity:.55;font-style:italic;}
.sc-bypass{margin-left:auto;font:900 12px sans-serif;letter-spacing:2px;text-transform:uppercase;padding:9px 20px;
  border:none;border-radius:16px;cursor:pointer;background:#1b2740;color:#8fd0f0;transition:background .15s,color .15s;}
.sc-bypass.on{background:#ffb020;color:#201400;box-shadow:0 0 12px rgba(255,176,32,.55);}
.sc-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;}
.sc-card{background:#0a1326;border:1px solid #1d2942;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.4);}
.sc-card h4{margin:0;padding:8px 14px;font:900 11px sans-serif;letter-spacing:2px;text-transform:uppercase;color:#08131f;background:var(--hc,#64c8a0);}
.sc-card .sc-body{padding:12px 14px;display:flex;flex-direction:column;gap:12px;}
.sc-wide{grid-column:1 / -1;}
.sc.bypass .sc-card:not(.sc-refcard){opacity:.45;pointer-events:none;}
.sc-row{display:flex;align-items:center;gap:12px;}
.sc-lbl{flex:0 0 108px;font:bold 11px sans-serif;letter-spacing:1px;color:#9fb6cc;text-transform:uppercase;}
.sc-slider{flex:1;-webkit-appearance:none;appearance:none;height:12px;border-radius:6px;background:#12203a;outline:none;}
.sc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;border-radius:50%;background:#64c8a0;cursor:pointer;box-shadow:0 0 0 5px rgba(100,200,160,.25);}
.sc-slider::-moz-range-thumb{width:28px;height:28px;border:none;border-radius:50%;background:#64c8a0;cursor:pointer;box-shadow:0 0 0 5px rgba(100,200,160,.25);}
.sc-val{flex:0 0 82px;text-align:right;font:bold 13px 'Courier New',monospace;color:#cfe6ff;}
.sc-ref{display:flex;gap:8px;}
.sc-refbtn{font:bold 10px sans-serif;letter-spacing:1px;text-transform:uppercase;padding:7px 12px;border:none;border-radius:10px;background:#1b2740;color:#bcd3ee;cursor:pointer;}
.sc-refbtn.on{background:#64c8a0;color:#08131f;}
.sc-lock{display:flex;align-items:center;gap:10px;font:bold 11px 'Courier New',monospace;letter-spacing:1px;}
.sc-led{width:11px;height:11px;border-radius:50%;background:#2a6f4f;box-shadow:0 0 8px rgba(57,211,83,.8);}
.sc-led.warn{background:#c9a227;box-shadow:0 0 8px rgba(230,200,60,.8);}
.sc-note{font:11px sans-serif;color:#6b82a3;}
.sc-body.sc-proc-body{flex-direction:row;align-items:stretch;flex-wrap:wrap;gap:16px;}
.sc-proc-controls{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:12px;justify-content:center;}
.sc-preview{position:relative;flex:0 0 auto;aspect-ratio:1/1;width:230px;max-width:60vw;border-radius:8px;
  border:1px solid #1d2942;overflow:hidden;}
.sc-bars{position:absolute;inset:0;display:block;width:100%;height:100%;background:#0a1326;}
.sc-scope{position:absolute;inset:0;width:100%;height:100%;}
.sc-presets{display:flex;flex-wrap:wrap;gap:11px;}
.sc-preset{font:bold 13px sans-serif;letter-spacing:1.5px;text-transform:uppercase;padding:13px 22px;border:none;border-radius:14px;background:#16233d;color:#bcd3ee;cursor:pointer;transition:filter .15s;}
.sc-preset:hover{filter:brightness(1.3);}
`;
