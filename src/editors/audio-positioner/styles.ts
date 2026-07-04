// src/editors/audio-positioner/styles.ts — CSS for the CMDP 3D audio positioner.
import { addStyles } from '../../ui/dom.js';

export function injectAudioPositionerStyles(): void {
  addStyles('audio-positioner-styles', `
.ap-wrap{--accent:#f4902c;display:flex;flex-direction:column;width:100%;height:78vh;min-height:600px;
  background:#121212;border-radius:12px;overflow:hidden;color:#eee;font-family:'Segoe UI',sans-serif;position:relative;}

.ap-header{display:flex;justify-content:space-between;padding:10px 15px;background:#181818;border-bottom:1px solid #333;}
.ap-title{font-weight:bold;color:var(--accent);letter-spacing:1px;font-size:14px;align-self:center;}
.ap-select{background:#333;color:#eee;border:1px solid #555;padding:4px 8px;border-radius:4px;}

.ap-main{display:flex;flex:1;min-height:0;}

.ap-pov{flex:1;position:relative;background:#090909;border-right:1px solid #333;}
.ap-pov:last-child{border-right:none;border-left:1px solid #333;}
.ap-pov-title{position:absolute;top:10px;left:10px;font-size:10px;font-weight:bold;color:#fff;background:rgba(0,0,0,0.6);padding:4px 8px;border-radius:4px;pointer-events:none;z-index:2;}
.ap-pov canvas {display:block;width:100%;height:100%;position:absolute;inset:0;}

.ap-center{flex:2;position:relative;background:#181818;}
.ap-center canvas{display:block;width:100%;height:100%;position:absolute;inset:0;touch-action:none;}

.ap-bottom{display:flex;height:120px;background:#181818;border-top:1px solid #333;}
.ap-meters{flex:1;display:flex;flex-direction:column;padding:10px;border-right:1px solid #333;}
.ap-meters:last-child{border-right:none;}
.ap-meters-title{font-size:10px;color:#888;margin-bottom:8px;}
.ap-meters-box{flex:1;display:flex;gap:8px;align-items:flex-end;}
.ap-meter{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;}
.ap-meter-fill{width:100%;background:#555;margin-bottom:4px;border-radius:2px 2px 0 0;transition:height 0.1s;}
.ap-meter-label{font-size:9px;color:#888;}

.ap-footer{padding:8px;background:#111;text-align:center;font-size:11px;color:#888;border-top:1px solid #333;}
.ap-footer strong{color:var(--accent);}

.ap-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#888;font-size:13px;text-align:center;padding:0 40px;pointer-events:none;}
`);
}
