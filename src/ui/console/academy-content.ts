// src/ui/console/academy-content — static data + styles for the Academy overlay,
// split out of academy.ts to keep the logic module small. Holds the 5 walkthrough
// STEPS, the marker ANCHORS, the ACADEMY_CSS stylesheet and the legacy STORE_KEY.

// Legacy key, kept verbatim for continuity across the JS→TS cutover.
export const STORE_KEY = 'twist-tutorial-dismissed';

export const STEPS: Array<{ title: string; body: string }> = [
  { title: 'Choose where you’re working',
    body: 'Select the production, control room, edit suite, encoder or floor you want to do production in — from the tabs along the bottom.' },
  { title: 'Pick your sources',
    body: 'In the sources rail, choose the playout, production output, video source and audio you want to use.' },
  { title: 'Drag them into a production',
    body: 'Drag the sources onto a production’s twists to route them in.' },
  { title: 'Push & hold to break it up',
    body: 'Press and hold a source to expand a stage box into its individual video + audio feeds.' },
  { title: 'Click to take control',
    body: 'Click a production element in the destination to open its controls (vision mixer, multiviewer, audio mixer, intercom…).' },
];

export const ACADEMY_CSS = `
.tut-overlay{position:fixed;inset:0;z-index:3000;display:none;align-items:center;justify-content:center;
  background:rgba(2,5,12,.6);backdrop-filter:blur(1.5px);font-family:Arial,Helvetica,sans-serif;}
.tut-overlay.open{display:flex;}
/* Numbered markers dropped onto the live console beneath — each step's badge sits
   on the region it teaches (anchors resolved from the DOM, so they follow chirality). */
.tut-marks{position:absolute;inset:0;pointer-events:none;}
.tut-mark{position:absolute;transform:translate(-50%,-50%);width:44px;height:44px;
  border-radius:14px 5px 14px 5px;background:var(--tut-color,#FF9C63);color:#000;
  font-weight:900;font-size:20px;display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 0 3px rgba(0,0,0,.55),0 0 24px rgba(255,156,99,.75);transition:scale .15s;}
.tut-mark.hot{scale:1.25;}
.tut-mark::after{content:'';position:absolute;inset:-8px;border-radius:inherit;
  border:2px solid var(--tut-color,#FF9C63);animation:tut-pulse 1.6s infinite;}
@keyframes tut-pulse{0%{transform:scale(.9);opacity:.7}100%{transform:scale(1.4);opacity:0}}
.tut-card{width:min(620px,92vw);max-height:88vh;overflow:auto;background:#070c18;
  border:2px solid #2c3a5a;border-radius:18px;box-shadow:0 18px 60px rgba(0,0,0,.6);}
.tut-head{display:flex;align-items:stretch;height:46px;background:var(--tut-color,#FF9C63);
  border-radius:16px 16px 0 0;overflow:hidden;}
.tut-title{flex:1;display:flex;align-items:center;padding-left:78px;color:#000;font-weight:900;
  letter-spacing:3px;font-size:15px;text-transform:uppercase;}
.tut-x{flex:0 0 auto;width:56px;display:flex;align-items:center;justify-content:center;cursor:pointer;
  color:#000;font-size:26px;font-weight:bold;box-shadow:inset 2px 0 0 rgba(0,0,0,.25);}
.tut-x:hover{background:rgba(0,0,0,.18);}
.tut-body{padding:18px 22px 8px;}
.tut-step{display:flex;gap:16px;align-items:flex-start;padding:11px 0;border-bottom:1px solid #16223c;}
.tut-step:last-child{border-bottom:none;}
.tut-num{flex:0 0 auto;width:40px;height:40px;border-radius:12px 4px 12px 4px;
  background:var(--tut-color,#FF9C63);color:#000;font-weight:900;font-size:18px;
  display:flex;align-items:center;justify-content:center;}
.tut-text h4{margin:2px 0 3px;color:#e0f0ff;font-size:14px;letter-spacing:1px;}
.tut-text p{margin:0;color:#9fb6cc;font-size:13px;line-height:1.45;}
.tut-foot{display:flex;align-items:center;justify-content:space-between;gap:14px;
  padding:12px 22px 20px;flex-wrap:wrap;}
.tut-again{display:flex;align-items:center;gap:8px;color:#7e93b5;font-size:12px;cursor:pointer;user-select:none;}
.tut-again input{width:16px;height:16px;accent-color:var(--tut-color,#FF9C63);cursor:pointer;}
.tut-go{border:none;border-radius:18px;background:var(--tut-color,#FF9C63);color:#000;
  font-weight:900;letter-spacing:2px;font-size:13px;padding:12px 30px;cursor:pointer;}
.tut-go:hover{filter:brightness(1.1);}
.tut-new{margin:0 22px 10px;padding:9px 12px;border-radius:10px;background:#0d1322;
  color:#9fb6cc;font-size:11px;line-height:1.5;}
.tut-new b{color:var(--tut-color,#FF9C63);letter-spacing:1px;}
/* ACADEMY button: static pill — rides the credit-row or the seat menu. */
.credit-row .tut-help,.um-panel .tut-help{position:static;border:none;border-radius:18px 6px 6px 18px;
  background:var(--tut-color,#FF9C63);color:#000;font-weight:900;letter-spacing:2px;
  font-size:11px;text-transform:uppercase;padding:6px 14px 6px 12px;cursor:pointer;
  box-shadow:inset 4px 0 0 #c97a16;white-space:nowrap;}
.tut-help:hover{filter:brightness(1.1);}
`;

// Where each step's marker lands on the console beneath. Anchors are resolved
// live from the DOM (never hardcoded sides) so they follow chirality; each entry
// is [selector-chain, fx, fy] — the fraction of the matched rect to sit at.
export const ANCHORS: Array<[string[], number, number]> = [
  [['#production-tabs'], 0.5, 0.5],                                        // 1 · dest tabs (bottom)
  [['#sources'], 0.5, 0.22],                                               // 2 · sources rail
  [['#production-content .twist-container', '#production-content'], 0.3, 0.35], // 3 · drag target
  [['#sources [draggable="true"]', '#sources'], 0.5, 0.55],                // 4 · a source node
  [['#production-content .twist-container', '#production-content'], 0.3, 0.72],  // 5 · take control
];
