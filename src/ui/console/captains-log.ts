// src/ui/console/captains-log — the Captain's Log (port of js/captains-log.js).
// Narrates EVERY routing change and lets the operator undo it ("Reverse Course").
// A MutationObserver watches the destinations content; whatever changes in a
// twist's drop-zone (drag-drop, the 1990s view, a portal, …) becomes a log entry,
// grouped into NARRATIVES ("voyages"). Reverse Course restores the exact nodes.
import { addStyles } from '../dom.js';
import { updateTwistVisuals } from './helix.js';
import { idbPut, idbGetAll } from '../../platform/store-idb.js';
import { role, onRoleChange, operator } from '../../platform/auth.js';

interface Removed { node: HTMLElement; parent: Node; next: Node | null }
// `undo` is set on SEMANTIC entries (e.g. a layout edit via logAction): reversing
// them runs the callback instead of restoring drop-zone nodes. Routing entries
// carry a real `twist` + added/removed nodes; action entries carry `twist: null`.
// `restored` marks entries hydrated from IndexedDB — read-only history: the DOM
// nodes / undo callbacks they narrated died with the previous session, so they
// can't be selected for Reverse Course (audit §7.3 gap 3).
interface Entry { id: number; ts: number; twist: HTMLElement | null; dest: string; prod: string; added: HTMLElement[]; removed: Removed[]; text: string; reversed: boolean; undo?: () => void; restored?: boolean }
interface Narrative { id: number; title: string; entries: Entry[] }

// ---- IndexedDB persistence (audit §8 W2): the log is the audit trail ---------
interface StoredEntry { k: string; voyage: number; voyTitle: string; entry: number; ts: number; dest: string; prod: string; text: string; reversed: boolean }
let hydrating = false;
function persistEntry(e: LogEntryEvent): void {
  if (hydrating) return;
  const voyTitle = narratives.find((n) => n.id === e.voyage)?.title ?? `Voyage ${e.voyage}`;
  if (e.reversed) {
    // A reversal updates the ORIGINAL record's flag; the "Course reversed" text
    // is session commentary, not a new history row.
    void idbGetAll<StoredEntry>('log').then((all) => {
      const rec = all.find((r) => r.k === `${e.voyage}:${e.entry}`);
      if (rec) void idbPut('log', { ...rec, reversed: true });
    });
    return;
  }
  void idbPut('log', { k: `${e.voyage}:${e.entry}`, voyage: e.voyage, voyTitle, entry: e.entry, ts: e.ts, dest: e.dest, prod: e.prod, text: e.text, reversed: e.reversed });
}

async function hydrateLog(): Promise<number> {
  const rows = await idbGetAll<StoredEntry>('log');
  if (!rows.length) return 0;
  hydrating = true;
  try {
    rows.sort((a, b) => a.ts - b.ts || a.entry - b.entry);
    for (const r of rows) {
      let nar = narratives.find((n) => n.id === r.voyage);
      if (!nar) { nar = { id: r.voyage, title: r.voyTitle, entries: [] }; narratives.push(nar); }
      nar.entries.push({ id: r.entry, ts: r.ts, twist: null, dest: r.dest, prod: r.prod, added: [], removed: [], text: r.text, reversed: r.reversed, restored: true });
      nidSeq = Math.max(nidSeq, r.voyage);
      eidSeq = Math.max(eidSeq, r.entry);
    }
    narratives.sort((a, b) => a.id - b.id);
    // New work lands in a NEW voyage, not appended to a dead session's narrative.
    current = null;
    render();
  } finally { hydrating = false; }
  return rows.length;
}

/** A log entry surfaced to external listeners (the MQTT bridge, audit §4.6). */
export interface LogEntryEvent { voyage: number; entry: number; ts: number; dest: string; prod: string; added: string[]; removed: string[]; text: string; reversed: boolean }
const logListeners = new Set<(e: LogEntryEvent) => void>();
/** Subscribe to every Captain's Log entry (and course reversals). Returns an unsubscribe. */
export function onLogEntry(cb: (e: LogEntryEvent) => void): () => void { logListeners.add(cb); return () => logListeners.delete(cb); }
function emitLog(e: LogEntryEvent): void {
  persistEntry(e);
  for (const l of logListeners) { try { l(e); } catch { /* a bad listener must not break logging */ } }
}

/** Log a SEMANTIC action (e.g. an Edit-Layout change) as a Captain's Log entry.
 *  `undo`, if given, is run by Reverse Course to undo it — so layout edits are
 *  narrated and reversible right alongside routing changes. */
/** Sign a log line with the operator's name (asked at login) when one is set. */
const signed = (text: string): string => {
  const who = operator();
  return who ? `${text} · by ${who}` : text;
};

export function logAction(text: string, undo?: () => void): void {
  const ts = Date.now();
  const nar = ensureNarrative();
  const line = signed(text);
  const entry: Entry = { id: ++eidSeq, ts, twist: null, dest: '', prod: '', added: [], removed: [], text: line, reversed: false, undo };
  nar.entries.push(entry);
  emitLog({ voyage: nar.id, entry: entry.id, ts, dest: '', prod: '', added: [], removed: [], text: line, reversed: false });
  render();
}

let panel: HTMLElement | null = null, listEl: HTMLElement | null = null, observer: MutationObserver | null = null, paused = false;
let narratives: Narrative[] = [];
let current: Narrative | null = null;
const selected = new Set<number>();
let nidSeq = 0, eidSeq = 0;

const utc = (ts: number): string => new Date(ts).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '') + ' UTC';
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string): string => String(s).replace(/[&<>"]/g, (c) => ESC[c] ?? c);
const hms = (ts: number): string => new Date(ts).toISOString().slice(11, 19);
const VOY_COLORS = ['#C2B74B', '#FF9C63', '#3FC1C9', '#A06EB4', '#cc6a3a', '#6cdf4a', '#9C6B9C'];

function nodeLabel(n: Element | null): string {
  if (!n || n.nodeType !== 1) return '';
  const el = n as HTMLElement;
  if (el.classList.contains('dropped-group')) {
    const h = el.querySelector<HTMLElement>('.dropped-group-header');
    const k = el.querySelectorAll('.dropped-group-children .signal-node').length;
    const base = ((h ? h.innerText : el.dataset.origin) || 'group').trim().split('\n')[0] ?? 'group';
    return k ? `${base} ×${k}` : base;
  }
  return (el.innerText || '').trim().split('\n')[0] ?? '';
}
const labelsOf = (nodes: Element[]): string => nodes.map(nodeLabel).filter(Boolean).join(', ') || 'nothing';

function destInfo(twist: HTMLElement): { dest: string; prod: string } {
  const name = twist.querySelector<HTMLElement>('.twist-title')?.innerText.trim() ?? 'destination';
  const row = twist.closest('.program-row');
  const prod = twist.dataset.prodName || (row?.querySelector<HTMLElement>('.program-title')?.innerText.trim() ?? '');
  return { dest: name, prod };
}

function narrate(dest: string, prod: string, removed: Element[], added: Element[], ts: number): string {
  const head = `The destination of ${dest}${prod ? ` (${prod})` : ''}`;
  const t = utc(ts);
  if (removed.length && added.length) return `${head} that previously contained the ${labelsOf(removed)} was replaced with the ${labelsOf(added)} by the user at ${t}.`;
  if (added.length) return `${head}, previously empty, received the ${labelsOf(added)} by the user at ${t}.`;
  return `${head} that previously contained the ${labelsOf(removed)} was cleared by the user at ${t}.`;
}

function ensureNarrative(): Narrative {
  if (!current) { current = { id: ++nidSeq, title: `Voyage ${nidSeq}`, entries: [] }; narratives.push(current); }
  return current;
}

function onMutations(records: MutationRecord[]): void {
  if (paused) return;
  const byTwist = new Map<HTMLElement, { added: HTMLElement[]; removed: Removed[] }>();
  records.forEach((rec) => {
    const target = rec.target;
    if (!(target instanceof Element)) return;
    const inDrop = target.classList.contains('drop-zone') || target.classList.contains('dropped-group-children') || target.closest('.drop-zone');
    if (!inDrop) return;
    const twist = target.closest<HTMLElement>('.twist-container'); if (!twist) return;
    if (!byTwist.has(twist)) byTwist.set(twist, { added: [], removed: [] });
    const ch = byTwist.get(twist)!;
    rec.addedNodes.forEach((n) => { if (n.nodeType === 1 && (n as HTMLElement).classList.contains('signal-node')) ch.added.push(n as HTMLElement); });
    rec.removedNodes.forEach((n) => { if (n.nodeType === 1 && (n as HTMLElement).classList.contains('signal-node')) ch.removed.push({ node: n as HTMLElement, parent: target, next: rec.nextSibling }); });
  });
  if (!byTwist.size) return;
  const ts = Date.now();
  const nar = ensureNarrative();
  let changed = false;
  byTwist.forEach((ch, twist) => {
    if (!ch.added.length && !ch.removed.length) return;
    const { dest, prod } = destInfo(twist);
    const entry: Entry = { id: ++eidSeq, ts, twist, dest, prod, added: ch.added.slice(), removed: ch.removed.slice(), text: signed(narrate(dest, prod, ch.removed.map((r) => r.node), ch.added, ts)), reversed: false };
    nar.entries.push(entry);
    emitLog({ voyage: nar.id, entry: entry.id, ts, dest, prod, added: ch.added.map(nodeLabel).filter(Boolean), removed: ch.removed.map((r) => nodeLabel(r.node)).filter(Boolean), text: entry.text, reversed: false });
    changed = true;
  });
  if (changed) render();
}

function reverseEntry(entry: Entry): void {
  if (entry.reversed) return;
  // Semantic (layout) entry: run its undo callback instead of restoring nodes.
  if (entry.undo) {
    try { entry.undo(); } catch { /* a failed undo must not wedge the log */ }
    entry.reversed = true;
    const v = narratives.find((n) => n.entries.includes(entry))?.id ?? 0;
    emitLog({ voyage: v, entry: entry.id, ts: Date.now(), dest: entry.dest, prod: entry.prod, added: [], removed: [], text: `Course reversed: ${entry.text}`, reversed: true });
    return;
  }
  entry.added.forEach((n) => { if (n.parentNode) n.parentNode.removeChild(n); });
  entry.removed.forEach(({ node, parent, next }) => {
    if (parent && (parent as Node).isConnected) {
      if (next && next.parentNode === parent) parent.insertBefore(node, next);
      else parent.appendChild(node);
    } else {
      entry.twist?.querySelector<HTMLElement>('.drop-zone')?.appendChild(node);
    }
  });
  if (entry.twist) { try { updateTwistVisuals(entry.twist); } catch { /* ignore */ } }
  entry.reversed = true;
  const voyage = narratives.find((n) => n.entries.includes(entry))?.id ?? 0;
  emitLog({ voyage, entry: entry.id, ts: Date.now(), dest: entry.dest, prod: entry.prod, added: entry.added.map(nodeLabel).filter(Boolean), removed: entry.removed.map((r) => nodeLabel(r.node)).filter(Boolean), text: `Course reversed: ${entry.text}`, reversed: true });
}
function reverseSelected(): void {
  const all: Entry[] = [];
  narratives.forEach((n) => n.entries.forEach((e) => { if (selected.has(e.id) && !e.reversed) all.push(e); }));
  if (!all.length) return;
  all.sort((a, b) => b.ts - a.ts || b.id - a.id);
  paused = true;
  all.forEach(reverseEntry);
  observer?.takeRecords();
  paused = false;
  selected.clear();
  render();
}

const CL_CSS = `
.cl-btn{display:block;width:100%;z-index:1000;background:#C2B74B;color:#1a1206;border:none;font-family:'Courier New',monospace;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:9px 16px;margin-bottom:10px;border-radius:18px 6px 6px 18px;cursor:pointer;box-shadow:inset 6px 0 0 #8f8a35;text-align:left;}
.cl-btn:hover{background:#ffcf6b;color:#000;}
.cl-badge{display:inline-block;min-width:16px;margin-left:6px;padding:0 5px;border-radius:8px;background:#1a1206;color:#C2B74B;font-size:10px;}
.cl-panel{position:fixed;top:0;right:0;width:500px;max-width:94vw;height:100%;z-index:2600;background:#0a0805;color:#ffcf6b;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;transform:translateX(101%);transition:transform .25s ease;box-shadow:-10px 0 40px rgba(0,0,0,.7);}
.cl-panel.open{transform:translateX(0);}
.cl-head{display:flex;align-items:stretch;height:46px;background:#C2B74B;}
.cl-title{flex:1;display:flex;align-items:center;padding-left:22px;color:#000;font-weight:900;letter-spacing:3px;font-size:15px;}
.cl-x{flex:0 0 auto;width:62px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;letter-spacing:1px;cursor:pointer;box-shadow:inset 2px 0 0 rgba(0,0,0,.25);}
.cl-x:hover{background:rgba(0,0,0,.15);}
.cl-tools{display:flex;gap:8px;padding:10px 12px;background:#140f06;}
.cl-rev,.cl-new{font-family:inherit;font-weight:900;font-size:11px;letter-spacing:1px;cursor:pointer;padding:8px 16px;border:none;border-radius:14px;text-transform:uppercase;color:#000;}
.cl-rev{background:#cc3a3a;} .cl-new{background:#6cdf4a;}
.cl-rev:hover,.cl-new:hover{filter:brightness(1.12);}
.cl-list{flex:1;overflow:auto;padding:10px 10px 10px 0;background:#0a0805;}
.cl-empty{color:#6a5a30;padding:30px 10px;text-align:center;letter-spacing:1px;}
.cl-nar{margin:0 0 16px 14px;}
.cl-nar-h{display:flex;align-items:center;gap:8px;height:30px;padding:0 14px;color:#000;font-weight:900;letter-spacing:2px;font-size:12px;border-radius:14px 14px 3px 3px;cursor:pointer;text-transform:uppercase;}
.cl-nar-h .cl-edit{margin-left:auto;font-size:9px;font-weight:bold;opacity:.7;text-transform:none;}
.cl-entry{display:flex;align-items:stretch;margin-top:3px;cursor:pointer;background:#12100a;border-radius:3px 12px 12px 3px;overflow:hidden;}
.cl-entry:hover{background:#1c1810;}
.cl-cap{flex:0 0 12px;}
.cl-mid{flex:1;min-width:0;padding:7px 11px;font-size:12px;line-height:1.42;color:#ffe9b0;}
.cl-val{flex:0 0 auto;align-self:stretch;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;padding:4px 13px;background:#1c1408;color:#ffcf6b;font-family:'Courier New',monospace;font-weight:bold;font-size:12px;min-width:78px;text-align:right;}
.cl-val small{font-size:8px;color:#8a7430;letter-spacing:1px;}
.cl-entry.sel{outline:2px solid #fff;outline-offset:-2px;}
.cl-entry.sel .cl-cap{background:#fff !important;}
.cl-entry.reversed{opacity:.4;}
.cl-entry.reversed .cl-mid{text-decoration:line-through;}
.cl-rb{color:#ff8a8a;font-style:italic;font-size:10px;}`;

function render(): void {
  // Update the badge even when the panel is closed (so layout edits & routing
  // changes both bump the count before the log is ever opened).
  const total = narratives.reduce((a, n) => a + n.entries.length, 0);
  const badge = document.querySelector('.cl-badge');
  if (badge) badge.textContent = String(total);
  if (!listEl) return;
  if (!total) { listEl.innerHTML = `<div class="cl-empty">— ship's log empty —<br>routing decisions appear here</div>`; return; }
  let html = '';
  [...narratives].reverse().forEach((n) => {
    const color = VOY_COLORS[narratives.indexOf(n) % VOY_COLORS.length] ?? '#C2B74B';
    html += `<div class="cl-nar"><div class="cl-nar-h" data-nar="${n.id}" style="background:${color}">${esc(n.title)}<span class="cl-edit">row=select · header=all · ✎</span></div>`;
    [...n.entries].reverse().forEach((e) => {
      html += `<div class="cl-entry${selected.has(e.id) ? ' sel' : ''}${e.reversed ? ' reversed' : ''}" data-entry="${e.id}">
        <div class="cl-cap" style="background:${color}"></div>
        <div class="cl-mid">${esc(e.text)}${e.reversed ? ' <span class="cl-rb">[course reversed]</span>' : ''}</div>
        <div class="cl-val">${hms(e.ts)}<small>UTC</small></div></div>`;
    });
    html += `</div>`;
  });
  listEl.innerHTML = html;
}

const entryById = (id: number): Entry | null => { for (const n of narratives) { const e = n.entries.find((x) => x.id === id); if (e) return e; } return null; };
const narById = (id: number): Narrative | undefined => narratives.find((n) => n.id === id);

/** The log is titled for the SEAT: "CAPTAIN'S LOG", "FIRST OFFICER'S LOG",
 *  "OPS' LOG" — every role type gets its own log identity (same store). */
export function logTitle(): string {
  const n = role().name.toUpperCase();
  return `${n}${n.endsWith('S') ? '’' : '’S'} LOG`;
}

function build(): HTMLElement {
  addStyles('captains-log-styles', CL_CSS);
  if (panel) return panel;
  panel = document.createElement('div');
  panel.className = 'cl-panel';
  panel.innerHTML = `
    <div class="cl-head"><span class="cl-title">▣ ${logTitle()}</span><span class="cl-x" title="Close">CLOSE</span></div>
    <div class="cl-tools"><button class="cl-rev">↩ REVERSE COURSE</button><button class="cl-new">✦ NEW VOYAGE</button></div>
    <div class="cl-list"></div>`;
  document.body.appendChild(panel);
  listEl = panel.querySelector('.cl-list');
  panel.querySelector('.cl-x')?.addEventListener('click', close);
  panel.querySelector('.cl-rev')?.addEventListener('click', reverseSelected);
  panel.querySelector('.cl-new')?.addEventListener('click', () => {
    const title = prompt('Name this voyage:', `Voyage ${nidSeq + 1}`);
    current = { id: ++nidSeq, title: (title || `Voyage ${nidSeq}`).trim(), entries: [] };
    narratives.push(current); render();
  });
  listEl?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const nh = target.closest<HTMLElement>('.cl-nar-h');
    if (nh?.dataset.nar) {
      if (target.classList.contains('cl-edit')) {
        const n = narById(Number(nh.dataset.nar));
        if (n) { const t = prompt('Rename voyage:', n.title); if (t != null) { n.title = t.trim() || n.title; render(); } }
        return;
      }
      const n = narById(Number(nh.dataset.nar));
      if (!n) return;
      const ids = n.entries.filter((x) => !x.reversed && !x.restored).map((x) => x.id);
      const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
      ids.forEach((id) => (allSel ? selected.delete(id) : selected.add(id)));
      render(); return;
    }
    const er = target.closest<HTMLElement>('.cl-entry');
    if (er?.dataset.entry) {
      const id = Number(er.dataset.entry), en = entryById(id);
      if (en && (en.reversed || en.restored)) return;   // restored = read-only history
      selected.has(id) ? selected.delete(id) : selected.add(id);
      render();
    }
  });
  return panel;
}

function open(): void { build().classList.add('open'); render(); }
function close(): void { panel?.classList.remove('open'); }

export function initCaptainsLog(): void {
  addStyles('captains-log-styles', CL_CSS);
  if (!document.querySelector('.cl-btn')) {
    const b = document.createElement('button');
    b.className = 'cl-btn';
    b.innerHTML = `${logTitle()}<span class="cl-badge">0</span>`;
    b.addEventListener('click', open);
    // Preferred seat: the auth corner row (log · rights · log-out share the top
    // corner); else the head of the sources panel.
    const corner = document.querySelector<HTMLElement>('.au-corner');
    const ingress = document.querySelector<HTMLElement>('.ingress-panel');
    if (corner) corner.insertBefore(b, corner.firstChild);
    else if (ingress) ingress.insertBefore(b, ingress.firstChild);
    else document.body.appendChild(b);
  }
  // The seat changes → the log re-titles itself (button, tooltip, panel head).
  onRoleChange(() => {
    const b = document.querySelector<HTMLElement>('.cl-btn');
    if (b) {
      const badge = b.querySelector('.cl-badge')?.textContent ?? '0';
      b.innerHTML = `${logTitle()}<span class="cl-badge">${badge}</span>`;
    }
    const t = panel?.querySelector('.cl-title');
    if (t) t.textContent = `▣ ${logTitle()}`;
  });
  const root = document.getElementById('production-content') || document.body;
  observer = new MutationObserver(onMutations);
  observer.observe(root, { childList: true, subtree: true });
  // The log survives the session: hydrate this seat's history (read-only rows)
  // and say so on the button — the operator knows nothing was lost.
  void hydrateLog().then((n) => {
    if (!n) return;
    const b = document.querySelector<HTMLElement>('.cl-btn');
    if (b) b.title = `Log restored — ${n} entr${n === 1 ? 'y' : 'ies'} from this seat's history`;
  });
}
