export const PROMPTER_CSS = `
.tp{display:grid;grid-template-columns:1fr 1fr;gap:14px;height:100%;min-height:0;color:#cfe6ff;position:relative;}
.tp-col{display:flex;flex-direction:column;gap:10px;min-height:0;position:relative;}
.tp-col h4{margin:0;color:#6FC8F0;font:700 22px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.tp-script-wrapper{flex:1;min-height:0;display:flex;flex-direction:column;background:#03060f;border:1px solid #1d2942;border-radius:8px;overflow:hidden;}
.tp-script-wrapper:focus-within{border-color:#6FC8F0;}
.tp-script-container{flex:1;min-height:0;display:flex;}
.tp-gutter{padding:10px 8px;background:#0a1122;color:#4a5c7d;font:13px/1.6 'Courier New',monospace;text-align:right;border-right:1px solid #1d2942;overflow:hidden;user-select:none;white-space:pre;}
.tp-script{flex:1;min-height:0;background:transparent;border:none;color:#cfe6ff;
  font:13px/1.6 'Courier New',monospace;padding:10px 12px;outline:none;white-space:pre-wrap;overflow:auto;}
.tp-toolbar { display:flex; gap: 8px; padding: 6px 12px; background: #16233d; border-bottom: 1px solid #1d2942; }
.tp-tool-btn { font: bold 14px monospace; padding: 4px 8px; border-radius: 4px; background: #0a1122; color: #cfe6ff; border: 1px solid #2a3b5c; cursor: pointer; }
.tp-tool-btn:hover { background: #1d2942; }
.tp-tool-sep { width:1px; align-self:stretch; margin:2px 4px; background:#2a3b5c; }
.tp-tool-hl { width: 24px; height: 24px; padding: 0; border-radius: 4px; border: 1px solid rgba(0,0,0,0.4); cursor: pointer; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25); }
.tp-tool-hl:hover { transform: scale(1.12); }
.tp-tool-hl.clear { background: #0a1122; color: #cfe6ff; font: bold 16px monospace; box-shadow: inset 0 0 0 1px #2a3b5c; }
.tp-ctrls{display:flex;flex-wrap:wrap;gap:16px;align-items:center;}
.tp-btn{font:800 22px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:18px 30px;border:none;
  border-radius:20px;background:#16233d;color:#bcd3ee;cursor:pointer;}
.tp-btn.on{background:#6FC8F0;color:#08131f;}
.tp-file-btn{font:700 20px 'Courier New',monospace;padding:8px 16px;background:#1d2942;border:none;border-radius:8px;color:#cfe6ff;cursor:pointer;}
.tp-file-btn:hover{background:#2a3b5c;}
.tp-slide{display:flex;align-items:center;gap:12px;font:20px 'Courier New',monospace;color:#7e93b5;letter-spacing:1px;}
.tp-slide input{width:220px;height:24px;cursor:pointer;}
.tp-config{display:flex;flex-wrap:wrap;gap:16px;align-items:center;font:20px 'Courier New',monospace;color:#7e93b5;}
.tp-config label{display:flex;align-items:center;gap:8px;cursor:pointer;}
.tp-config input[type="color"]{width:40px;height:40px;padding:0;border:none;border-radius:4px;background:none;cursor:pointer;}
.tp-config input[type="checkbox"]{width:24px;height:24px;cursor:pointer;}
.tp-stage{aspect-ratio:1/1;max-height:100%;margin:0 auto;position:relative;overflow:hidden;background:#000;border:1px solid #1d2942;border-radius:10px;}
.tp-scroll{position:absolute;left:0;right:0;top:0;padding:0 9%;color:#fff;font-weight:800;text-align:center;
  text-shadow:0 2px 8px rgba(0,0,0,.8);will-change:transform;}
.tp-scroll.show-lines { counter-reset: tp-line; }
.tp-scroll.show-lines > div, .tp-scroll.show-lines > p { counter-increment: tp-line; }
.tp-scroll.show-lines > div::before, .tp-scroll.show-lines > p::before { content: counter(tp-line) ": "; opacity: 0.5; margin-right: 8px; }
.tp-scroll p{margin:0 0 .7em;}
.story-marker{color:#ffcc33;font-weight:700;font-size:0.65em;border-top:1px dashed rgba(255,255,255,0.35);padding-top:4px;margin-top:8px;text-transform:uppercase;}
.gpo-marker{color:#ff3366;font-weight:700;font-size:0.65em;border-top:1px dashed rgba(255,51,102,0.35);padding-top:4px;margin-top:8px;text-transform:uppercase;}
.tp-gpo-log{height:80px;overflow-y:auto;background:#0a1122;border:1px solid #1d2942;border-radius:8px;padding:8px;font:14px monospace;color:#ff3366;}
.tp-gpo-entry{margin-bottom:4px;border-bottom:1px dashed #1d2942;padding-bottom:4px;}
.tp-shortcuts{position:absolute;bottom:20px;right:100px;background:rgba(10,17,34,0.9);border:1px solid #1d2942;border-radius:8px;padding:12px;font:14px monospace;color:#7e93b5;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:100;pointer-events:none;}
.tp-shortcuts h4{margin:0 0 10px 0;color:#6FC8F0;font-size:16px;text-transform:uppercase;}
.tp-shortcuts div{margin-bottom:6px;}
.tp-wheel-col{background:#03060f;border:1px solid #1d2942;border-radius:10px;display:flex;flex-direction:column;align-items:center;padding:15px 0;width:80px;}
.tp-pace-container { position:relative; flex:1; width:48px; background:#03060f; border:2px solid #1d2942; border-radius:8px; cursor:pointer; user-select:none; overflow:hidden; margin-bottom:10px; }
.tp-wheel-bg { position:absolute; top:0; left:0; right:0; bottom:0; background-image:repeating-linear-gradient(transparent, transparent 18px, rgba(111,200,240,0.15) 18px, rgba(111,200,240,0.15) 20px); background-size:100% 20px; z-index:1; }
.tp-pace-track { position:absolute; left:50%; width:8px; top:10px; bottom:10px; margin-left:-4px; background:rgba(29,41,66,0.5); border-radius:4px; z-index:2; }
.tp-pace-fill { position:absolute; left:0; right:0; border-radius:4px; z-index:3; }
.tp-pace-thumb { position:absolute; left:-8px; right:-8px; height:16px; margin-top:-8px; background:#fff; border:3px solid #6FC8F0; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.8); z-index:4; pointer-events:none; }
.tp-pace-center { position:absolute; top:50%; left:5px; right:5px; height:2px; margin-top:-1px; background:#fff; opacity:0.3; z-index:2; }
.tp-wheel-label { color:#6FC8F0; font:bold 18px monospace; margin-bottom:10px; text-shadow:0 2px 4px #000; }
.tp-mid{position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(111,200,240,.35);pointer-events:none;margin-top:-1px;}
.tp-mid::before{content:'▶';position:absolute;left:3%;top:-10px;color:#6FC8F0;font-size:22px;line-height:22px;text-shadow:0 2px 4px rgba(0,0,0,0.8);}
.tp-mid::after{content:'◀';position:absolute;right:3%;top:-10px;color:#6FC8F0;font-size:22px;line-height:22px;text-shadow:0 2px 4px rgba(0,0,0,0.8);}
\`;
