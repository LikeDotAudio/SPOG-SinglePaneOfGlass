// src/ui/console/user-menu — the operator's MENU, docked beside the Captain's
// Log at the head of the sources rail. The bottom corners stay lean (chat +
// MQTT chip + clock/schedule only); everything that is a PER-SEAT setting or
// utility nests here instead of sprawling across the chrome:
//   ACADEMY · 1990s VIEW · COLOUR & VISION (display) · CHIRALITY · CREDITS
//   + EXPORT / IMPORT the whole seat (.spog file).
//
// The scattered buttons are ADOPTED — their DOM nodes (with their click
// handlers, live repaint listeners, and icon-face tiles already stamped by
// chrome-icons) are MOVED into the panel, so behavior is identical in both
// LCARS and ICON faces and none of the owning modules change. The credit
// byline (with the live .app-version / NEW BUILD chip) rides in here too;
// build-watch also pulses this menu's launcher so a pending deploy is visible
// while the menu is closed.

import { addStyles } from '../dom.js';
import { exportSeat, importSeat, type SeatExport } from '../../platform/prefs.js';
import { tileDataUrl } from '../icon-tiles.js';

const UM_CSS = `
.um-btn{display:block;z-index:1000;background:#3FC1C9;color:#06202a;border:none;
  font-family:'Courier New',monospace;font-weight:900;letter-spacing:2px;text-transform:uppercase;
  padding:9px 16px;margin-bottom:10px;border-radius:18px 6px 6px 18px;cursor:pointer;
  box-shadow:inset 6px 0 0 #2a8b91;text-align:left;white-space:nowrap;}
.um-btn:hover{background:#7fe3e9;color:#000;}
.um-btn.stale{animation:um-pulse 1.2s infinite;background:#7a1f2a;color:#ffe;}
@keyframes um-pulse{0%,100%{box-shadow:inset 6px 0 0 #4a0f16,0 0 0 0 rgba(255,60,60,.5);}50%{box-shadow:inset 6px 0 0 #4a0f16,0 0 12px 3px rgba(255,60,60,.5);}}
.um-panel{position:fixed;z-index:2650;display:none;flex-direction:column;gap:7px;padding:12px;
  min-width:250px;background:#0a0f1e;border:1px solid #24304e;border-radius:14px;
  box-shadow:0 14px 44px rgba(0,0,0,.7);font-family:Arial,Helvetica,sans-serif;}
.um-panel.open{display:flex;}
.um-h{font:900 9px 'Courier New',monospace;letter-spacing:2px;color:#5a6a86;text-transform:uppercase;
  padding:2px 4px;}
/* Adopted chrome buttons: strip their fixed-corner positioning, make each a
   full-width menu row. Their own colours/handlers/icon tiles ride along. */
.um-panel .tut-help,.um-panel .rv-btn,.um-panel .chir-toggle,.um-panel .palette-toggle{
  position:static !important;display:flex !important;align-items:center;justify-content:flex-start;
  gap:10px;width:100%;box-sizing:border-box;text-align:left;border-radius:10px;opacity:1;margin:0;
  padding:9px 14px;line-height:normal;}
.um-panel .credit-button{position:static;display:flex;align-items:center;gap:10px;width:100%;
  box-sizing:border-box;border-radius:10px;white-space:normal;line-height:1.6;opacity:1;text-align:left;}
/* Every menu row leads with its squircle tile — visible in BOTH faces. */
.um-ico{width:20px;height:20px;flex:0 0 auto;display:inline-block;}
/* Small toggles carry no words of their own — label them inside the menu. */
.um-panel [data-um-label]::after{content:attr(data-um-label);
  font:900 11px 'Courier New',monospace;letter-spacing:2px;}
.um-seat{display:flex;align-items:center;gap:8px;border-top:1px solid #1a2440;padding-top:10px;
  color:#5a6a86;font:900 9px 'Courier New',monospace;letter-spacing:2px;}
.um-seat button{border:none;border-radius:10px;padding:7px 13px;cursor:pointer;
  font:900 10px 'Courier New',monospace;letter-spacing:1px;background:#16233d;color:#bcd3ee;}
.um-seat button:hover{filter:brightness(1.3);}
/* ICON FACE: lcars.css turns these chrome buttons into 34px tiles pinned to the
   clock row (position:fixed !important, font-size:0). Inside the menu they must
   stay MENU ROWS — the .um-ico leads each row, so the row itself reads as text
   in both faces. Higher specificity + later injection beats the face rules. */
html[data-face="icons"] .um-panel .tut-help.has-face-icon,
html[data-face="icons"] .um-panel .rv-btn.has-face-icon,
html[data-face="icons"] .um-panel .chir-toggle.has-face-icon,
html[data-face="icons"] .um-panel .palette-toggle.has-face-icon{
  position:static !important;left:auto !important;right:auto !important;
  top:auto !important;bottom:auto !important;
  width:100% !important;min-width:0 !important;height:auto !important;
  display:flex !important;align-items:center;justify-content:flex-start;gap:10px;
  background:#0d1322 !important;color:#bcd3ee !important;
  font-size:11px !important;letter-spacing:2px !important;font-weight:900;
  padding:9px 14px !important;border-radius:10px !important;}
html[data-face="icons"] .um-panel .credit-button.has-face-icon{
  position:static !important;width:100% !important;height:auto !important;
  background:#0d1322 !important;color:#bcd3ee !important;font-size:10px !important;}
`;

function seatRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'um-seat';
  row.innerHTML = `MY SEAT
    <button data-um-export title="Download every preference, layout and draft on this seat (.spog)">EXPORT</button>
    <button data-um-import title="Restore a .spog seat file (reloads the console)">IMPORT</button>`;
  row.querySelector('[data-um-export]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportSeat(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SPOG-PREF-${new Date().toISOString().slice(0, 10)}.spog`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  row.querySelector('[data-um-import]')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.spog,application/json';
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) return;
      void f.text().then((txt) => {
        if (importSeat(JSON.parse(txt) as SeatExport)) location.reload();
      }).catch(() => { /* unreadable file — leave the seat untouched */ });
    });
    input.click();
  });
  return row;
}

/** Mount the MENU button beside the Captain's Log and adopt the seat chrome.
 *  Call AFTER every owning init (academy, router-view, colour, chirality, the
 *  credit row) and BEFORE initChromeIcons (tiles stamp by selector, so adopted
 *  nodes are stamped in place). */
export function initUserMenu(): void {
  addStyles('user-menu-styles', UM_CSS);
  if (document.querySelector('.um-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'um-btn';
  btn.textContent = '☰ MENU';
  btn.title = 'Seat menu — Academy, views, display, chirality, credits, seat export/import';

  const panel = document.createElement('div');
  panel.className = 'um-panel';
  const head = document.createElement('div');
  head.className = 'um-h';
  head.textContent = 'seat · settings & views';
  panel.appendChild(head);

  // Adopt the scattered chrome (order = menu order). Missing nodes just skip.
  // Each row leads with its squircle tile so the menu reads iconically in the
  // LCARS face too (the ICON face additionally reskins the row itself).
  const lead = (n: HTMLElement, tileId: string): void => {
    const url = tileDataUrl(tileId);
    if (!url || n.querySelector('.um-ico')) return;
    const img = document.createElement('img');
    img.className = 'um-ico';
    img.src = url;
    img.alt = '';
    n.prepend(img);
  };
  ([['.tut-help', '', 'academy'], ['.rv-btn', '', '1990s-view'],
    ['.palette-toggle', 'COLOUR & VISION', 'settings'], ['.chir-toggle', 'CHIRALITY', 'chirality']] as const)
    .forEach(([sel, label, tileId]) => {
      const n = document.querySelector<HTMLElement>(sel);
      if (!n) return;
      if (label) n.dataset['umLabel'] = label;
      lead(n, tileId);
      panel.appendChild(n);
    });
  const credit = document.querySelector<HTMLElement>('.credit-button');
  if (credit) { lead(credit, 'credits'); panel.appendChild(credit); }
  // The old fixed byline row is empty once its children moved — drop it.
  const creditRow = document.querySelector('.credit-row');
  if (creditRow && creditRow.childElementCount === 0) creditRow.remove();

  panel.appendChild(seatRow());
  document.body.appendChild(panel);

  const close = (): void => panel.classList.remove('open');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.classList.contains('open')) { close(); return; }
    panel.classList.add('open');
    // Anchor under the launcher, clamped to the viewport (works either chirality).
    const r = btn.getBoundingClientRect();
    const w = panel.getBoundingClientRect().width || 260;
    panel.style.top = `${Math.round(r.bottom + 8)}px`;
    panel.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, r.left)))}px`;
  });
  document.addEventListener('click', (e) => { if (!panel.contains(e.target as Node) && e.target !== btn) close(); });
  // Any row that opens ANOTHER window (Academy, 1990s view, Colour & Vision,
  // chirality relayout, credits) leaves the menu stranded on top of it — close
  // on the way out. The seat row (EXPORT/IMPORT) keeps the menu open.
  panel.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.tut-help,.rv-btn,.palette-toggle,.chir-toggle,.credit-button')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Beside the Captain's Log: same host row, right after the log button.
  const cl = document.querySelector('.cl-btn');
  if (cl?.parentElement) cl.after(btn);
  else (document.querySelector('.au-corner') ?? document.querySelector('.ingress-panel') ?? document.body).prepend(btn);
}
