// src/ui/console/chat-dock-styles — CSS for the global PRODUCTION CHAT dock.

export const CSS = `
.chat-launch{position:fixed;right:14px;bottom:76px;z-index:1000;background:#39d353;color:#03210c;border:none;border-radius:18px 6px 6px 18px;font-family:Arial,Helvetica,sans-serif;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:8px 18px 8px 16px;cursor:pointer;box-shadow:inset 5px 0 0 #1f8f38;display:flex;align-items:center;gap:8px;}
.chat-launch:hover{filter:brightness(1.1);}
.chat-launch .cd-badge{display:none;min-width:16px;height:16px;line-height:16px;text-align:center;border-radius:8px;background:#ff3b3b;color:#fff;font-size:10px;padding:0 4px;}
.chat-launch.unread .cd-badge{display:inline-block;}

.chat-panel{position:fixed;right:14px;bottom:120px;z-index:2400;width:min(420px,92vw);height:min(560px,70vh);display:none;flex-direction:column;background:#0a0c12;border:1px solid #22303a;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.6);overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#d6e6ef;}
.chat-panel.open{display:flex;}
.cd-head{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#111a12;border-bottom:1px solid #1f8f38;}
.cd-head b{font-weight:900;letter-spacing:2px;font-size:12px;color:#39d353;text-transform:uppercase;}
.cd-x{margin-left:auto;background:none;border:none;color:#8fa6b2;font-size:18px;line-height:1;cursor:pointer;padding:0 4px;}
.cd-x:hover{color:#fff;}

.cd-route{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#080a10;border-bottom:1px solid #1a2530;flex-wrap:wrap;}
.cd-route .arw{color:#39d353;font-weight:900;}
.cd-route select{flex:1;min-width:120px;background:#03060c;color:#cfe6ff;border:1px solid #1d2942;border-radius:8px;padding:6px 8px;font:inherit;font-size:12px;}

.cd-log{flex:1;min-height:0;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px;}
.cd-empty{margin:auto;color:#4a5b66;font-size:12px;text-align:center;}
.cd-row{max-width:82%;display:flex;flex-direction:column;gap:3px;}
.cd-row.out{align-self:flex-end;align-items:flex-end;}
.cd-row.in{align-self:flex-start;align-items:flex-start;}
.cd-meta{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#6d818d;}
.cd-bub{padding:8px 11px;border-radius:12px;font-size:13px;line-height:1.4;word-break:break-word;background:#12202a;border:1px solid #1d3340;}
.cd-row.out .cd-bub{background:#0f2a17;border-color:#1f8f38;}
.cd-bub a{color:#7fd0ff;}
.cd-bub img{max-width:100%;border-radius:8px;display:block;cursor:zoom-in;margin-top:2px;}
.cd-linkchip{display:inline-flex;align-items:center;gap:6px;color:#7fd0ff;text-decoration:none;}
.cd-linkchip:hover{text-decoration:underline;}

.cd-compose{display:flex;align-items:center;gap:6px;padding:9px 10px;border-top:1px solid #1a2530;background:#080a10;}
.cd-compose textarea{flex:1;resize:none;height:38px;max-height:96px;background:#03060c;color:#cfe6ff;border:1px solid #1d2942;border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;}
.cd-tool{background:#12202a;border:1px solid #1d3340;color:#9fd6ff;border-radius:8px;width:34px;height:34px;font-size:15px;cursor:pointer;flex:none;}
.cd-tool:hover{background:#1a2e3a;}
.cd-send{background:#39d353;border:none;color:#03210c;border-radius:8px;width:38px;height:34px;font-size:16px;font-weight:900;cursor:pointer;flex:none;}
.cd-send:hover{filter:brightness(1.1);}`;
