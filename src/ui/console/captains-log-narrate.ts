// src/ui/console/captains-log-narrate — turns drop-zone DOM mutations into
// narrated log entries and reverses them ("Reverse Course"). Owns the
// MutationObserver + its `paused` flag; reads/writes the shared state through
// the state module and fans entries out via persist's emitLog.
import { updateTwistVisuals } from './helix.js';
import { operator } from '../../platform/auth.js';
import { emitLog } from './captains-log-persist.js';
import { render } from './captains-log-view.js';
import { narratives, selected, ensureNarrative, nextEid, type Entry, type Removed } from './captains-log-state.js';

let observer: MutationObserver | null = null, paused = false;

const utc = (ts: number): string => new Date(ts).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '') + ' UTC';

/** Sign a log line with the operator's name (asked at login) when one is set. */
export const signed = (text: string): string => {
  const who = operator();
  return who ? `${text} · by ${who}` : text;
};

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

export function onMutations(records: MutationRecord[]): void {
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
    const entry: Entry = { id: nextEid(), ts, twist, dest, prod, added: ch.added.slice(), removed: ch.removed.slice(), text: signed(narrate(dest, prod, ch.removed.map((r) => r.node), ch.added, ts)), reversed: false };
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

export function reverseSelected(): void {
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

/** Wire the MutationObserver onto the destinations root (called once at init). */
export function observeRoot(root: Node): void {
  observer = new MutationObserver(onMutations);
  observer.observe(root, { childList: true, subtree: true });
}
