// src/editors/person/styles — scoped CSS for the Person (talent) channel strip.
import { addStyles } from '../../ui/dom.js';

export function injectPersonStyles(): void {
  addStyles('twist-editor-person', `
.pr{display:grid;grid-template-columns:280px minmax(0,1fr) 210px;gap:14px;height:100%;min-height:0;color:#cfe6ff;}
.pr-col{display:flex;flex-direction:column;gap:12px;min-height:0;overflow-y:auto;}
.pr-col h4{margin:0 0 2px;color:#F2B74B;font:700 11px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.pr-card{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;}
/* profile */
.pr-id{display:flex;align-items:center;gap:12px;}
.pr-avatar{width:52px;height:52px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
  font:900 22px sans-serif;color:#08131f;background:linear-gradient(135deg,#F2B74B,#f28c4b);}
.pr-idtxt b{display:block;font:800 16px sans-serif;color:#fff;letter-spacing:.5px;}
.pr-idtxt span{font:11px 'Courier New',monospace;color:#9fb6cc;letter-spacing:1px;}
.pr-virtual{align-self:flex-start;font:800 9px 'Courier New',monospace;letter-spacing:2px;color:#08131f;
  background:#39d353;padding:3px 9px;border-radius:5px;}
.pr-virtual.off{background:#33486a;color:#0a1120;}
.pr-field{display:flex;flex-direction:column;gap:3px;}
.pr-field label{font:9px 'Courier New',monospace;letter-spacing:1px;color:#7e93b5;text-transform:uppercase;}
.pr-field input,.pr-field select{background:#03060f;border:1px solid #1d2942;border-radius:6px;color:#eaffff;
  font:12px sans-serif;padding:6px 8px;outline:none;}
.pr-field input:focus,.pr-field select:focus{border-color:#F2B74B;}
.pr-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
/* strip */
.pr-strip{display:flex;flex-direction:column;gap:12px;min-height:0;}
.pr-sec{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:10px 14px 14px;}
.pr-sec-h{display:flex;align-items:center;gap:10px;font:800 11px 'Courier New',monospace;letter-spacing:2px;
  text-transform:uppercase;color:#F2B74B;margin-bottom:8px;}
.pr-sec-h .en{margin-left:auto;}
.pr-canvas{width:100%;height:240px;background:#03060f;border:1px solid #1d2942;border-radius:8px;display:block;}
.pr-knobs{display:flex;flex-wrap:wrap;gap:22px 34px;margin-top:16px;padding:0 4px 4px;}
.pr-knob{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:78px;}
/* Big rotaries: the shared ui/widgets knob, scaled up for the channel strip. */
.pr-knob .tr-knob{width:64px;height:64px;}
.pr-knob .tr-knob::after{width:3px;height:20px;top:7px;transform-origin:50% 25px;}
.pr-knob .tr-klabel{font-size:10px;letter-spacing:1.5px;color:#9fb6cc;}
.pr-knob .k-val{font:bold 12px 'Courier New',monospace;color:#F2B74B;}
.pr-gr{display:flex;align-items:center;gap:8px;margin-top:10px;}
.pr-gr-track{flex:1;height:12px;border-radius:6px;background:#0c1730;overflow:hidden;box-shadow:inset 0 0 4px #000;}
.pr-gr-bar{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd400,#ff5a5a);transition:width .08s;}
.pr-gr-lbl{font:9px 'Courier New',monospace;color:#7e93b5;letter-spacing:1px;}
.pr-toggle{font:800 9px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border:none;
  border-radius:10px;background:#33486a;color:#0a1120;cursor:pointer;}
.pr-toggle.on{background:#39d353;}
/* presets */
.pr-presets{display:flex;flex-direction:column;gap:8px;}
.pr-preset{font:bold 12px sans-serif;letter-spacing:1px;text-transform:uppercase;padding:11px 14px;border:none;
  border-radius:10px;background:#16233d;color:#e7c98a;cursor:pointer;text-align:left;transition:filter .12s;}
.pr-preset:hover{filter:brightness(1.3);}
.pr-preset.sel{background:#F2B74B;color:#241400;}
.pr-hint{font:10px 'Courier New',monospace;color:#546a8c;letter-spacing:.5px;}
`);
}
