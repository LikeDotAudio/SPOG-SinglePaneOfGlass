// src/editors/chronos/styles.ts — CHRONOS chrome CSS, split out of index.ts.
// A rack of broadcast timer cards on black: control bar + scrolling card list,
// each card a black panel with a name, read-out picker and transport row.

export const CSS = `
.cr{display:flex;flex-direction:column;gap:12px;height:100%;min-height:0;color:#dfe8f5;}
.cr-bar{display:flex;flex-wrap:wrap;gap:14px;align-items:center;}
.cr-bar h4{margin:0;color:#C864C8;font:700 11px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.cr-grp{display:inline-flex;align-items:center;gap:6px;font:700 10px 'Courier New',monospace;letter-spacing:1px;color:#8aa;text-transform:uppercase;}
.cr-seg{display:inline-flex;border:1px solid #3a2b46;border-radius:9px;overflow:hidden;}
.cr-btn{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:7px 13px;border:none;
  background:#1a1220;color:#c9b6d6;cursor:pointer;}
.cr-btn.on{background:#C864C8;color:#160a18;}
.cr-list{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:14px;padding:2px;}
.cr-card{background:#000;border:1px solid #1c1c22;border-radius:12px;padding:10px 12px;
  display:flex;flex-direction:column;gap:8px;}
.cr-head{display:flex;align-items:center;gap:10px;}
.cr-name{font:800 11px 'Courier New',monospace;letter-spacing:2px;color:#7d8ba0;text-transform:uppercase;}
.cr-sel{font:800 9px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;cursor:pointer;
  background:#241a26;color:#e0c6ec;border:1px solid #3a2b46;border-radius:6px;padding:4px 5px;}
.cr-body{position:relative;width:100%;}
.cr-face{position:absolute;inset:0;width:100%;height:100%;display:block;}
.cr-xport{display:inline-flex;gap:6px;margin-left:auto;align-items:center;}
.cr-tbtn{font:800 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border:none;
  border-radius:8px;background:#16233d;color:#bcd3ee;cursor:pointer;}
.cr-tbtn.set{background:#2a1c3a;color:#d9b6ee;}
.cr-tbtn.run{background:#e33;color:#150404;}
.cr-live{font:800 10px 'Courier New',monospace;letter-spacing:2px;color:#7de07d;}
`;
