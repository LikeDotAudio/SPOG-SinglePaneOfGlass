// src/ui/console/captains-log-persist — IndexedDB persistence + the external
// listener bus for the Captain's Log. persistEntry writes the audit trail (§8
// W2); hydrateLog restores it as read-only rows; emitLog fans every entry out
// to subscribers (the MQTT bridge) after persisting it.
import { idbPut, idbGetAll } from '../../platform/store-idb.js';
import { narratives, setCurrent, raiseNid, raiseEid, type StoredEntry, type LogEntryEvent } from './captains-log-state.js';
import { render } from './captains-log-view.js';

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

export async function hydrateLog(): Promise<number> {
  const rows = await idbGetAll<StoredEntry>('log');
  if (!rows.length) return 0;
  hydrating = true;
  try {
    rows.sort((a, b) => a.ts - b.ts || a.entry - b.entry);
    for (const r of rows) {
      let nar = narratives.find((n) => n.id === r.voyage);
      if (!nar) { nar = { id: r.voyage, title: r.voyTitle, entries: [] }; narratives.push(nar); }
      nar.entries.push({ id: r.entry, ts: r.ts, twist: null, dest: r.dest, prod: r.prod, added: [], removed: [], text: r.text, reversed: r.reversed, restored: true });
      raiseNid(r.voyage);
      raiseEid(r.entry);
    }
    narratives.sort((a, b) => a.id - b.id);
    // New work lands in a NEW voyage, not appended to a dead session's narrative.
    setCurrent(null);
    render();
  } finally { hydrating = false; }
  return rows.length;
}

const logListeners = new Set<(e: LogEntryEvent) => void>();
/** Subscribe to every Captain's Log entry (and course reversals). Returns an unsubscribe. */
export function onLogEntry(cb: (e: LogEntryEvent) => void): () => void { logListeners.add(cb); return () => logListeners.delete(cb); }
export function emitLog(e: LogEntryEvent): void {
  persistEntry(e);
  for (const l of logListeners) { try { l(e); } catch { /* a bad listener must not break logging */ } }
}
