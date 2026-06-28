// js/router-view.js — the "1990s VIEW": an old-school router crosspoint grid.
//
// Reads every routing in the DOM (sources dropped into production twists) and
// lays them out as a matrix-of-matrices: rows are SENDERS grouped by source box,
// columns are RECEIVERS grouped by production, lit crosspoints mark connections.
//
// • Filter by sender / receiver.
// • "SHOW ALL SOURCES" toggle — lazy-loads the whole source tree and lists every
//   source, so unconnected ones appear as empty rows.
// • Click a production header (group-of-columns) or a source-box header
//   (group-of-rows) to FOLD that block down to one summary line; click again to
//   expand. Folded crosspoints light if ANY member connects.
// • Real URL route: lives at #/1990s (with ?all/&s/&r) — navigable & shareable.
//
// Self-mounting ES module; adds a bottom-right button, exposes window.RouterView.
(function () {
    'use strict';

    const STYLE_ID = 'router-view-styles';
    const ROUTE = '#/1990s';
    const SEP = '␟';
    let overlay = null, fs = null, fr = null, toggleBtn = null;
    let showAll = false, prevHash = null, syncing = false;
    const collapsedProds = new Set();
    const collapsedOrigins = new Set();

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
        .rv-btn{position:fixed;right:14px;bottom:76px;z-index:1000;background:#003b22;color:#33ff66;
            border:1px solid #0f5;font-family:'Courier New',monospace;font-weight:bold;letter-spacing:1px;
            padding:8px 14px;border-radius:4px;cursor:pointer;box-shadow:0 0 10px rgba(0,255,100,.3);}
        .rv-btn:hover{background:#0a5;color:#000;}
        .rv-overlay{position:fixed;inset:0;z-index:2500;display:none;flex-direction:column;
            background:#000a05;color:#33ff66;font-family:'Courier New',Courier,monospace;}
        .rv-overlay.open{display:flex;}
        .rv-top{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#001a0d;
            border-bottom:2px solid #0f5;flex-wrap:wrap;}
        .rv-title{font-weight:bold;letter-spacing:3px;font-size:16px;color:#7CFC00;text-shadow:0 0 6px #0f5;}
        .rv-filters{display:flex;gap:10px;flex:1;flex-wrap:wrap;}
        .rv-filters input{background:#001208;border:1px solid #0a5;color:#7CFC00;padding:6px 10px;
            font-family:inherit;font-size:12px;border-radius:3px;min-width:150px;}
        .rv-filters input::placeholder{color:#2a7a4a;}
        .rv-toggle{background:#001208;border:1px solid #0a5;color:#33ff66;font-family:inherit;font-weight:bold;
            letter-spacing:1px;font-size:11px;padding:7px 12px;border-radius:3px;cursor:pointer;white-space:nowrap;}
        .rv-toggle.on{background:#33ff66;color:#000;box-shadow:0 0 8px rgba(0,255,100,.5);}
        .rv-count{font-size:12px;color:#2a7a4a;letter-spacing:1px;}
        .rv-close{cursor:pointer;background:#0a5;color:#000;font-weight:bold;border:none;
            padding:7px 16px;border-radius:3px;letter-spacing:1px;}
        .rv-close:hover{filter:brightness(1.15);}
        .rv-body{flex:1;overflow:auto;padding:10px;}
        .rv-empty-msg{padding:40px;text-align:center;color:#2a7a4a;letter-spacing:2px;}
        table.rv-grid{border-collapse:separate;border-spacing:0;font-size:11px;}
        .rv-grid th,.rv-grid td{border:1px solid #0a4030;padding:4px 7px;text-align:center;white-space:nowrap;}
        .rv-grid thead th{position:sticky;top:0;z-index:3;background:#001a0d;color:#9f9;}
        .rv-prodhead{background:#06301f;color:#7CFC00;letter-spacing:2px;font-weight:bold;cursor:pointer;}
        .rv-prodhead:hover{background:#0a4a2e;}
        .rv-twisthead{background:#001a0d;color:#9f9;font-weight:normal;}
        .rv-twisthead.grp{color:#7CFC00;font-style:italic;}
        .rv-nohdr{background:#06301f;color:#2a7a4a;font-style:italic;}
        .rv-corner{position:sticky;left:0;top:0;z-index:4;background:#001a0d;}
        .rv-originhead{position:sticky;left:0;z-index:2;background:#001208;color:#7CFC00;text-align:left;
            letter-spacing:1px;font-weight:bold;cursor:pointer;}
        .rv-originhead:hover{background:#06301f;}
        .rv-feedhead{position:sticky;left:120px;z-index:2;background:#000f08;color:#9f9;text-align:left;}
        .rv-feedhead.grp{color:#7CFC00;font-style:italic;}
        .rv-row-off .rv-feedhead{color:#3a8a5a;}
        .rv-cell{color:#0a4030;}
        .rv-cell.on{color:#000;background:#33ff66;font-weight:bold;box-shadow:0 0 8px #33ff66 inset;}
        .rv-cell.on::after{content:'\\25CF';}
        `;
        document.head.appendChild(s);
    }

    function gatherLinks() {
        const links = [];
        document.querySelectorAll('.twist-container').forEach(tw => {
            const dz = tw.querySelector('.drop-zone');
            if (!dz) return;
            const row = tw.closest('.program-row');
            const prodName = tw.dataset.prodName
                || (row && row.querySelector('.program-title') ? row.querySelector('.program-title').innerText.trim() : 'UNKNOWN');
            const titleEl = tw.querySelector('.twist-title');
            const twistName = titleEl ? titleEl.innerText.trim() : 'TWIST';
            dz.querySelectorAll(':scope > .signal-node').forEach(node => {
                const feeds = node.classList.contains('dropped-group')
                    ? [...node.querySelectorAll('.dropped-group-children .signal-node')]
                    : [node];
                feeds.forEach(f => {
                    const label = (f.innerText || '').trim().split('\n')[0];
                    if (!label) return;
                    const origin = f.dataset.origin || node.dataset.origin || label;
                    links.push({ origin, label, prodName, twistName });
                });
            });
        });
        return links;
    }

    function gatherAllSenders() {
        const feeds = [], seen = new Set();
        const add = (origin, label) => {
            if (!label) return;
            const k = origin + SEP + label;
            if (seen.has(k)) return;
            seen.add(k);
            feeds.push({ origin, label });
        };
        document.querySelectorAll('.ingress-panel .signal-node').forEach(n => {
            if (n.classList.contains('multiplex')) {
                const head = n.querySelector('.multiplex-header');
                const boxOrigin = n.dataset.origin || (head ? head.innerText.trim() : '');
                n.querySelectorAll('.multiplex-children .signal-node').forEach(sub => {
                    add(sub.dataset.origin || boxOrigin, (sub.innerText || '').trim().split('\n')[0]);
                });
            } else if (!n.classList.contains('sub-stream') && !n.classList.contains('dropped-group')) {
                const label = (n.innerText || '').trim().split('\n')[0];
                add(n.dataset.origin || label, label);
            }
        });
        return feeds;
    }

    async function loadAllSources() {
        for (let pass = 0; pass < 4; pass++) {
            let clicked = 0;
            document.querySelectorAll('.media-group-header').forEach(h => {
                const content = h.nextElementSibling;
                if (content && !content.querySelector('.signal-node')) { h.click(); clicked++; }
            });
            if (!clicked) break;
            await new Promise(r => setTimeout(r, 220));
        }
    }

    function buildModel(fSender, fReceiver) {
        const sf = fSender.trim().toLowerCase(), rf = fReceiver.trim().toLowerCase();
        const sMatch = (o, l) => !sf || o.toLowerCase().includes(sf) || l.toLowerCase().includes(sf);
        const rMatch = (p, t) => !rf || p.toLowerCase().includes(rf) || t.toLowerCase().includes(rf);

        const senders = new Map(), receivers = new Map(), cross = new Set(), connected = new Set();
        const addSender = (o, l) => { if (!senders.has(o)) senders.set(o, new Set()); senders.get(o).add(l); };

        gatherLinks().forEach(({ origin, label, prodName, twistName }) => {
            if (!sMatch(origin, label) || !rMatch(prodName, twistName)) return;
            addSender(origin, label);
            connected.add(origin + SEP + label);
            if (!receivers.has(prodName)) receivers.set(prodName, new Set());
            receivers.get(prodName).add(twistName);
            cross.add([origin, label, prodName, twistName].join(SEP));
        });
        if (showAll) gatherAllSenders().forEach(({ origin, label }) => { if (sMatch(origin, label)) addSender(origin, label); });
        return { senders, receivers, cross, connected };
    }

    function buildGrid() {
        const body = overlay.querySelector('.rv-body');
        const { senders, receivers, cross, connected } = buildModel(fs.value, fr.value);

        const totalSenders = [...senders.values()].reduce((a, s) => a + s.size, 0);
        const count = overlay.querySelector('.rv-count');
        if (count) count.textContent = `${cross.size} XPT · ${totalSenders} SRC` + (showAll ? ' (ALL)' : '');

        body.innerHTML = '';
        if (!senders.size) {
            body.innerHTML = `<div class="rv-empty-msg">${showAll
                ? 'NO SOURCES LOADED YET.'
                : 'NO ROUTES YET — DRAG SOURCES INTO A PRODUCTION (OR ENABLE “SHOW ALL SOURCES”).'}</div>`;
            return;
        }

        // Column specs: a collapsed production folds to one group column.
        const colSpecs = [];
        receivers.forEach((twists, prod) => {
            if (collapsedProds.has(prod)) colSpecs.push({ prod, group: true, twists: [...twists] });
            else [...twists].forEach(t => colSpecs.push({ prod, twist: t, twists: [t] }));
        });
        // Row specs: a collapsed source box folds to one group row.
        const rowGroups = [];
        senders.forEach((feeds, origin) => {
            if (collapsedOrigins.has(origin)) rowGroups.push({ origin, group: true, labels: [...feeds] });
            else rowGroups.push({ origin, labels: [...feeds], rows: [...feeds].map(l => ({ label: l, labels: [l] })) });
        });

        const on = (origin, labels, prod, twists) => {
            for (const l of labels) for (const t of twists) if (cross.has([origin, l, prod, t].join(SEP))) return true;
            return false;
        };

        const table = document.createElement('table');
        table.className = 'rv-grid';

        // Header row 1: production groups (colspan), clickable to fold.
        let h1 = `<tr><th class="rv-corner" rowspan="2">SENDER \\ RECEIVER</th><th class="rv-corner" rowspan="2"></th>`;
        if (colSpecs.length) {
            // group consecutive colSpecs by prod
            let i = 0;
            while (i < colSpecs.length) {
                const prod = colSpecs[i].prod; let span = 0;
                while (i + span < colSpecs.length && colSpecs[i + span].prod === prod) span++;
                const folded = collapsedProds.has(prod);
                h1 += `<th class="rv-prodhead" colspan="${span}" data-prod="${encodeURIComponent(prod)}">${folded ? '▸' : '▾'} ${prod}</th>`;
                i += span;
            }
        } else h1 += `<th class="rv-nohdr">— no receivers —</th>`;
        h1 += '</tr>';
        // Header row 2: twist names (or "ALL n" for a folded production).
        let h2 = '<tr>';
        if (colSpecs.length) colSpecs.forEach(c => {
            h2 += c.group ? `<th class="rv-twisthead grp">ALL ${c.twists.length}</th>` : `<th class="rv-twisthead">${c.twist}</th>`;
        });
        else h2 += `<th class="rv-nohdr"></th>`;
        h2 += '</tr>';
        const thead = document.createElement('thead');
        thead.innerHTML = h1 + h2;
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        let html = '';
        rowGroups.forEach(g => {
            const oEnc = encodeURIComponent(g.origin);
            const rows = g.group ? [{ labels: g.labels, grp: true }] : g.rows;
            rows.forEach((r, i) => {
                const off = !r.grp && !connected.has(g.origin + SEP + r.label);
                html += `<tr class="${off ? 'rv-row-off' : ''}">`;
                if (i === 0) {
                    const folded = collapsedOrigins.has(g.origin);
                    html += `<td class="rv-originhead" rowspan="${rows.length}" data-origin="${oEnc}">${folded ? '▸' : '▾'} ${g.origin}</td>`;
                }
                html += r.grp
                    ? `<td class="rv-feedhead grp">ALL ${r.labels.length} FEEDS</td>`
                    : `<td class="rv-feedhead">${r.label}</td>`;
                if (colSpecs.length) colSpecs.forEach(c => {
                    const lit = on(g.origin, r.labels, c.prod, c.twists);
                    html += `<td class="rv-cell${lit ? ' on' : ''}"></td>`;
                });
                else html += `<td class="rv-cell"></td>`;
                html += '</tr>';
            });
        });
        tbody.innerHTML = html;
        table.appendChild(tbody);
        body.appendChild(table);
    }

    // Fold/unfold a production column-group or a source row-group.
    function onGridClick(e) {
        const p = e.target.closest('.rv-prodhead');
        if (p && p.dataset.prod) {
            const prod = decodeURIComponent(p.dataset.prod);
            collapsedProds.has(prod) ? collapsedProds.delete(prod) : collapsedProds.add(prod);
            buildGrid(); return;
        }
        const o = e.target.closest('.rv-originhead');
        if (o && o.dataset.origin) {
            const origin = decodeURIComponent(o.dataset.origin);
            collapsedOrigins.has(origin) ? collapsedOrigins.delete(origin) : collapsedOrigins.add(origin);
            buildGrid();
        }
    }

    // ---- URL state ----------------------------------------------------------
    function buildHash() {
        const params = [];
        if (showAll) params.push('all=1');
        if (fs.value.trim()) params.push('s=' + encodeURIComponent(fs.value.trim()));
        if (fr.value.trim()) params.push('r=' + encodeURIComponent(fr.value.trim()));
        return ROUTE + (params.length ? '?' + params.join('&') : '');
    }
    function parseHash() {
        const h = location.hash || '';
        if (h !== ROUTE && h.indexOf(ROUTE + '?') !== 0) return null;
        const q = h.indexOf('?') >= 0 ? h.slice(h.indexOf('?') + 1) : '';
        const p = new URLSearchParams(q);
        return { all: p.get('all') === '1', s: p.get('s') || '', r: p.get('r') || '' };
    }
    function writeHash() { syncing = true; history.replaceState(null, '', buildHash()); syncing = false; }

    async function setToggle(value, write) {
        showAll = value;
        if (toggleBtn) { toggleBtn.classList.toggle('on', value); toggleBtn.textContent = value ? 'SHOWING ALL SOURCES' : 'SHOW ALL SOURCES'; }
        if (value) await loadAllSources();
        buildGrid();
        if (write) writeHash();
    }

    function build() {
        injectStyles();
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'rv-overlay';
        overlay.innerHTML = `
            <div class="rv-top">
                <span class="rv-title">▘ 1990s VIEW · ROUTER MATRIX</span>
                <div class="rv-filters">
                    <input data-fsender placeholder="filter sender…">
                    <input data-freceiver placeholder="filter receiver…">
                </div>
                <button class="rv-toggle" data-toggle>SHOW ALL SOURCES</button>
                <span class="rv-count"></span>
                <button class="rv-close">CLOSE</button>
            </div>
            <div class="rv-body"></div>`;
        document.body.appendChild(overlay);

        fs = overlay.querySelector('[data-fsender]');
        fr = overlay.querySelector('[data-freceiver]');
        toggleBtn = overlay.querySelector('[data-toggle]');
        const onFilter = () => { buildGrid(); writeHash(); };
        fs.addEventListener('input', onFilter);
        fr.addEventListener('input', onFilter);
        toggleBtn.addEventListener('click', () => setToggle(!showAll, true));
        overlay.querySelector('.rv-body').addEventListener('click', onGridClick);
        overlay.querySelector('.rv-close').addEventListener('click', close);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) close();
        });
        return overlay;
    }

    function open() {
        if (!(location.hash === ROUTE || location.hash.indexOf(ROUTE + '?') === 0)) {
            prevHash = location.hash;
            location.hash = ROUTE;        // → hashchange → show()
        } else show(parseHash());
    }
    function close() {
        const ov = build();
        ov.classList.remove('open');
        syncing = true;
        history.replaceState(null, '', prevHash || (location.pathname + location.search));
        syncing = false;
        prevHash = null;
    }
    async function show(state) {
        const ov = build();
        if (state) { fs.value = state.s; fr.value = state.r; await setToggle(state.all, false); }
        else buildGrid();
        ov.classList.add('open');
    }
    function onHashChange() {
        if (syncing) return;
        const st = parseHash();
        if (st) show(st);
        else if (overlay && overlay.classList.contains('open')) overlay.classList.remove('open');
    }

    function addButton() {
        if (document.querySelector('.rv-btn')) return;
        const b = document.createElement('button');
        b.className = 'rv-btn';
        b.textContent = '1990s VIEW';
        b.title = 'Router crosspoint matrix (opens #/1990s)';
        b.addEventListener('click', open);
        document.body.appendChild(b);
    }

    function init() {
        injectStyles();
        addButton();
        window.addEventListener('hashchange', onHashChange);
        if (parseHash()) { build(); show(parseHash()); }
    }

    window.RouterView = { open, close };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
