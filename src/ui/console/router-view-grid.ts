// src/ui/console/router-view-grid — builds the crosspoint <table> and handles the
// click (make/break route, fold group) + hover (row/column highlight) gestures for
// the 1990s router-view. Split out of router-view.ts (200-line rule). Every part
// takes the shared RVState by reference so it reads/writes the same live grid state.
import { patchPrefs } from '../../platform/prefs.js';
import { placeSourceInTwist } from './matrix.js';
import { updateTwistVisuals } from './helix.js';
import {
  SEP, firstLine, gatherSenderNodes, gatherReceivers, gatherLinks, typeDot, splitParent,
  type RowLeaf, type ColLeaf, type RVState,
} from './router-view-gather.js';

// Collapse choices are seat memory — persisted on every toggle.
export function saveCollapsed(st: RVState): void {
  patchPrefs({ ui: { routerCollapsed: { prods: [...st.collapsedProds], origins: [...st.collapsedOrigins] } } });
}

export function buildGrid(st: RVState): void {
  const sf = st.fs.value.trim().toLowerCase(), rf = st.fr.value.trim().toLowerCase();
  const sMatch = (o: string, l: string): boolean => !sf || o.toLowerCase().includes(sf) || l.toLowerCase().includes(sf);
  const rMatch = (p: string, t: string): boolean => !rf || p.toLowerCase().includes(rf) || t.toLowerCase().includes(rf);

  const senderMap = gatherSenderNodes();
  const recvMap = gatherReceivers();
  const { cross, cS, cR } = gatherLinks();
  st.crossSet = cross;

  cS.forEach((k) => {
    const [o, l] = k.split(SEP) as [string, string];
    if (!senderMap.has(o)) senderMap.set(o, new Map());
    if (!senderMap.get(o)!.has(l)) senderMap.get(o)!.set(l, null);
  });

  st.colLeaves = [];
  const colGroups: Array<{ prod: string; parent: string; prodLeaf: string; span: number }> = [];
  recvMap.forEach((twists, prod) => {
    const keep = [...twists].filter(([t]) => (st.showAllDst || cR.has(prod + SEP + t)) && rMatch(prod, t));
    if (!keep.length) return;
    const [parent, prodLeaf] = splitParent(prod);
    if (st.collapsedProds.has(prod)) {
      st.colLeaves.push({ prod, parent, group: true, twists: keep.map(([t]) => t), els: keep.map(([, e]) => e) });
      colGroups.push({ prod, parent, prodLeaf, span: 1 });
    } else {
      keep.forEach(([t, e]) => st.colLeaves.push({ prod, parent, twist: t, twists: [t], el: e }));
      colGroups.push({ prod, parent, prodLeaf, span: keep.length });
    }
  });
  const colParents: Array<{ parent: string; span: number }> = [];
  colGroups.forEach((g) => { const par = g.parent || 'PRODUCTIONS'; const last = colParents[colParents.length - 1]; if (last && last.parent === par) last.span += g.span; else colParents.push({ parent: par, span: g.span }); });

  st.rowLeaves = [];
  const rowGroups: Array<{ origin: string; parent: string; boxLeaf: string; start: number; end: number; connected: boolean }> = [];
  senderMap.forEach((labels, origin) => {
    const keep = [...labels].filter(([l]) => (st.showAllSrc || cS.has(origin + SEP + l)) && sMatch(origin, l));
    if (!keep.length) return;
    const [parent, boxLeaf] = splitParent(origin);
    const idxStart = st.rowLeaves.length;
    if (st.collapsedOrigins.has(origin)) {
      st.rowLeaves.push({ origin, parent, group: true, labels: keep.map(([l]) => l), nodes: keep.map(([, n]) => n) });
    } else {
      keep.forEach(([l, n]) => st.rowLeaves.push({ origin, parent, label: l, labels: [l], node: n }));
    }
    rowGroups.push({ origin, parent, boxLeaf, start: idxStart, end: st.rowLeaves.length, connected: keep.some(([l]) => cS.has(origin + SEP + l)) });
  });
  const rowParents: Array<{ parent: string; start: number; end: number }> = [];
  rowGroups.forEach((g) => { const par = g.parent || 'SOURCES'; const last = rowParents[rowParents.length - 1]; if (last && last.parent === par) last.end = g.end; else rowParents.push({ parent: par, start: g.start, end: g.end }); });

  const litAt = (ri: number, ci: number): boolean => {
    const r = st.rowLeaves[ri], c = st.colLeaves[ci];
    if (!r || !c) return false;
    for (const l of (r.group ? r.labels : [r.label ?? ''])) for (const t of c.twists)
      if (st.crossSet.has([r.origin, l, c.prod, t].join(SEP))) return true;
    return false;
  };

  st.body.innerHTML = '';
  if (!st.rowLeaves.length || !st.colLeaves.length) {
    st.body.innerHTML = `<div class="rv-msg">${(!st.rowLeaves.length && !st.colLeaves.length)
      ? 'NOTHING TO SHOW — enable ALL SOURCES / ALL DESTINATIONS, or make some routes.'
      : !st.rowLeaves.length ? 'NO SENDERS — enable “ALL SOURCES”.' : 'NO RECEIVERS — enable “ALL DESTINATIONS”.'}</div>`;
    return;
  }

  const tbl = document.createElement('table');
  tbl.className = 'rv-grid';
  let h1 = `<tr><th class="rv-corner" rowspan="3" colspan="3">SRC \\ DST</th>`;
  colParents.forEach((g) => { h1 += `<th class="rv-pparenthead" colspan="${g.span}">${g.parent}</th>`; });
  h1 += '</tr><tr>';
  colGroups.forEach((g) => { h1 += `<th class="rv-prodhead" colspan="${g.span}" data-prod="${encodeURIComponent(g.prod)}">${st.collapsedProds.has(g.prod) ? '▸' : '▾'} ${g.prodLeaf}</th>`; });
  h1 += '</tr><tr>';
  st.colLeaves.forEach((c) => { h1 += c.group ? `<th class="rv-twisthead grp">ALL ${c.twists.length}</th>` : `<th class="rv-twisthead">${c.twist}</th>`; });
  h1 += '</tr>';
  const thead = document.createElement('thead'); thead.innerHTML = h1; tbl.appendChild(thead);

  let html = '';
  rowParents.forEach((pg) => {
    for (let ri = pg.start; ri < pg.end; ri++) {
      const g = rowGroups.find((x) => ri >= x.start && ri < x.end);
      const r = st.rowLeaves[ri];
      if (!g || !r) continue;
      const off = !r.group && !cS.has(g.origin + SEP + r.label);
      html += `<tr class="${off ? 'rv-row-off' : ''}">`;
      if (ri === pg.start) html += `<td class="rv-rparenthead" rowspan="${pg.end - pg.start}">${pg.parent}</td>`;
      if (ri === g.start) html += `<td class="rv-originhead" rowspan="${g.end - g.start}" data-origin="${encodeURIComponent(g.origin)}">${st.collapsedOrigins.has(g.origin) ? '▸' : '▾'} ${g.boxLeaf}</td>`;
      html += r.group ? `<td class="rv-feedhead grp">ALL ${r.labels.length} FEEDS</td>` : `<td class="rv-feedhead">${typeDot(r.node, r.label ?? '')} ${r.label}</td>`;
      st.colLeaves.forEach((c, ci) => {
        const lit = litAt(ri, ci), grp = r.group || c.group;
        html += `<td class="rv-cell${lit ? ' on' : ''}${grp ? ' grp' : ''}" data-r="${ri}" data-c="${ci}"></td>`;
      });
      html += '</tr>';
    }
  });
  const tbody = document.createElement('tbody'); tbody.innerHTML = html; tbl.appendChild(tbody);
  st.body.appendChild(tbl);

  const countEl = st.overlay?.querySelector<HTMLElement>('.rv-count');
  if (countEl) countEl.textContent = `${st.crossSet.size} ROUTES · ${st.rowLeaves.length}×${st.colLeaves.length}`;
}

function findDropped(twistEl: HTMLElement, origin: string, label: string): HTMLElement | null {
  const dz = twistEl.querySelector<HTMLElement>('.drop-zone'); if (!dz) return null;
  return [...dz.querySelectorAll<HTMLElement>('.signal-node')].find((n) => {
    if (n.classList.contains('dropped-group')) return false;
    if (firstLine(n) !== label) return false;
    const orig = n.dataset.origin || firstLine(n);
    return orig === origin || !origin;
  }) ?? null;
}
function makeRoute(s: RowLeaf, r: ColLeaf): boolean {
  if (!s.node || !r.el) return false;
  return placeSourceInTwist(r.el, s.node);
}
function breakRoute(s: RowLeaf, r: ColLeaf): boolean {
  if (!r.el) return false;
  const node = findDropped(r.el, s.origin, s.label ?? '');
  if (!node) return false;
  const kids = node.closest('.dropped-group-children');
  node.remove();
  if (kids && !kids.querySelector('.signal-node')) { const grp = kids.closest('.dropped-group'); if (grp) grp.remove(); }
  return true;
}

export function onBodyClick(st: RVState, e: Event): void {
  const target = e.target as HTMLElement;
  const ph = target.closest<HTMLElement>('.rv-prodhead');
  if (ph?.dataset.prod) { const p = decodeURIComponent(ph.dataset.prod); st.collapsedProds.has(p) ? st.collapsedProds.delete(p) : st.collapsedProds.add(p); saveCollapsed(st); buildGrid(st); return; }
  const oh = target.closest<HTMLElement>('.rv-originhead');
  if (oh?.dataset.origin) { const o = decodeURIComponent(oh.dataset.origin); st.collapsedOrigins.has(o) ? st.collapsedOrigins.delete(o) : st.collapsedOrigins.add(o); saveCollapsed(st); buildGrid(st); return; }
  const cell = target.closest<HTMLElement>('.rv-cell');
  if (!cell || cell.classList.contains('grp')) return;
  const s = st.rowLeaves[Number(cell.dataset.r)], r = st.colLeaves[Number(cell.dataset.c)];
  if (!s || !r) return;
  let ok: boolean;
  if (cell.classList.contains('on')) ok = breakRoute(s, r);
  else { ok = makeRoute(s, r); if (!ok) { cell.classList.add('bad'); setTimeout(() => cell.classList.remove('bad'), 250); } }
  if (ok) { if (r.el) updateTwistVisuals(r.el); buildGrid(st); }
}

export function clearHl(st: RVState): void { st.hlNodes.forEach((n) => n.classList.remove('rv-hl')); st.hlNodes = []; }
export function onBodyOver(st: RVState, e: Event): void {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('.rv-cell');
  if (!cell) { clearHl(st); return; }
  const r = cell.dataset.r, c = cell.dataset.c;
  clearHl(st);
  st.body.querySelectorAll<HTMLElement>(`.rv-cell[data-r="${r}"], .rv-cell[data-c="${c}"]`).forEach((n) => { n.classList.add('rv-hl'); st.hlNodes.push(n); });
}
