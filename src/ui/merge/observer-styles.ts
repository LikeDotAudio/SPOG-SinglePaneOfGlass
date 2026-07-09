// src/ui/merge/observer-styles — LCARS-flavoured chrome for the merge observer.
export const MERGE_CSS = `
.mrg-launch{position:fixed;left:12px;bottom:12px;z-index:60;font:800 12px 'Courier New',monospace;letter-spacing:1px;
  padding:7px 12px;border-radius:14px 14px 14px 4px;background:#2c1a3b;color:#d8b4e2;border:1px solid #5a3a72;cursor:pointer;}
.mrg-launch:hover{background:#3d2650;}
.mrg-launch.contest{animation:mrg-pulse 1s infinite;}
@keyframes mrg-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,106,106,.6);}50%{box-shadow:0 0 12px 4px rgba(255,106,106,.6);}}
.mrg-panel{position:fixed;left:12px;bottom:52px;z-index:60;width:360px;max-height:70vh;display:none;flex-direction:column;
  background:#0a0712;border:1px solid #5a3a72;border-radius:12px 12px 12px 4px;color:#e7d6f2;font:13px 'Courier New',monospace;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6);}
.mrg-panel.open{display:flex;}
.mrg-head{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#2c1a3b;font-weight:800;letter-spacing:1px;}
.mrg-head .mrg-x{margin-left:auto;cursor:pointer;padding:0 6px;color:#d8b4e2;}
.mrg-cfg{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;border-bottom:1px solid #2a1a3a;color:#b79ccb;font-size:12px;}
.mrg-cfg label{display:flex;align-items:center;gap:6px;cursor:pointer;}
.mrg-cfg input[type=range]{width:90px;}
.mrg-seat{margin-left:auto;color:#8de0b0;}
.mrg-feed{overflow-y:auto;padding:6px 8px;display:flex;flex-direction:column;gap:5px;}
.mrg-empty{color:#6a5a7a;padding:16px 8px;text-align:center;font-style:italic;}
.mrg-evt{border-left:3px solid #3a2a4a;padding:5px 8px;background:#140d1e;border-radius:0 6px 6px 0;}
.mrg-evt.contest{border-left-color:#ff6a6a;background:#25121a;}
.mrg-evt.concord{border-left-color:#ffd400;background:#231f0f;}
.mrg-evt .mrg-l1{display:flex;gap:8px;align-items:baseline;}
.mrg-evt .mrg-tag{font-weight:800;font-size:10px;letter-spacing:1px;}
.mrg-evt.contest .mrg-tag{color:#ff8a8a;}
.mrg-evt.concord .mrg-tag{color:#ffe066;}
.mrg-evt.compose .mrg-tag{color:#7fd6a0;}
.mrg-evt .mrg-key{color:#c9b3dd;}
.mrg-evt .mrg-res{margin-left:auto;color:#fff;font-weight:800;}
.mrg-evt .mrg-time{color:#6a5a7a;font-size:10px;}
.mrg-prop{display:flex;gap:6px;font-size:11px;color:#9a86ac;padding-left:4px;}
.mrg-prop.win{color:#fff;}
.mrg-prop .mrg-w{color:#8de0b0;font-weight:800;}
.mrg-arena{border-top:1px solid #2a1a3a;padding:10px 12px;background:#0f0a17;}
.mrg-arena h5{margin:0 0 8px;color:#d8b4e2;font-size:11px;letter-spacing:1px;}
.mrg-arena .mrg-row{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12px;color:#b79ccb;}
.mrg-arena input[type=range]{flex:1;}
.mrg-arena .mrg-val{width:34px;text-align:right;color:#fff;font-weight:800;}
.mrg-toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:90;
  background:#25121a;border:1px solid #ff6a6a;color:#ffd7d7;font:800 13px 'Courier New',monospace;letter-spacing:1px;
  padding:10px 18px;border-radius:10px;box-shadow:0 6px 30px rgba(255,80,80,.35);opacity:0;transition:opacity .2s, transform .2s;pointer-events:none;}
.mrg-toast.show{opacity:1;transform:translateX(-50%) translateY(6px);}
.mrg-toast.concord{background:#231f0f;border-color:#ffd400;color:#fff0b8;}
`;
