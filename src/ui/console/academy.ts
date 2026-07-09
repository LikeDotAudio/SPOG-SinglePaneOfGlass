// src/ui/console/academy — the first-load "quick start" overlay (port of
// archive/js/tutorial.js). A short, LCARS-styled 5-step walkthrough shown once
// on boot; dismissible (START / × / Esc / backdrop), "don't show again" is
// remembered in localStorage under the SAME key the legacy build used, so
// operators who dismissed it there stay dismissed here. The ACADEMY button
// docks into the .credit-row beside the byline (like the 1990s-VIEW launcher)
// and reopens it anytime.
import { addStyles } from '../dom.js';
import { STEPS, ANCHORS, ACADEMY_CSS, STORE_KEY } from './academy-content.js';

// The build stamp baked in at bundle time (main.ts owns it); shown in the Quick
// Start header so operators can read the running version at a glance.
declare const __BUILD_ID__: { short: string; full: string } | undefined;
const BUILD_VERSION = (typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__) ? __BUILD_ID__.short : 'dev';

let overlay: HTMLElement | null = null;

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
      <div class="tut-head"><span class="tut-title">SPOGFLEET Academy — Quick Start <span class="tut-ver" style="opacity:.7;font-weight:normal;font-size:.8em;">· ${BUILD_VERSION}</span></span><span class="tut-x" title="Close">&times;</span></div>
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
    </div>`;
  document.body.appendChild(overlay);

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
