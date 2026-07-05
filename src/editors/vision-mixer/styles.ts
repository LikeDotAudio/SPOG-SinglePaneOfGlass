// src/editors/vision-mixer/styles — token-driven LCARS skin for the switcher.
//
// Compatibility contract (deployment plan §5):
//  • COLOUR — Tier-2 semantic tokens only: PGM chrome = --state-alarm (broadcast
//    red tally family; vermillion under the CVD-safe palette), PVW = --state-ok,
//    on-air/DSK accents = --state-onair, source tints = --sig-*. No meaningful
//    raw hex → the editor rides data-cvd / data-chroma / data-vision for free.
//  • SHAPE — every category tint is paired with a glyph cue (data-cat), so the
//    buses stay readable in grey and mono modes.
//  • CORNER LAW (LCARS.md §1) — ladder radii: outer 16 ↔ inner 8; horizontal
//    pills round their ENDS (6/18 caps on bus labels), butt-joins stay square.
//  • CHIRALITY — the control surface mirrors via direction:rtl under
//    html[data-chirality="left"]; the PGM|T-bar|PVW stage is .chir-exempt unless
//    the operator picks "follow chirality" (prefs.ts).

import { addStyles } from '../../ui/dom.js';

export function injectVisionMixerStyles(): void {
  addStyles(
    'twist-editor-vision-mixer',
    `
        /* ===== Vision mixer (schema-driven rebuild) ===== */
        .vm-root{display:flex;flex-direction:column;gap:14px;height:100%;}

        /* M/E delegation tabs + toolbar row */
        .vm-medock{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .vm-metab{padding:10px 20px;border:none;cursor:pointer;font:900 12px Arial;letter-spacing:2px;
            border-radius:16px 8px 8px 16px;background:#17233c;color:#cfe0ff;}
        .vm-metab.sel{background:var(--sig-program,#646DCC);color:#000;}
        .vm-medock .vm-spacer{flex:1;}
        .vm-sel,.vm-num{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;cursor:pointer;
            background:#17233c;color:#cfe0ff;border:1px solid #2c3a5a;border-radius:8px;padding:6px 8px;}
        .vm-num{width:74px;cursor:text;}

        /* Stage: PROGRAM monitor | T-BAR | PREVIEW monitor */
        .vm-stage{display:flex;gap:14px;align-items:stretch;justify-content:center;}
        .vm-mon{position:relative;flex: 0 1 300px;aspect-ratio: 1 / 1;background:#04070e;border-radius:16px;
            border:2px solid #394a63;padding:34px 16px 16px;overflow:hidden;
            display:flex;flex-direction:column;justify-content:center;perspective:700px;}
        .vm-mon::before{content:'';position:absolute;top:0;left:0;right:0;height:24px;
            background:#394a63;border-radius:14px 14px 0 0;}
        .vm-mon.pgm{border-color:var(--state-alarm,#ff3b3b);}
        .vm-mon.pvw{border-color:var(--state-ok,#39d98a);}
        .vm-mon.pgm::before{background:var(--state-alarm,#ff3b3b);}
        .vm-mon.pvw::before{background:var(--state-ok,#39d98a);}
        .vm-tag{position:absolute;top:3px;left:18px;font-weight:900;letter-spacing:3px;font-size:12px;color:#000;z-index:2;}
        .vm-src{position:absolute;top:3px;right:14px;font:900 11px 'Courier New',monospace;letter-spacing:1px;color:#000;z-index:2;opacity:.75;}
        .vm-feed{flex:1;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;
            color:var(--text-main,#e0f0ff);text-align:center;letter-spacing:1px;}
        /* Keyer PIP chips fly over the feed via the DVE pose (CSS 3D transform). */
        .vm-pip{position:absolute;inset:22%;display:flex;align-items:center;justify-content:center;
            font:900 12px Arial;letter-spacing:1px;color:#000;background:var(--sig-video,#CC99CC);
            border:2px solid rgba(0,0,0,.4);border-radius:8px;will-change:transform;pointer-events:none;}
        .vm-pip.armed{opacity:.55;outline:2px dashed var(--state-ok,#39d98a);}
        .vm-dskrow{position:absolute;bottom:10px;left:16px;display:flex;gap:6px;z-index:2;}
        .vm-dskrow span{background:var(--state-onair,#ffaa00);color:#000;font-size:10px;font-weight:bold;
            padding:2px 9px;border-radius:8px;letter-spacing:1px;}

        /* T-bar */
        .vm-tbar-wrap{flex:0 0 150px;display:flex;flex-direction:column;align-items:center;gap:8px;
            background:#0a0f1c;border-radius:16px;border:2px solid #2c3a5a;padding:12px 8px;}
        .vm-tbar-wrap .vm-h{margin:0;color:var(--cyan,#00ffff);}
        .vm-tbar-stage{flex:1;display:flex;align-items:stretch;gap:10px;padding:4px 0;}
        .vm-tbar-ends{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;
            font-size:11px;font-weight:900;letter-spacing:1px;padding:6px 0;}
        .vm-tbar-ends .pvw{color:var(--state-ok,#39d98a);} .vm-tbar-ends .pgm{color:var(--state-alarm,#ff3b3b);}
        .vm-tbar{-webkit-appearance:none;appearance:none;writing-mode:vertical-lr;direction:rtl;
            width:58px;flex:1;min-height:150px;border-radius:16px;border:2px solid #34507a;cursor:grab;
            background:linear-gradient(var(--state-ok,#39d98a) 0%, #0c1830 46%, #0c1830 54%, var(--state-alarm,#ff3b3b) 100%);}
        .vm-tbar:active{cursor:grabbing;}
        .vm-tbar::-webkit-slider-thumb{-webkit-appearance:none;width:78px;height:32px;border-radius:8px;
            background:var(--cyan,#00ffff);border:2px solid #fff;cursor:grab;}
        .vm-tbar::-moz-range-thumb{width:78px;height:32px;border-radius:8px;background:var(--cyan,#00ffff);border:2px solid #fff;cursor:grab;}
        .vm-pct{font-weight:900;font-size:18px;letter-spacing:1px;color:var(--cyan,#00ffff);}

        /* Buses. Bus label = horizontal pill (ends round: 6/16 caps). */
        .vm-busrow{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;}
        .vm-buslabel{width:84px;flex:0 0 auto;font-weight:900;letter-spacing:1px;font-size:12px;
            padding:9px 10px;border-radius:6px 16px 16px 6px;color:#000;text-align:center;}
        .vm-buslabel.pgm{background:var(--state-alarm,#ff3b3b);} .vm-buslabel.pvw{background:var(--state-ok,#39d98a);}
        .vm-bus{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;flex:1;}
        .vm-bus.stack{flex-direction:column;} .vm-bus.stack .vm-bank{display:flex;gap:6px;flex-wrap:wrap;}
        .vm-btn{width:78px;height:78px;padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;
            text-align:center;border-radius:4px 8px 8px 4px;background:#17233c;
            border:none;border-left:5px solid #2c3a5a;color:#cfe0ff;cursor:pointer;font-weight:bold;font-size:11px;
            white-space:normal;transition:all .1s;user-select:none;word-break:break-word;line-height:1.2;overflow:hidden;}
        .vm-btn:hover{filter:brightness(1.25);}
        /* Category: tint + SHAPE cue (survives grey/mono). */
        .vm-btn[data-cat="video"]{border-left-color:var(--sig-video,#CC99CC);}
        .vm-btn[data-cat="audio"]{border-left-color:var(--sig-audio,#FF9C63);}
        .vm-btn[data-cat="program"]{border-left-color:var(--sig-program,#646DCC);}
        .vm-btn[data-cat="video"]::before{content:'▷';opacity:.7;font-size:14px;margin-bottom:4px;}
        .vm-btn[data-cat="audio"]::before{content:'◆';opacity:.7;font-size:14px;margin-bottom:4px;}
        .vm-btn[data-cat="program"]::before{content:'▚';opacity:.7;font-size:14px;margin-bottom:4px;}
        .vm-btn.reentry{border-left-color:var(--cyan,#00ffff);background:#12283a;}
        .vm-btn.reentry::before{content:'⮌';opacity:.8;font-size:14px;margin-bottom:4px;}
        .vm-bus.pgm .vm-btn.sel{background:var(--state-alarm,#ff3b3b);color:#fff;}
        .vm-bus.pvw .vm-btn.sel{background:var(--state-ok,#39d98a);color:#000;}
        .vm-btn.shiftkey{background:#241a26;color:#e0c6ec;border-left-color:var(--magenta,#ff00ff);width:78px;}
        .vm-btn.shiftkey.on{background:var(--magenta,#ff00ff);color:#000;}

        /* Console sections (Corner Law: 16 outer / 8 inner nests) */
        .vm-console{display:flex;gap:16px;align-items:stretch;flex-wrap:wrap;}
        .vm-sec{background:#0a0f1c;border-radius:16px;border-left:6px solid var(--ed-color,#646DCC);padding:12px 16px;display:flex;flex-direction:column;}
        .vm-sec .ed-h{margin-top:0;}
        .vm-trans,.vm-keys,.vm-scenes{display:flex;flex-direction:column;gap:8px;}
        .vm-transrow,.vm-keyrow{display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;flex:1;align-content:flex-start;}
        .vm-transrow > *, .vm-keyrow > * { flex: 1 1 auto; text-align: center; justify-content: center; display: flex; align-items: center; }
        .vm-tbtn{padding:12px 22px;border-radius:16px;background:#202c46;border:none;
            color:#cfe0ff;cursor:pointer;font-weight:900;letter-spacing:1px;font-size:12px;text-align:center;}
        .vm-tbtn.sel{background:var(--cyan,#00ffff);color:#000;}
        .vm-tbtn.take{background:var(--state-alarm,#ff3b3b);color:#fff;}
        .vm-tbtn.vm-ab{padding:8px 14px;}
        .vm-key{padding:12px 16px;border-radius:16px 8px 8px 16px;background:#2a2440;border:none;
            color:#d8c8ff;cursor:pointer;font-weight:bold;text-align:center;letter-spacing:1px;}
        .vm-key.on{background:var(--state-onair,#ffaa00);color:#000;}
        .vm-key .cfg{margin-left:8px;opacity:.7;cursor:pointer;}
        .vm-scenebtn{padding:10px 16px;border-radius:16px 8px 8px 16px;background:#17233c;border:none;
            color:#cfe0ff;cursor:pointer;font-weight:900;letter-spacing:1px;font-size:11px;}
        .vm-scenebtn:hover{filter:brightness(1.3);}

        /* Drawers (keyer setup / DVE editor / M-E presets) */
        .vm-drawer{background:#0a0f1c;border:1px solid #2c3a5a;border-left:6px solid var(--sig-program,#646DCC);
            border-radius:16px;padding:12px 16px;display:flex;flex-direction:column;gap:10px;}
        .vm-drawerhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .vm-drawerhead .vm-h{margin:0;color:var(--cyan,#00ffff);}
        .vm-axes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px 18px;}
        .vm-axis{display:flex;align-items:center;gap:8px;}
        .vm-axislab{width:54px;flex:0 0 auto;font:800 10px 'Courier New',monospace;letter-spacing:1px;color:#8fb0d0;}
        .vm-range{flex:1;accent-color:var(--cyan,#00ffff);}
        .vm-rangeval{width:40px;text-align:right;font:800 11px 'Courier New',monospace;color:#cfe0ff;}

        /* DVE Stage */
        .vm-dve-stage{position:relative;width:100%;aspect-ratio:16/9;background:#04070e;overflow:hidden;border:2px solid #394a63;border-radius:12px;margin:10px 0;}
        .vm-dve-frame{position:absolute;inset:22%;pointer-events:none;}
        .vm-dve-frame .vm-pip{pointer-events:auto;}
        .vm-dve-frame .vm-pip.ghost{opacity:.4;border:2px dashed #8fb0d0;background:transparent;z-index:1;}
        .vm-dve-frame .vm-pip.solid{border:2px solid var(--state-ok,#39d98a);background:rgba(57,217,138,0.2);z-index:2;}
        .vm-handle.corner{position:absolute;width:12px;height:12px;background:#fff;border:2px solid #000;border-radius:50%;cursor:crosshair;z-index:10;}
        .vm-handle.tl{top:-6px;left:-6px;} .vm-handle.tr{top:-6px;right:-6px;}
        .vm-handle.bl{bottom:-6px;left:-6px;} .vm-handle.br{bottom:-6px;right:-6px;}
        .vm-move-body{position:absolute;inset:10px;cursor:move;display:flex;align-items:center;justify-content:center;font:900 12px Arial;color:#fff;text-shadow:0 1px 2px #000;user-select:none;}

        /* CHIRALITY — mirror the control surface in left-hand mode; the stage
           (PGM|T-bar|PVW) opts out via .chir-exempt (operator pref can opt in). */
        html[data-chirality="left"] .vm-root{direction:rtl;}
        html[data-chirality="left"] .vm-root > *{direction:ltr;}
        html[data-chirality="left"] .vm-root > .vm-stage:not(.chir-exempt){direction:rtl;}
        html[data-chirality="left"] .vm-busrow{flex-direction:row-reverse;}
        html[data-chirality="left"] .vm-buslabel{border-radius:16px 6px 6px 16px;}
        html[data-chirality="left"] .vm-metab{border-radius:8px 16px 16px 8px;}
    `,
  );
}
