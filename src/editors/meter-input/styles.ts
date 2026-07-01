// src/editors/meter-input/styles — CSS for the (real-video) Meter Input editor.
import { addStyles } from '../../ui/dom.js';

export function injectMeterInputStyles(): void {
  addStyles('meter-input-styles', `
.mi{display:flex;flex-direction:column;gap:12px;height:100%;}
.mi-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.mi-src{font:bold 10px 'Courier New',monospace;letter-spacing:1px;padding:5px 10px;border-radius:6px;
    background:#0c1730;border:1px solid #2c3e5e;color:#cfe6ff;}
.mi-src.empty{opacity:.55;font-style:italic;}
.mi-btn{font:bold 10px sans-serif;letter-spacing:1px;text-transform:uppercase;padding:7px 12px;border-radius:7px;
    border:1px solid #2c3e5e;background:#0c1730;color:#bcd3ee;cursor:pointer;}
.mi-btn:hover{filter:brightness(1.15);} .mi-btn.on{background:#ffd400;color:#1a1206;border-color:#ffd400;}
.mi-url{font:11px monospace;background:#0c1322;color:#cfe6ff;border:1px solid #2c3e5e;border-radius:6px;padding:6px 8px;min-width:240px;}
.mi-stat{margin-left:auto;font:11px sans-serif;color:#e6a13a;}
/* Analyzed source — a floating card (movable/resizable) so scopes can overlay it. */
.mi-vidcard{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:10px 12px 12px;
    display:flex;flex-direction:column;gap:8px;box-shadow:0 6px 18px rgba(0,0,0,.4);min-width:200px;min-height:140px;}
.mi-vidcard h4{margin:0;color:#6FC8F0;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:move;user-select:none;}
.mi-vidcard h4::before{content:'⠿ ';color:#3a5573;}
.mi-vid{flex:1 1 auto;min-height:0;width:100%;height:100%;border-radius:8px;background:#000;display:block;object-fit:contain;}
/* The scopes live on a free canvas: each card has a starting spot, then is
   drag-moved by its header and resized from the corner (native resize). */
.mi-grid{position:relative;min-height:660px;}
.mi-card{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:10px 12px 12px;
    display:flex;flex-direction:column;gap:8px;box-shadow:0 6px 18px rgba(0,0,0,.4);min-width:200px;min-height:120px;}
.mi-card h4{margin:0;color:#6FC8F0;font-size:11px;letter-spacing:2px;text-transform:uppercase;
    cursor:move;user-select:none;}
.mi-card h4::before{content:'⠿ ';color:#3a5573;}
.mi-scope{position:relative;background:#03060f;border:1px solid #1d2942;border-radius:8px;overflow:hidden;
    flex:1 1 auto;min-height:0;}
.mi-scope canvas{position:absolute;inset:0;width:100%;height:100%;}
.mi-tag{position:absolute;left:8px;top:6px;z-index:2;font:bold 9px 'Courier New',monospace;letter-spacing:1px;color:#6FC8F0;}
.mi-loudrow{display:flex;gap:12px;align-items:stretch;flex:1 1 auto;min-height:0;}
.mi-lufs{font:bold 28px 'Courier New',monospace;color:#cfe6ff;line-height:1;align-self:center;}
.mi-lufs small{display:block;font-size:9px;color:#6b82a3;letter-spacing:1px;margin-top:3px;}
`);
}
