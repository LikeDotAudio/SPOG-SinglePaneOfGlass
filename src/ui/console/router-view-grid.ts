// src/ui/console/router-view-grid — builds the 3-layer crosspoint <table> and handles
// the click (make/break route, fold a container at any level) + hover gestures. The
// grouping is planned purely in router-view-tree; the HTML is built in
// router-view-render; this file gathers the axis leaves, wires state and events.
import { patchPrefs } from '../../platform/prefs.js';
import { placeSourceInTwist } from './matrix.js';
import { updateTwistVisuals } from './helix.js';
import { buildAxisPlan, type PlanLeaf } from './router-view-tree.js';
import { theadHtml, rowHeaderHtml } from './router-view-render.js';
import { planSalvo, runSalvo } from './router-view-salvo.js';
import { SEP, firstLine, gatherSenderNodes, gatherLinks, type RVState } from './router-view-gather.js';

type Ref = HTMLElement | null;

export function saveCollapsed(st: RVState): void {
  patchPrefs({ ui: { routerCollapsed: { row: [...st.rowCollapsed], col: [...st.colCollapsed] } } });
}

const segsOf = (s: string): string[] => s.split(' — ').map((x) => x.trim()).filter(Boolean);

/** Rows = source feeds. Origin path (Studio → Wall → Box) + feed label. */
function rowLeaves(st: RVState, cS: Set<string>): Array<PlanLeaf<Ref>> {
  const sf = st.fs.value.trim().toLowerCase();
  const match = (o: string, l: string): boolean => !sf || o.toLowerCase().includes(sf) || l.toLowerCase().includes(sf);
  const out: Array<PlanLeaf<Ref>> = [];
  const seen = new Set<string>();
  const add = (origin: string, label: string, node: Ref): void => {
    const k = origin + SEP + label;
    if (seen.has(k) || !label) return;
    if (!(st.showAllSrc || cS.has(k)) || !match(origin, label)) return;
    seen.add(k);
    out.push({ segs: segsOf(origin), leaf: label, id: [origin, label], ref: node });
  };
  gatherSenderNodes().forEach((labels, origin) => labels.forEach((node, label) => add(origin, label, node)));
  cS.forEach((k) => { const i = k.indexOf(SEP); add(k.slice(0, i), k.slice(i + 1), null); });   // routed-but-unrendered
  return out;
}

/** Columns = destination twists. Facility → Floor → Room path (Room = production). */
function colLeaves(st: RVState, cR: Set<string>): Array<PlanLeaf<Ref>> {
  const rf = st.fr.value.trim().toLowerCase();
  const match = (p: string, t: string): boolean => !rf || p.toLowerCase().includes(rf) || t.toLowerCase().includes(rf);
  const out: Array<PlanLeaf<Ref>> = [];
  document.querySelectorAll<HTMLElement>('.twist-container').forEach((tw) => {
    const prod = tw.dataset.prodName || (tw.closest('.program-row')?.querySelector<HTMLElement>('.program-title')?.innerText.trim() ?? 'UNKNOWN');
    const twist = tw.querySelector<HTMLElement>('.twist-title')?.innerText.trim() ?? 'TWIST';
    if (!(st.showAllDst || cR.has(prod + SEP + twist)) || !match(prod, twist)) return;
    const room = prod.split(' — ').pop()?.trim() || prod;
    const segs = [tw.dataset.prodCat || '', tw.dataset.prodFloor || '', room].filter(Boolean);
    out.push({ segs, leaf: twist, id: [prod, twist], ref: tw });
  });
  return out;
}

export function buildGrid(st: RVState): void {
  const { cross, cS, cR } = gatherLinks();
  st.crossSet = cross;
  st.rowPlan = buildAxisPlan(rowLeaves(st, cS), st.rowCollapsed, 'r:');
  st.colPlan = buildAxisPlan(colLeaves(st, cR), st.colCollapsed, 'c:');
  const rows = st.rowPlan.items, cols = st.colPlan.items;

  if (!rows.length || !cols.length) {
    st.body.innerHTML = `<div class="rv-msg">${!rows.length && !cols.length
      ? 'NOTHING TO SHOW — enable ALL SOURCES / ALL DESTINATIONS, or make some routes.'
      : !rows.length ? 'NO SENDERS — enable “ALL SOURCES”.' : 'NO RECEIVERS — enable “ALL DESTINATIONS”.'}</div>`;
    return;
  }
  const lit = (ri: number, ci: number): boolean => {
    for (const [o, l] of rows[ri]!.ids) for (const [p, t] of cols[ci]!.ids) if (cross.has([o, l, p, t].join(SEP))) return true;
    return false;
  };
  let body = '';
  rows.forEach((r, ri) => {
    body += '<tr>' + rowHeaderHtml(r, ri, st.rowPlan!);
    cols.forEach((c, ci) => {
      const grp = r.agg || c.agg;
      body += `<td class="rv-cell${lit(ri, ci) ? ' on' : ''}${grp ? ' grp' : ''}" data-r="${ri}" data-c="${ci}"></td>`;
    });
    body += '</tr>';
  });
  const tbl = document.createElement('table');
  tbl.className = 'rv-grid';
  tbl.innerHTML = `<thead>${theadHtml(st.colPlan)}</thead><tbody>${body}</tbody>`;
  st.body.innerHTML = '';
  st.body.appendChild(tbl);
  const countEl = st.overlay?.querySelector<HTMLElement>('.rv-count');
  if (countEl) countEl.textContent = `${cross.size} ROUTES · ${rows.length}×${cols.length}`;
}

function findDropped(twistEl: HTMLElement, origin: string, label: string): HTMLElement | null {
  const dz = twistEl.querySelector<HTMLElement>('.drop-zone'); if (!dz) return null;
  return [...dz.querySelectorAll<HTMLElement>('.signal-node')].find((n) => {
    if (n.classList.contains('dropped-group')) return false;
    if (firstLine(n) !== label) return false;
    const o = n.dataset.origin || firstLine(n);
    return o === origin || !origin;
  }) ?? null;
}

export function onBodyClick(st: RVState, e: Event): void {
  const target = e.target as HTMLElement;
  const head = target.closest<HTMLElement>('[data-collapse]');
  if (head?.dataset.collapse) {
    const key = head.dataset.collapse;
    const set = key.startsWith('r:') ? st.rowCollapsed : st.colCollapsed;
    set.has(key) ? set.delete(key) : set.add(key);
    saveCollapsed(st); buildGrid(st); return;
  }
  const cell = target.closest<HTMLElement>('.rv-cell');
  if (!cell) return;
  const r = st.rowPlan?.items[Number(cell.dataset.r)], c = st.colPlan?.items[Number(cell.dataset.c)];
  if (!r || !c) return;
  // A group×group crosspoint runs a SALVO — wire every matching feed of the row group
  // into the col group's twists (container→container routing).
  if (cell.classList.contains('grp')) {
    const pairs = planSalvo(r.ids, c.ids);
    if (!pairs.length) return;
    const twists = new Set(pairs.map((p) => p.el)).size;
    if (!confirm(`Salvo — connect ${pairs.length} feed(s) into ${twists} twist(s)?`)) return;
    const { made, touched } = runSalvo(pairs);
    touched.forEach((el) => updateTwistVisuals(el));
    buildGrid(st);
    if (made < pairs.length) setTimeout(() => alert(`Salvo: ${made} of ${pairs.length} routed (caps/accepts blocked the rest).`), 0);
    return;
  }
  if (!c.ref) return;
  let ok = false;
  if (cell.classList.contains('on')) {
    const node = findDropped(c.ref, r.ids[0]![0], r.ids[0]![1]);
    if (node) { const kids = node.closest('.dropped-group-children'); node.remove(); if (kids && !kids.querySelector('.signal-node')) kids.closest('.dropped-group')?.remove(); ok = true; }
  } else if (r.ref) {
    ok = placeSourceInTwist(c.ref, r.ref);
    if (!ok) { cell.classList.add('bad'); setTimeout(() => cell.classList.remove('bad'), 250); }
  }
  if (ok) { updateTwistVisuals(c.ref); buildGrid(st); }
}

export function clearHl(st: RVState): void { st.hlNodes.forEach((n) => n.classList.remove('rv-hl')); st.hlNodes = []; }
export function onBodyOver(st: RVState, e: Event): void {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('.rv-cell');
  clearHl(st);
  if (!cell) return;
  st.body.querySelectorAll<HTMLElement>(`.rv-cell[data-r="${cell.dataset.r}"], .rv-cell[data-c="${cell.dataset.c}"]`).forEach((n) => { n.classList.add('rv-hl'); st.hlNodes.push(n); });
}
