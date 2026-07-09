// src/ui/console/captains-log — the Captain's Log (port of js/captains-log.js).
// Narrates EVERY routing change and lets the operator undo it ("Reverse Course").
// A MutationObserver watches the destinations content; whatever changes in a
// twist's drop-zone (drag-drop, the 1990s view, a portal, …) becomes a log entry,
// grouped into NARRATIVES ("voyages"). Reverse Course restores the exact nodes.
//
// This module is the slim ORCHESTRATOR + public barrel; the mechanics live in
// flat siblings: -state (shared state + types), -persist (IDB + listener bus),
// -narrate (mutation → entry + Reverse Course), -view (CSS + render).
import { addStyles } from '../dom.js';
import { role, onRoleChange } from '../../platform/auth.js';
import { ensureNarrative, nextEid, nextNid, nid, setCurrent, narratives, selected, entryById, narByKeyStr, raiseNid, raiseEid, selfOrigin, setSelfOrigin, originOf, narByOriginVoyage, type Entry, type Narrative, type LogEntryEvent } from './captains-log-state.js';
import { getBus } from '../../platform/mqtt/index.js';
import { hydrateLog, emitLog, onLogEntry, persistEntry } from './captains-log-persist.js';
import { signed, reverseSelected, observeRoot, narrationFromLabels } from './captains-log-narrate.js';
import { render, setListEl, CL_CSS } from './captains-log-view.js';

// Re-exported so importers of './captains-log.js' stay byte-identical.
export { onLogEntry };
export type { LogEntryEvent };

/** Log a SEMANTIC action (e.g. an Edit-Layout change) as a Captain's Log entry.
 *  `undo`, if given, is run by Reverse Course to undo it — so layout edits are
 *  narrated and reversible right alongside routing changes. */
export function logAction(text: string, undo?: () => void): void {
  const ts = Date.now();
  const nar = ensureNarrative();
  const line = signed(text);
  const entry: Entry = { id: nextEid(), ts, twist: null, dest: '', prod: '', added: [], removed: [], text: line, reversed: false, undo };
  nar.entries.push(entry);
  emitLog({ voyage: nar.id, entry: entry.id, ts, dest: '', prod: '', added: [], removed: [], text: line, reversed: false });
  render();
}

/** Inject a log entry received from the MQTT bridge into the local state. `origin`
 *  is the publishing console (the full_id prefix) — the UNIFIED log keeps every
 *  seat's voyages distinct, so entries never collide or drop as false duplicates. */
export function receiveNetworkLog(e: LogEntryEvent, origin?: string): void {
  const org = origin ?? 'local';
  let nar = narByOriginVoyage(org, e.voyage);
  if (!nar) {
    const mine = org === selfOrigin();
    nar = { id: e.voyage, origin: org, title: mine ? `Voyage ${e.voyage}` : `Voyage ${e.voyage} · ${org.slice(0, 4)}`, entries: [] };
    narratives.push(nar);
  }
  // A reversal updates the flag (+ who/when reversed) on an entry we already hold.
  const existing = nar.entries.find((x) => x.id === e.entry);
  if (existing) {
    if (e.reversed && !existing.reversed) {
      existing.reversed = true;
      existing.reversedBy = e.reversedBy;
      existing.reversedTs = e.reversedTs;
      persistEntry(e, org);
      render();
    }
    return;
  }

  // F3: routing entries arrive WITHOUT the English narration — rebuild it locally
  // from the structured fields (+ operator), identical to the authoring console.
  let text = e.text;
  if (!text && (e.added.length || e.removed.length)) {
    text = narrationFromLabels(e.dest, e.prod, e.removed, e.added, e.ts);
    if (e.by) text += ` · by ${e.by}`;
  }
  const entry: Entry = {
    id: e.entry, ts: e.ts, twist: null, dest: e.dest, prod: e.prod,
    added: [], removed: [], text, reversed: e.reversed,
    restored: true, origin: org
  };
  nar.entries.push(entry);
  nar.entries.sort((a, b) => a.id - b.id);
  // Sort narratives by earliest entry time so the merged log reads chronologically.
  narratives.sort((a, b) => (a.entries[0]?.ts ?? 0) - (b.entries[0]?.ts ?? 0) || a.id - b.id);
  // Only our OWN origin advances our local sequence counters.
  if (org === selfOrigin()) { raiseNid(e.voyage); raiseEid(e.entry); }

  persistEntry({ ...e, text }, org);   // store the rebuilt narration, not the empty wire text
  render();
}

let panel: HTMLElement | null = null;

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
  const listEl = panel.querySelector<HTMLElement>('.cl-list');
  setListEl(listEl);
  panel.querySelector('.cl-x')?.addEventListener('click', close);
  panel.querySelector('.cl-rev')?.addEventListener('click', reverseSelected);
  panel.querySelector('.cl-new')?.addEventListener('click', () => {
    const title = prompt('Name this voyage:', `Voyage ${nid() + 1}`);
    const nar: Narrative = { id: nextNid(), origin: selfOrigin(), title: (title || `Voyage ${nid()}`).trim(), entries: [] };
    setCurrent(nar); narratives.push(nar); render();
  });
  listEl?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const nh = target.closest<HTMLElement>('.cl-nar-h');
    if (nh?.dataset.nar) {
      if (target.classList.contains('cl-edit')) {
        const n = narByKeyStr(nh.dataset.nar);
        if (n) { const t = prompt('Rename voyage:', n.title); if (t != null) { n.title = t.trim() || n.title; render(); } }
        return;
      }
      const n = narByKeyStr(nh.dataset.nar);
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
  // Tag this seat's own entries with its session origin so the unified log keeps
  // our voyages distinct from every other console's (must run before hydrate).
  try { setSelfOrigin(originOf(getBus().sessionId)); } catch { /* no bus → stays 'local' */ }
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
  observeRoot(root);
  // The log survives the session: hydrate this seat's history (read-only rows)
  // and say so on the button — the operator knows nothing was lost.
  void hydrateLog().then((n) => {
    if (!n) return;
    const b = document.querySelector<HTMLElement>('.cl-btn');
    if (b) b.title = `Log restored — ${n} entr${n === 1 ? 'y' : 'ies'} from this seat's history`;
  });
}
