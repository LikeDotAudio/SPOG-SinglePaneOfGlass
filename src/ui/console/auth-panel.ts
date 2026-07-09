// src/ui/console/auth-panel — the user-control UI (port of js/auth.js's DOM half):
//   • .au-corner (sources top) — LOG OUT + (admin) RIGHTS beside the log button
//   • .au-focus  (top-centre)  — the role's priority-task banner (4.2s on switch)
//   • login overlay            — pick a role (context-aware scope loads)
//   • rights overlay           — the roles × capabilities matrix, editable live
// Reads/writes role state via platform/auth (setRole/can/onRoleChange). applyScope
// hides [data-cap] controls the current role can't operate (progressive disclosure).
import { addStyles } from '../dom.js';
import type { Capability, Role } from '../../model/index.js';
import { ROLES, role, setRole, onRoleChange, operator, setOperator } from '../../platform/auth.js';
import { exportSeat, importSeat, type SeatExport } from '../../platform/prefs.js';
import { logAction } from './captains-log.js';
import { stampIcon } from '../icon-face.js';

// applyScope (the progressive-disclosure sweep) lives in scope.ts — re-exported
// here so the ~4 modules that import it from auth-panel stay byte-identical.
import { applyScope } from './scope.js';
export { applyScope };

const AUTH_CSS = `
.au-focus{position:fixed;left:50%;top:0;transform:translate(-50%,-110%);z-index:1600;background:#0a1326;border:1px solid var(--rc,#F2B74B);border-top:none;border-radius:0 0 14px 14px;padding:11px 26px;color:#e0f0ff;font:bold 13px sans-serif;letter-spacing:1px;box-shadow:0 8px 22px rgba(0,0,0,.5);transition:transform .35s cubic-bezier(.2,1.2,.4,1);white-space:nowrap;}
.au-focus.show{transform:translate(-50%,0);}
.au-focus b{color:var(--rc,#F2B74B);}
.au-overlay{position:fixed;inset:0;z-index:3200;display:none;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 30%,rgba(13,23,48,.92),rgba(3,6,15,.96));font-family:Arial,Helvetica,sans-serif;}
.au-overlay.open{display:flex;}
.au-box{width:min(880px,94vw);max-height:90vh;overflow:auto;background:#0a1326;border:1px solid #1d2942;border-radius:16px;padding:26px;}
.au-box h2{margin:0 0 4px;color:#fff;font-size:22px;letter-spacing:2px;}
.au-box p{margin:0 0 20px;color:#7e93b5;font-size:12px;letter-spacing:1px;}
.au-roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;}
.au-role{text-align:left;border-radius:12px;border:1px solid #2c3e5e;background:#0c1730;padding:14px;cursor:pointer;transition:.15s;}
.au-role:hover{background:#13233c;transform:translateY(-2px);}
.au-role .tag{display:inline-block;font:900 9px sans-serif;letter-spacing:1px;text-transform:uppercase;color:#0a1206;border-radius:5px;padding:3px 7px;margin-bottom:8px;}
.au-role b{display:block;color:#fff;font-size:15px;letter-spacing:1px;}
.au-role .ti{color:#9fb6cc;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin:2px 0 6px;}
.au-role .ds{color:#aec6e4;font-size:11px;line-height:1.4;}
.au-role.sel{border-color:#F2B74B;box-shadow:0 0 14px rgba(242,183,75,.4);}
/* Operator-name row in the role picker. */
.au-namerow{display:flex;align-items:center;gap:12px;margin:0 0 16px;font:900 10px sans-serif;
  letter-spacing:2px;color:#8fb4d8;}
.au-name{flex:1;background:#03060f;border:1px solid #35507a;border-radius:6px;color:#e0f0ff;
  padding:9px 12px;font:14px Arial;}
.au-name:focus{outline:none;border-color:var(--rc,#F2B74B);}
/* MY SEAT — portable-preferences export/import (moved out of the Academy). */
.au-seat{display:flex;align-items:center;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid #1d2942;
  font:900 10px sans-serif;letter-spacing:2px;color:#8fb4d8;}
.au-seat button{border:1px solid #35507a;background:#0c1730;color:#EAF2FF;cursor:pointer;
  font:900 10px sans-serif;letter-spacing:1px;text-transform:uppercase;padding:7px 13px;border-radius:6px 12px 12px 6px;}
.au-seat button:hover{filter:brightness(1.3);}
.au-seat span{font-weight:normal;letter-spacing:1px;color:#7e93b5;text-transform:none;}
/* RIGHTS + LOG OUT corner pills — head of the sources rail, ONE row with the
   log button (captains-log.ts seats .cl-btn as this row's first child). */
.au-corner{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;align-items:stretch;}
.au-corner .cl-btn{flex:1 1 120px;width:auto;min-width:0;margin-bottom:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.au-corner .um-btn{flex:0 1 auto;min-width:0;margin-bottom:0;overflow:hidden;text-overflow:ellipsis;}
.au-corner button{flex:1 1 auto;min-width:0;border:none;cursor:pointer;font:900 10px sans-serif;letter-spacing:1px;
  text-transform:uppercase;padding:8px 10px;border-radius:6px 14px 14px 6px;white-space:nowrap;}
.au-c-rights{display:none;background:#13233c;color:#FFD97A;border:1px solid rgba(255,255,255,.22) !important;}
.au-corner.admin .au-c-rights{display:block;}
.au-c-out{background:#0c1730;color:#EAF2FF;border:1px solid rgba(255,255,255,.22) !important;}
.au-corner button:hover{filter:brightness(1.25);}
/* ICON face: the corner pair render as tiles (icon-face stamps the artwork). */
html[data-face="icons"] .au-corner button.has-face-icon{
  flex:0 0 46px;width:46px;height:46px;padding:0;border-radius:12px;font-size:0;color:transparent;
  background:var(--face-icon) center/contain no-repeat !important;}
html[data-face="icons"] .au-corner button.has-face-icon:hover{
  background-image:var(--face-icon-hover,var(--face-icon)) !important;filter:none;}
.au-matrix{display:grid;gap:6px;align-items:center;}
.au-mh{font:bold 9px sans-serif;color:#9fb6cc;letter-spacing:1px;text-transform:uppercase;text-align:center;}
.au-mr{font:bold 13px sans-serif;color:#cfe6ff;padding-right:8px;}
.au-mr small{display:block;color:#7e93b5;font-size:9px;font-weight:normal;letter-spacing:1px;text-transform:uppercase;}
.au-cell{height:32px;border-radius:6px;border:1px solid #2c3e5e;background:#0c1730;cursor:pointer;transition:.1s;}
.au-cell:hover{border-color:#6FC8F0;} .au-cell.on{background:var(--cc,#39d353);border-color:var(--cc,#39d353);}
.au-cell.lock{opacity:.45;cursor:not-allowed;}
.au-rnote{margin-top:14px;color:#6b82a3;font-size:11px;letter-spacing:1px;}`;

const CAPS: Array<[Capability, string]> = [
  ['switch', 'Switch'], ['route', 'Route'], ['signal', 'Signal'], ['shade', 'Shade'], ['audio', 'Audio'],
  ['gfx', 'Graphics'], ['comms', 'Comms'], ['book', 'Booking'], ['view', 'View'],
  ['build', 'Build'], ['arrange', 'Arrange'], ['admin', 'Admin'],
];

const capLine = (r: Role): string =>
  r.caps.admin ? 'All systems' : (Object.keys(r.caps).map((k) => k.toUpperCase()).join(' · ') || 'View only');

export function initAuthPanel(): void {
  if (document.querySelector('.au-corner')) return;
  addStyles('auth-styles', AUTH_CSS);

  // RIGHTS + LOG OUT live in the sources-top corner, beside the log button
  // (the badge keeps only the seat identity). Both carry ICON-face tiles.
  const corner = document.createElement('div');
  corner.className = 'au-corner';
  const bRights = document.createElement('button');
  bRights.className = 'au-c-rights';
  bRights.title = 'Edit user rights';
  bRights.textContent = '⚙ RIGHTS';
  const bOut = document.createElement('button');
  bOut.className = 'au-c-out';
  bOut.title = 'Log out — pick a seat';
  bOut.textContent = 'LOG OUT';
  corner.append(bRights, bOut);
  const ingress = document.querySelector<HTMLElement>('.ingress-panel');
  if (ingress) ingress.insertBefore(corner, ingress.firstChild); else document.body.appendChild(corner);
  stampIcon(bRights, 'chrome', 'rights');
  stampIcon(bOut, 'chrome', 'log-out');

  const focus = document.createElement('div');
  focus.className = 'au-focus';
  document.body.appendChild(focus);

  // login overlay (role picker)
  const login = document.createElement('div');
  login.className = 'au-overlay';
  login.innerHTML = `<div class="au-box"><h2>SPOG · SINGLE PANE OF GLASS</h2><p>SELECT ROLE · context-aware scope loads for the live production</p>
    <label class="au-namerow">OPERATOR NAME<input class="au-name" type="text" placeholder="Who is taking this seat?" spellcheck="false" maxlength="40"></label>
    <div class="au-roles"></div>
    <div class="au-seat">MY SEAT —
      <button data-seat-export title="Download every preference, layout and draft on this seat as one file">EXPORT</button>
      <button data-seat-import title="Restore a seat file (reloads the console)">IMPORT</button>
      <span>preferences travel with you</span>
    </div></div>`;
  const nameInput = login.querySelector<HTMLInputElement>('.au-name')!;
  nameInput.value = operator();
  const rolesHost = login.querySelector<HTMLElement>('.au-roles')!;
  const roleCards: HTMLElement[] = [];
  ROLES.forEach((r) => {
    const card = document.createElement('button');
    card.className = 'au-role';
    card.innerHTML = `<span class="tag" style="background:${r.color}">${r.tier}</span><b>${r.name}</b><div class="ti">${r.sub || ''} · ${capLine(r)}</div><div class="ds">${r.task}</div>`;
    card.addEventListener('click', () => {
      const sameWatch = role().id === r.id && operator() === nameInput.value.trim();
      setOperator(nameInput.value);   // the human signs the seat — stamped on log actions
      setRole(r);
      // Taking a seat is a crew event — narrate it to the log (signed() appends
      // "· by <operator>"). Re-clicking the same seat + name is not a new watch.
      if (!sameWatch) logAction(`⭑ CREW — joined the crew as ${r.name}${r.sub ? ` · ${r.sub}` : ''} (${r.tier} division)`);
      login.classList.remove('open');
    });
    rolesHost.appendChild(card);
    roleCards.push(card);
  });
  login.addEventListener('click', (e) => { if (e.target === login) login.classList.remove('open'); });
  // "My seat" — the whole operator setup as one portable blob (audit §3.3). Lives on
  // the seat/login overlay now (was in the Academy quick-start).
  login.querySelector('[data-seat-export]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportSeat(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SPOG-PREF-${new Date().toISOString().slice(0, 10)}.spog`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  login.querySelector('[data-seat-import]')?.addEventListener('click', () => {
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
  document.body.appendChild(login);

  // rights overlay (roles × capabilities matrix)
  const rights = document.createElement('div');
  rights.className = 'au-overlay';
  rights.innerHTML = `<div class="au-box"><h2>EDIT USER RIGHTS</h2><p>CAPTAIN · ADMINISTRATIVE — toggle each role's capabilities</p><div class="au-matrix"></div><div class="au-rnote">Changes apply live to the capability gate — the basis for control-lock & progressive disclosure.</div></div>`;
  rights.addEventListener('click', (e) => { if (e.target === rights) rights.classList.remove('open'); });
  document.body.appendChild(rights);
  const matrix = rights.querySelector<HTMLElement>('.au-matrix')!;
  matrix.style.gridTemplateColumns = `170px repeat(${CAPS.length},1fr)`;
  matrix.innerHTML = '<div></div>';
  CAPS.forEach(([, l]) => { const h = document.createElement('div'); h.className = 'au-mh'; h.textContent = l; matrix.appendChild(h); });
  ROLES.forEach((r) => {
    const nm = document.createElement('div'); nm.className = 'au-mr'; nm.innerHTML = `${r.name}<small>${r.tier}</small>`; matrix.appendChild(nm);
    CAPS.forEach(([k]) => {
      const cell = document.createElement('div');
      cell.className = 'au-cell' + (r.caps[k] ? ' on' : '') + (r.id === 'ep' ? ' lock' : '');
      cell.style.setProperty('--cc', r.color);
      cell.addEventListener('click', () => {
        if (r.id === 'ep') return;                     // Captain stays full admin
        if (r.caps[k]) delete r.caps[k]; else r.caps[k] = 1;
        cell.classList.toggle('on', !!r.caps[k]);
      });
      matrix.appendChild(cell);
    });
  });

  bOut.addEventListener('click', () => login.classList.add('open'));
  bRights.addEventListener('click', () => rights.classList.add('open'));

  let focusTimer: ReturnType<typeof setTimeout> | undefined;
  onRoleChange((r) => {
    document.documentElement.style.setProperty('--rc', r.color);
    focus.style.setProperty('--rc', r.color);
    corner.classList.toggle('admin', !!r.caps.admin);   // RIGHTS shows for admin only
    document.body.className = document.body.className.replace(/\brole-\w+\b/g, '').trim() + ' role-' + r.id;
    roleCards.forEach((c, i) => c.classList.toggle('sel', ROLES[i]?.id === r.id));
    focus.innerHTML = `Priority Task · <b>${r.task}</b>`;
    focus.classList.add('show');
    if (focusTimer) clearTimeout(focusTimer);
    focusTimer = setTimeout(() => focus.classList.remove('show'), 4200);
    applyScope();
  });

  setRole(role());   // initialise the badge/focus for the default Captain
}
