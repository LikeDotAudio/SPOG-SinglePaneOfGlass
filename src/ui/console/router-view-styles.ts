// src/ui/console/router-view-styles — the Minesweeper / Win95 skin for the
// 1990s router-view crosspoint grid. Split out of router-view.ts (200-line rule);
// re-injected by router-view.ts via addStyles('router-view-styles', RV_CSS).
export const RV_CSS = `
.rv-btn{position:fixed;right:14px;bottom:76px;z-index:1000;background:#3FC1C9;color:#001b1d;border:none;border-radius:18px 6px 6px 18px;font-family:Arial,Helvetica,sans-serif;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:8px 18px 8px 16px;cursor:pointer;box-shadow:inset 5px 0 0 #2a8b91;}
.rv-btn:hover{filter:brightness(1.1);}
.rv-overlay{position:fixed;inset:0;z-index:2500;display:none;flex-direction:column;background:#008080;color:#000;font-family:'MS Sans Serif',Tahoma,Geneva,sans-serif;font-size:12px;}
.rv-overlay.open{display:flex;}
.rv-win{margin:18px;display:flex;flex-direction:column;flex:1;min-height:0;background:#c0c0c0;border:3px solid;border-color:#fff #808080 #808080 #fff;}
.rv-titlebar{background:linear-gradient(90deg,#000080,#1084d0);color:#fff;font-weight:bold;letter-spacing:1px;padding:5px 8px;display:flex;align-items:center;gap:12px;}
.rv-titlebar .rv-x{margin-left:auto;background:#c0c0c0;color:#000;border:2px solid;border-color:#fff #808080 #808080 #fff;width:22px;height:20px;line-height:14px;text-align:center;font-weight:bold;cursor:pointer;}
.rv-x:active{border-color:#808080 #fff #fff #808080;}
.rv-bar{display:flex;align-items:center;gap:10px;padding:8px;flex-wrap:wrap;border-bottom:2px solid #808080;}
.rv-bar input{font-family:inherit;font-size:12px;padding:3px 6px;min-width:140px;border:2px solid;border-color:#808080 #fff #fff #808080;background:#fff;}
.rv-tg{font-family:inherit;font-weight:bold;font-size:11px;padding:5px 10px;cursor:pointer;background:#c0c0c0;border:2px solid;border-color:#fff #808080 #808080 #fff;white-space:nowrap;}
.rv-tg.on{border-color:#808080 #fff #fff #808080;background:#9a9a9a;}
.rv-count{font-size:11px;color:#000080;font-weight:bold;}
.rv-help{margin-left:auto;font-size:11px;color:#404040;}
.rv-body{flex:1;overflow:auto;padding:10px;background:#c0c0c0;}
.rv-msg{padding:40px;text-align:center;color:#404040;}
table.rv-grid{border-collapse:separate;border-spacing:0;}
.rv-grid th,.rv-grid td{padding:0;text-align:center;white-space:nowrap;}
.rv-prodhead,.rv-twisthead,.rv-originhead,.rv-feedhead,.rv-corner{background:#c0c0c0;border:2px solid;border-color:#fff #808080 #808080 #fff;font-weight:bold;padding:3px 8px;}
.rv-prodhead,.rv-originhead{cursor:pointer;color:#000080;letter-spacing:1px;position:sticky;}
.rv-prodhead:active,.rv-originhead:active{border-color:#808080 #fff #fff #808080;}
.rv-twisthead{font-weight:normal;color:#000;writing-mode:vertical-rl;transform:rotate(180deg);vertical-align:bottom;height:120px;padding:8px 3px;}
.rv-twisthead.grp{font-style:italic;color:#000080;}
.rv-feedhead.grp{font-style:italic;color:#000080;}
.rv-pparenthead{writing-mode:vertical-rl;transform:rotate(180deg);vertical-align:bottom;height:110px;background:#000080;color:#fff;font-weight:bold;letter-spacing:1px;position:sticky;top:0;z-index:5;border:2px solid;border-color:#1084d0 #000040 #000040 #1084d0;}
.rv-rparenthead{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;background:#000080;color:#fff;font-weight:bold;letter-spacing:1px;padding:6px 3px;position:sticky;left:0;z-index:2;border:2px solid;border-color:#1084d0 #000040 #000040 #1084d0;}
.rv-dot{font-weight:bold;margin-right:2px;font-size:11px;}
.rv-dot.v{color:#b388ff;} .rv-dot.a{color:#FF9C63;} .rv-dot.s{color:#39d353;}
.rv-grid thead th{position:sticky;top:0;z-index:3;}
.rv-corner{position:sticky;left:0;top:0;z-index:4;}
.rv-originhead{left:0;z-index:2;text-align:left;}
.rv-feedhead{position:sticky;left:0;z-index:2;text-align:left;font-weight:normal;}
.rv-row-off .rv-feedhead{color:#606060;}
.rv-cell{width:24px;height:22px;background:#c0c0c0;border:2px solid;border-color:#fff #808080 #808080 #fff;cursor:pointer;font-weight:bold;color:#000080;}
.rv-cell.grp{cursor:default;}
.rv-cell.on{border-color:#808080 #fff #fff #808080;background:#bdbdbd;color:#c00000;}
.rv-cell.on::after{content:'\\2737';}
.rv-cell.grp.on::after{content:'\\25A0';color:#000080;}
.rv-cell.bad{background:#ff8080;}
.rv-hl{background:#ffff80 !important;}
.rv-cell.on.rv-hl{background:#ffd0d0 !important;}`;
