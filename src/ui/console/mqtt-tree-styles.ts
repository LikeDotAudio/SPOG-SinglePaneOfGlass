// src/ui/console/mqtt-tree-styles — the CSS for the MQTT chip + retained-tree panel.
//
// Extracted verbatim from mqtt-tree.ts (audit §5.5 split). The chip is pinned
// bottom-RIGHT and sits to the LEFT of the .ptp-clock read-out (both share
// bottom:42px). The clock publishes its live width as --ptp-clock-w (clock.ts) so
// the chip clears the clock as its format cycles (variable width). lcars-pulse.ts
// nudges both `right` offsets inward past the 20px edge pulse.
export const MQ_CSS = `
.mq-chip{position:fixed;right:calc(28px + var(--ptp-clock-w,180px));bottom:42px;z-index:1600;display:inline-flex;align-items:center;gap:7px;
    background:#0c1730;border:1px solid #2c3e5e;border-radius:6px 14px 14px 6px;color:#bcd3ee;
    font:bold 10px sans-serif;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;cursor:pointer;
    box-shadow:0 3px 12px rgba(0,0,0,.5);}
.mq-chip:hover{border-color:#3a6acc;color:#fff;}
.mq-chip.seat-synced{box-shadow:0 0 10px rgba(57,211,83,.35);border-color:#2c6a3c;}
.mq-dot{width:9px;height:9px;border-radius:50%;background:#6b82a3;box-shadow:0 0 6px currentColor;color:#6b82a3;}
.mq-dot.on{background:#ffd400;color:#ffd400;} .mq-dot.live{background:#39d353;color:#39d353;} .mq-dot.err{background:#e33;color:#e33;}
.mqt{position:fixed;right:14px;bottom:114px;z-index:1601;display:none;flex-direction:column;
    width:min(820px,94vw);height:min(70vh,720px);background:#0a0805;color:#ffcf6b;
    border:1px solid #3a2f10;border-radius:10px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.7);
    font:13px/1.4 'Courier New',monospace;}
.mqt.open{display:flex;}
.mqt-head{display:flex;align-items:center;gap:12px;padding:9px 14px;background:#C2B74B;color:#1a1206;
    font-weight:900;letter-spacing:2px;flex:0 0 auto;}
.mqt-head button{font:bold 11px sans-serif;letter-spacing:1px;text-transform:uppercase;border:none;
    border-radius:5px;padding:5px 10px;cursor:pointer;background:#1a1206;color:#ffcf6b;}
.mqt-head button:hover{filter:brightness(1.3);}
.mqt-head .sp{flex:1;}
.mqt-head .mqt-count{background:#1a1206;color:#C2B74B;padding:2px 9px;border-radius:8px;font:bold 12px monospace;}
.mqt-head .mqt-x{background:transparent;color:#1a1206;font-size:16px;padding:2px 6px;cursor:pointer;}
/* Connection form — host / port / user / pass are ALWAYS shown and pre-filled. */
.mqt-form{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 14px;background:#181206;
    border-bottom:1px solid #2a2110;flex:0 0 auto;font:10px monospace;color:#C2B74B;}
.mqt-form label{display:inline-flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:1px;}
.mqt-form input{font:12px 'Courier New',monospace;padding:5px 8px;border:1px solid #3a2f10;border-radius:5px;
    background:#0a0805;color:#ffe9b0;}
.mqt-form input:focus{outline:none;border-color:#C2B74B;}
.mqt-form input.host{width:160px;} .mqt-form input.port{width:66px;}
.mqt-form input.user,.mqt-form input.pass{width:110px;}
.mqt-form button{font:bold 10px sans-serif;letter-spacing:1px;text-transform:uppercase;border:none;
    border-radius:5px;padding:6px 11px;cursor:pointer;background:#C2B74B;color:#1a1206;}
.mqt-form button.off{background:#3a2f10;color:#ffcf6b;}
.mqt-form button:hover{filter:brightness(1.15);}
.mqt-eff{padding:5px 14px;font:10px monospace;background:#140f06;flex:0 0 auto;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mqt-eff b.ok{color:#39d353;} .mqt-eff b.warn{color:#ffd400;} .mqt-eff b.bad{color:#ff6a6a;}
.mqt-eff .u{color:#8a7430;}
.mqt-scroll{flex:1 1 auto;overflow:auto;}
.mqt table{width:100%;border-collapse:collapse;}
.mqt th,.mqt td{text-align:left;padding:5px 14px;border-bottom:1px solid #1c1810;vertical-align:top;}
.mqt th{position:sticky;top:0;background:#140f06;color:#C2B74B;letter-spacing:1px;}
.mqt td.topic{color:#6FC8F0;white-space:nowrap;}
.mqt tr.branch td{cursor:pointer;background:#100c05;}
.mqt tr.branch td.topic{color:#C2B74B;font-weight:bold;}
.mqt tr.branch:hover td{background:#181205;}
.mqt .caret{display:inline-block;width:14px;color:#8a7430;}
.mqt .cnt{margin-left:8px;font-size:10px;color:#8a7430;font-weight:normal;}
.mqt .tick{display:inline-block;width:14px;color:#3a2f10;}
.mqt td.val{color:#ffe9b0;white-space:pre-wrap;word-break:break-word;}
.mqt td.age{color:#8a7430;text-align:right;white-space:nowrap;}
.mqt .empty{padding:40px;text-align:center;color:#6a5a30;letter-spacing:1px;}`;
