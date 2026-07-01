// js/auth.js — Role-based access & scope-focus (the "Context-Aware Gateway").
//
// For now EVERYTHING IS OPEN: you start logged in as the Captain (full facility
// control). A LOG OUT / SWITCH ROLE button lets you assume a traditional broadcast
// role (Director, TD, Camera Op, Shader, A1 Audio, Lighting Director, Guest). Each
// role carries a capability matrix + a "focus task" banner — the scaffolding for
// the Schedule → Timeline → Resource-Booking model (a role would normally only see
// the cameras/feeds booked to the live production, with a Request-Access workflow
// for locked resources). Capability checks are exposed via window.can() so editors
// can progressively disclose / lock controls later without rework.
(function () {
    'use strict';

    // The bridge crew of broadcast — Starfleet role · broadcast equivalent.
    const ROLES = [
        { id: 'ep', name: 'Captain', sub: 'Executive Producer', tier: 'Command', color: '#F2B74B', task: 'Final authority — creative vision & mission success. Full grid.', caps: { admin: 1 } },
        { id: 'director', name: 'First Officer', sub: 'Director', tier: 'Command', color: '#ff6a6a', task: 'Execute the vision — call the shots, manage pacing.', caps: { switch: 1, signal: 1 } },
        { id: 'td', name: 'Conn · Helm', sub: 'Technical Director', tier: 'Operations', color: '#cba6ff', task: 'Pilot the switcher — frame-accurate cuts & transitions.', caps: { switch: 1, route: 1 } },
        { id: 'ops', name: 'Ops', sub: 'System Engineer', tier: 'Operations', color: '#3FC1C9', task: 'Manage the grid — system health, routing, resource booking.', caps: { route: 1, signal: 1, book: 1 } },
        { id: 'chief', name: 'Chief Engineer', sub: 'Vision Engineer / Shader', tier: 'Engineering', color: '#6FC8F0', task: 'Signal path & colour science — shade the optical nodes.', caps: { shade: 1 } },
        { id: 'tactical', name: 'Tactical', sub: 'Graphics & AR Lead', tier: 'Operations', color: '#ffd400', task: 'On-screen overlays, AR & data visualization.', caps: { gfx: 1 } },
        { id: 'comms', name: 'Comms', sub: 'Intercom Engineer', tier: 'Operations', color: '#39d353', task: 'IFB & intercom matrix — mix-minus, ducking, talkback.', caps: { comms: 1, audio: 1 } },
        { id: 'science', name: 'Science', sub: 'Metadata & Analytics', tier: 'Operations', color: '#9fd6ff', task: 'Audience data, stream health & algorithmic performance.', caps: { view: 1 } },
    ];
    let current = ROLES[0];

    function injectStyles() {
        if (document.getElementById('auth-styles')) return;
        const s = document.createElement('style'); s.id = 'auth-styles';
        s.textContent = `
        .au-badge{position:fixed;right:34px;top:10px;z-index:1500;display:flex;align-items:center;gap:0;
            font-family:Arial,Helvetica,sans-serif;border-radius:8px 16px 16px 8px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.5);cursor:default;}
        .au-badge .who{display:flex;flex-direction:column;padding:7px 14px 7px 18px;background:var(--rc,#F2B74B);color:#0a1206;}
        .au-badge .who b{font-size:12px;font-weight:900;letter-spacing:1px;line-height:1.1;}
        .au-badge .who span{font-size:8px;letter-spacing:1px;opacity:.8;text-transform:uppercase;}
        .au-badge .out{background:#0c1730;color:#bcd3ee;border:none;padding:0 14px;align-self:stretch;font:900 10px sans-serif;letter-spacing:1px;cursor:pointer;}
        .au-badge .out:hover{background:#16243d;color:#fff;}
        .au-focus{position:fixed;left:50%;top:0;transform:translate(-50%,-110%);z-index:1600;background:#0a1326;border:1px solid var(--rc,#F2B74B);
            border-top:none;border-radius:0 0 14px 14px;padding:11px 26px;color:#e0f0ff;font:bold 13px sans-serif;letter-spacing:1px;
            box-shadow:0 8px 22px rgba(0,0,0,.5);transition:transform .35s cubic-bezier(.2,1.2,.4,1);white-space:nowrap;}
        .au-focus.show{transform:translate(-50%,0);}
        .au-focus b{color:var(--rc,#F2B74B);}
        .au-overlay{position:fixed;inset:0;z-index:3200;display:none;align-items:center;justify-content:center;
            background:radial-gradient(circle at 50% 30%,rgba(13,23,48,.92),rgba(3,6,15,.96));font-family:Arial,Helvetica,sans-serif;}
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
        .au-badge .rights{background:#13233c;color:#F2B74B;border:none;padding:0 12px;align-self:stretch;font:900 10px sans-serif;letter-spacing:1px;cursor:pointer;display:none;}
        .au-badge .rights:hover{background:#1b2f4f;} .au-badge.admin .rights{display:block;}
        .au-matrix{display:grid;gap:6px;align-items:center;}
        .au-mh{font:bold 9px sans-serif;color:#9fb6cc;letter-spacing:1px;text-transform:uppercase;text-align:center;}
        .au-mr{font:bold 13px sans-serif;color:#cfe6ff;padding-right:8px;}
        .au-mr small{display:block;color:#7e93b5;font-size:9px;font-weight:normal;letter-spacing:1px;text-transform:uppercase;}
        .au-cell{height:32px;border-radius:6px;border:1px solid #2c3e5e;background:#0c1730;cursor:pointer;transition:.1s;}
        .au-cell:hover{border-color:#6FC8F0;} .au-cell.on{background:var(--cc,#39d353);border-color:var(--cc,#39d353);}
        .au-cell.lock{opacity:.45;cursor:not-allowed;}
        .au-rnote{margin-top:14px;color:#6b82a3;font-size:11px;letter-spacing:1px;}
        `;
        document.head.appendChild(s);
    }

    let badge, overlay, focus, rights;
    const CAPS = [['switch', 'Switch'], ['route', 'Route'], ['signal', 'Signal'], ['shade', 'Shade'], ['audio', 'Audio'], ['light', 'Light'], ['gfx', 'Graphics'], ['comms', 'Comms'], ['book', 'Booking'], ['admin', 'Admin']];
    // Hide any element tagged data-cap="X" when the current role lacks capability X —
    // "the things they don't need to see disappear" (progressive disclosure).
    function applyScope(root) {
        (root || document).querySelectorAll('[data-cap]').forEach(el => { el.style.display = window.can(el.dataset.cap) ? '' : 'none'; });
    }
    function buildMatrix() {
        const host = rights.querySelector('.au-matrix');
        host.style.gridTemplateColumns = `170px repeat(${CAPS.length},1fr)`;
        host.innerHTML = '<div></div>';
        CAPS.forEach(([k, l]) => { const h = document.createElement('div'); h.className = 'au-mh'; h.textContent = l; host.appendChild(h); });
        ROLES.forEach(r => {
            const nm = document.createElement('div'); nm.className = 'au-mr'; nm.innerHTML = `${r.name}<small>${r.tier}</small>`; host.appendChild(nm);
            CAPS.forEach(([k]) => {
                const cell = document.createElement('div');
                cell.className = 'au-cell' + (r.caps[k] ? ' on' : '') + (r.id === 'captain' ? ' lock' : '');
                cell.style.setProperty('--cc', r.color);
                cell.addEventListener('click', () => {
                    if (r.id === 'captain') return;          // Captain stays full admin
                    if (r.caps[k]) delete r.caps[k]; else r.caps[k] = 1;
                    cell.classList.toggle('on', !!r.caps[k]);  // window.can() reflects this live
                });
                host.appendChild(cell);
            });
        });
    }
    function showRights() { ensureUI(); buildMatrix(); rights.classList.add('open'); }
    function ensureUI() {
        injectStyles();
        if (badge) return;
        badge = document.createElement('div'); badge.className = 'au-badge';
        badge.innerHTML = `<div class="who"><b></b><span></span></div><button class="rights" title="Edit user rights">⚙ RIGHTS</button><button class="out">LOG OUT</button>`;
        badge.querySelector('.out').addEventListener('click', showLogin);
        badge.querySelector('.rights').addEventListener('click', showRights);
        document.body.appendChild(badge);

        rights = document.createElement('div'); rights.className = 'au-overlay';
        rights.innerHTML = `<div class="au-box"><h2>EDIT USER RIGHTS</h2><p>CAPTAIN · ADMINISTRATIVE — toggle each role's capabilities</p><div class="au-matrix"></div><div class="au-rnote">Changes apply live to <code>window.can()</code> — the basis for control-lock & progressive disclosure.</div></div>`;
        rights.addEventListener('click', e => { if (e.target === rights) rights.classList.remove('open'); });
        document.body.appendChild(rights);
        buildMatrix();

        focus = document.createElement('div'); focus.className = 'au-focus';
        document.body.appendChild(focus);

        overlay = document.createElement('div'); overlay.className = 'au-overlay';
        overlay.innerHTML = `<div class="au-box"><h2>SINGLE PANE OF GLASS</h2><p>SELECT ROLE · context-aware scope loads for the live production</p><div class="au-roles"></div></div>`;
        const host = overlay.querySelector('.au-roles');
        ROLES.forEach(r => {
            const el = document.createElement('button'); el.className = 'au-role' + (r.id === current.id ? ' sel' : '');
            el.innerHTML = `<span class="tag" style="background:${r.color}">${r.tier}</span><b>${r.name}</b><div class="ti">${r.sub || ''} · ${capLine(r)}</div><div class="ds">${r.task}</div>`;
            el.addEventListener('click', () => { setRole(r); overlay.classList.remove('open'); });
            host.appendChild(el);
        });
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
        document.body.appendChild(overlay);
    }

    const capLine = (r) => r.caps.admin ? 'All systems' : (Object.keys(r.caps).map(k => k.toUpperCase()).join(' · ') || 'View only');

    function setRole(r) {
        current = r;
        document.documentElement.style.setProperty('--rc', r.color);
        badge.style.setProperty('--rc', r.color);
        focus.style.setProperty('--rc', r.color);
        badge.querySelector('.who b').textContent = r.name;
        badge.querySelector('.who span').textContent = r.sub || r.tier;
        badge.classList.toggle('admin', !!r.caps.admin);
        document.body.className = document.body.className.replace(/\brole-\w+\b/g, '').trim() + ' role-' + r.id;
        overlay.querySelectorAll('.au-role').forEach((el, i) => el.classList.toggle('sel', ROLES[i].id === r.id));
        // focus banner
        focus.innerHTML = `Priority Task · <b>${r.task}</b>`;
        focus.classList.add('show');
        clearTimeout(setRole._t); setRole._t = setTimeout(() => focus.classList.remove('show'), 4200);
        applyScope();
    }

    function showLogin() { ensureUI(); overlay.classList.add('open'); }

    // capability gate for future progressive-disclosure / control-lock
    window.can = (cap) => !!(current.caps.admin || current.caps[cap]);
    window.Auth = { get role() { return current; }, roles: ROLES, setRole, showLogin, applyScope };

    function boot() { ensureUI(); setRole(current); }   // default: logged in as Captain
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
