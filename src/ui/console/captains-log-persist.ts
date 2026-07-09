// src/ui/console/captains-log-persist — IndexedDB persistence + the external
// listener bus for the Captain's Log. persistEntry writes the audit trail (§8
// W2); hydrateLog restores it as read-only rows; emitLog fans every entry out
// to subscribers (the MQTT bridge) after persisting it.
import { idbPut, idbGetAll } from '../../platform/store-idb.js';
import { narratives, setCurrent, raiseNid, raiseEid, selfOrigin, narByOriginVoyage, type StoredEntry, type LogEntryEvent } from './captains-log-state.js';
import { render } from './captains-log-view.js';

let hydrating = false;
export function persistEntry(e: LogEntryEvent, origin?: string): void {
  if (hydrating) return;
  const org = origin ?? selfOrigin();
  const key = `${org}:${e.voyage}:${e.entry}`;
  const voyTitle = narByOriginVoyage(org, e.voyage)?.title ?? `Voyage ${e.voyage}`;
  if (e.reversed) {
    // A reversal updates the ORIGINAL record's flag; the "Course reversed" text
    // is session commentary, not a new history row.
    void idbGetAll<StoredEntry>('log').then((all) => {
      const rec = all.find((r) => r.k === key);
      if (rec) void idbPut('log', { ...rec, reversed: true, reversedBy: e.reversedBy, reversedTs: e.reversedTs });
    });
    return;
  }
  void idbPut('log', { k: key, origin: org, voyage: e.voyage, voyTitle, entry: e.entry, ts: e.ts, dest: e.dest, prod: e.prod, text: e.text, reversed: e.reversed });
}

export async function hydrateLog(): Promise<number> {
  const rows = await idbGetAll<StoredEntry>('log');
  if (!rows.length) return 0;
  hydrating = true;
  try {
    rows.sort((a, b) => a.ts - b.ts || a.entry - b.entry);
    for (const r of rows) {
      const org = r.origin ?? selfOrigin();   // legacy rows predate origins → treat as ours
      let nar = narByOriginVoyage(org, r.voyage);
      if (!nar) {
        const mine = org === selfOrigin();
        nar = { id: r.voyage, origin: org, title: mine ? r.voyTitle : `${r.voyTitle} · ${org.slice(0, 4)}`, entries: [] };
        narratives.push(nar);
      }
      nar.entries.push({ id: r.entry, ts: r.ts, twist: null, dest: r.dest, prod: r.prod, added: [], removed: [], text: r.text, reversed: r.reversed, reversedBy: r.reversedBy, reversedTs: r.reversedTs, restored: true, origin: org });
      if (org === selfOrigin()) { raiseNid(r.voyage); raiseEid(r.entry); }
    }
    // Chronological across the merged log.
    narratives.sort((a, b) => (a.entries[0]?.ts ?? 0) - (b.entries[0]?.ts ?? 0) || a.id - b.id);
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
