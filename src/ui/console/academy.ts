// src/ui/console/academy — the first-load "quick start" overlay (port of
// archive/js/tutorial.js). A short, LCARS-styled 5-step walkthrough shown once
// on boot; dismissible (START / × / Esc / backdrop), "don't show again" is
// remembered in localStorage under the SAME key the legacy build used, so
// operators who dismissed it there stay dismissed here. The ACADEMY button
// docks into the .credit-row beside the byline (like the 1990s-VIEW launcher)
// and reopens it anytime.
import { addStyles } from '../dom.js';
import { exportSeat, importSeat, type SeatExport } from '../../platform/prefs.js';

// Legacy key, kept verbatim for continuity across the JS→TS cutover.
const STORE_KEY = 'twist-tutorial-dismissed';

const STEPS: Array<{ title: string; body: string }> = [
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

const ACADEMY_CSS = `
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
.tut-seat{display:flex;gap:8px;align-items:center;padding:0 22px 16px;color:#7e93b5;font-size:11px;}
.tut-seat button{border:none;border-radius:12px;padding:7px 14px;cursor:pointer;
  font-weight:900;letter-spacing:1px;font-size:10px;text-transform:uppercase;
  background:#16233d;color:#bcd3ee;}
.tut-seat button:hover{filter:brightness(1.25);}
/* ACADEMY button: static pill — rides the credit-row or the seat menu. */
.credit-row .tut-help,.um-panel .tut-help{position:static;border:none;border-radius:18px 6px 6px 18px;
  background:var(--tut-color,#FF9C63);color:#000;font-weight:900;letter-spacing:2px;
  font-size:11px;text-transform:uppercase;padding:6px 14px 6px 12px;cursor:pointer;
  box-shadow:inset 4px 0 0 #c97a16;white-space:nowrap;}
.tut-help:hover{filter:brightness(1.1);}
`;

let overlay: HTMLElement | null = null;

// Where each step's marker lands on the console beneath. Anchors are resolved
// live from the DOM (never hardcoded sides) so they follow chirality; each entry
// is [selector-chain, fx, fy] — the fraction of the matched rect to sit at.
const ANCHORS: Array<[string[], number, number]> = [
  [['#production-tabs'], 0.5, 0.5],                                        // 1 · dest tabs (bottom)
  [['#sources'], 0.5, 0.22],                                               // 2 · sources rail
  [['#production-content .twist-container', '#production-content'], 0.3, 0.35], // 3 · drag target
  [['#sources [draggable="true"]', '#sources'], 0.5, 0.55],                // 4 · a source node
  [['#production-content .twist-container', '#production-content'], 0.3, 0.72],  // 5 · take control
];

function placeMarks(): void {
  const layer = overlay?.querySelector<HTMLElement>('.tut-marks');
  if (!layer) return;
  layer.innerHTML = '';
  const card = overlay?.querySelector('.tut-card')?.getBoundingClientRect();
  ANCHORS.forEach(([sels, fx, fy], i) => {
    // First selector whose match actually has layout — collapsed/hidden nodes
    // (zero-size rects) fall through to the next, broader anchor.
    let r: DOMRect | null = null;
    for (const sel of sels) {
      for (const cand of document.querySelectorAll(sel)) {
        const cr = cand.getBoundingClientRect();
        if (cr.width && cr.height) { r = cr; break; }
      }
      if (r) break;
    }
    if (!r) return;
    let x = r.left + r.width * fx, y = r.top + r.height * fy;
    // Nudge a marker out from under the dialog card so every number stays visible.
    if (card && x > card.left - 30 && x < card.right + 30 && y > card.top - 30 && y < card.bottom + 30) {
      x = x < (card.left + card.right) / 2 ? card.left - 34 : card.right + 34;
      x = Math.max(30, Math.min(window.innerWidth - 30, x));
    }
    const m = document.createElement('div');
    m.className = 'tut-mark';
    m.dataset['n'] = String(i + 1);
    m.textContent = String(i + 1);
    m.style.left = `${x}px`; m.style.top = `${y}px`;
    layer.appendChild(m);
  });
}

function ensure(): HTMLElement {
  addStyles('academy-styles', ACADEMY_CSS);
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'tut-overlay';
  overlay.innerHTML = `
    <div class="tut-marks"></div>
    <div class="tut-card" role="dialog" aria-label="Quick start">
      <div class="tut-head"><span class="tut-title">Starfleet Academy — Quick Start</span><span class="tut-x" title="Close">&times;</span></div>
      <div class="tut-body">
        ${STEPS.map((s, i) => `
          <div class="tut-step" data-n="${i + 1}">
            <div class="tut-num">${i + 1}</div>
            <div class="tut-text"><h4>${s.title}</h4><p>${s.body}</p></div>
          </div>`).join('')}
      </div>
      <div class="tut-new"><b>WHAT’S NEW</b> — the console remembers your seat: your room,
        open groups, sash, running counters, Captain’s Log and chat all survive a reload.
        Deploys light the version badge (click it to reload). Works offline once visited.</div>
      <div class="tut-foot">
        <label class="tut-again"><input type="checkbox" data-again>Don’t show this again</label>
        <button class="tut-go" data-go>START</button>
      </div>
      <div class="tut-seat">MY SEAT —
        <button data-seat-export title="Download every preference, layout and draft on this seat as one file">EXPORT</button>
        <button data-seat-import title="Restore a seat file (reloads the console)">IMPORT</button>
        <span>preferences travel with you</span>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // "My seat" — the whole operator setup as one portable blob (audit §3.3).
  overlay.querySelector('[data-seat-export]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportSeat(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SPOG-PREF-${new Date().toISOString().slice(0, 10)}.spog`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  overlay.querySelector('[data-seat-import]')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.spog,application/json';   // .spog is JSON inside; old .json exports still import
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) return;
      void f.text().then((txt) => {
        const n = importSeat(JSON.parse(txt) as SeatExport);
        if (n) location.reload();
      }).catch(() => { /* unreadable file — leave the seat untouched */ });
    });
    input.click();
  });

  // Hovering a step lights its marker on the console beneath.
  overlay.querySelectorAll<HTMLElement>('.tut-step').forEach((step) => {
    const mark = (): HTMLElement | null =>
      overlay?.querySelector<HTMLElement>(`.tut-mark[data-n="${step.dataset['n']}"]`) ?? null;
    step.addEventListener('mouseenter', () => mark()?.classList.add('hot'));
    step.addEventListener('mouseleave', () => mark()?.classList.remove('hot'));
  });
  window.addEventListener('resize', () => {
    if (overlay?.classList.contains('open')) placeMarks();
  });

  const again = overlay.querySelector<HTMLInputElement>('[data-again]');
  const persist = (): void => { try { localStorage.setItem(STORE_KEY, again?.checked ? '1' : ''); } catch { /* storage unavailable */ } };
  overlay.querySelector('.tut-x')?.addEventListener('click', closeAcademy);
  overlay.querySelector('[data-go]')?.addEventListener('click', () => { persist(); closeAcademy(); });
  again?.addEventListener('change', persist);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAcademy(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay?.classList.contains('open')) closeAcademy();
  });
  return overlay;
}

export function openAcademy(): void {
  ensure().classList.add('open');
  placeMarks();   // after open — anchors need the console laid out and visible
}
export function closeAcademy(): void { overlay?.classList.remove('open'); }

/** Mount the ACADEMY button (credit-row) and auto-open on first load. */
export function initAcademy(): void {
  addStyles('academy-styles', ACADEMY_CSS);
  if (!document.querySelector('.tut-help')) {
    const b = document.createElement('button');
    b.className = 'tut-help';
    b.textContent = 'ACADEMY';
    b.title = 'Quick start / Academy';
    b.addEventListener('click', openAcademy);
    (document.querySelector('.credit-row') ?? document.body).appendChild(b);
  }
  let dismissed = false;
  try { dismissed = !!localStorage.getItem(STORE_KEY); } catch { /* storage unavailable */ }
  if (!dismissed) openAcademy();
}
