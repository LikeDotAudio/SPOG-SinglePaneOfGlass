// src/ui/console/captains-log-state — the Captain's Log SHARED MUTABLE STATE.
// Single owner of the narratives / selected / sequence counters that every
// other captains-log module reads and mutates through these accessors, plus
// the shared record types. Isolating it here is what keeps the file split from
// leaking module state across the persist / narrate / view / orchestrator seams.

interface Removed { node: HTMLElement; parent: Node; next: Node | null }
// `undo` is set on SEMANTIC entries (e.g. a layout edit via logAction): reversing
// them runs the callback instead of restoring drop-zone nodes. Routing entries
// carry a real `twist` + added/removed nodes; action entries carry `twist: null`.
// `restored` marks entries hydrated from IndexedDB — read-only history: the DOM
// nodes / undo callbacks they narrated died with the previous session, so they
// can't be selected for Reverse Course (audit §7.3 gap 3).
export interface Entry { id: number; ts: number; twist: HTMLElement | null; dest: string; prod: string; added: HTMLElement[]; removed: Removed[]; text: string; reversed: boolean; reversedBy?: string; reversedTs?: number; undo?: () => void; restored?: boolean; origin?: string; role?: string }
// A narrative is identified by (origin session, voyage number): a UNIFIED log
// merges every console's voyages, so two seats' "Voyage 1" stay distinct entries.
export interface Narrative { id: number; title: string; entries: Entry[]; origin?: string }
export type { Removed };
// IndexedDB row shape (audit §8 W2): the log is the audit trail.
export interface StoredEntry { k: string; origin?: string; voyage: number; voyTitle: string; entry: number; ts: number; dest: string; prod: string; text: string; reversed: boolean; reversedBy?: string; reversedTs?: number; by?: string; role?: string }
/** A log entry surfaced to external listeners (the MQTT bridge, audit §4.6). */
export interface LogEntryEvent { voyage: number; entry: number; ts: number; dest: string; prod: string; added: string[]; removed: string[]; text: string; reversed: boolean; reversedBy?: string; reversedTs?: number; by?: string; role?: string }

// The one true copies of the mutable state. Arrays/sets are exported by
// reference (mutated in place); the scalar counters + `current` are private and
// only ever touched through the accessors below so there is a single owner.
export const narratives: Narrative[] = [];
export const selected = new Set<number>();
let current: Narrative | null = null;
let nidSeq = 0, eidSeq = 0;

// This console's own origin (the 8-hex session prefix). Every LOCAL entry is
// tagged with it so the unified log can tell our voyages apart from other seats'.
let selfOrig = 'local';
export const selfOrigin = (): string => selfOrig;
export const setSelfOrigin = (o: string): void => { if (o) selfOrig = o; };
/** The full_id's origin prefix (`a1b2c3d4:TWIST:…` → `a1b2c3d4`). */
export const originOf = (fullId: string | undefined): string => (fullId ? fullId.split(':')[0]! : 'local');
/** Stable composite key for a narrative in the unified log. */
export const narKey = (origin: string | undefined, voyage: number): string => `${origin ?? 'local'}~${voyage}`;

export const getCurrent = (): Narrative | null => current;
export const setCurrent = (n: Narrative | null): void => { current = n; };
export const nid = (): number => nidSeq;
export const nextNid = (): number => ++nidSeq;
export const nextEid = (): number => ++eidSeq;
export const raiseNid = (v: number): void => { nidSeq = Math.max(nidSeq, v); };
export const raiseEid = (v: number): void => { eidSeq = Math.max(eidSeq, v); };

export function ensureNarrative(): Narrative {
  if (!current) { current = { id: ++nidSeq, title: `Voyage ${nidSeq}`, entries: [], origin: selfOrig }; narratives.push(current); }
  return current;
}

export const entryById = (id: number): Entry | null => { for (const n of narratives) { const e = n.entries.find((x) => x.id === id); if (e) return e; } return null; };
export const narById = (id: number): Narrative | undefined => narratives.find((n) => n.id === id);
/** Look up a narrative by its unified (origin, voyage) identity. */
export const narByOriginVoyage = (origin: string | undefined, voyage: number): Narrative | undefined =>
  narratives.find((n) => (n.origin ?? 'local') === (origin ?? 'local') && n.id === voyage);
/** Look up a narrative by its composite `origin~voyage` key (as emitted in the DOM). */
export const narByKeyStr = (key: string): Narrative | undefined => {
  const i = key.lastIndexOf('~');
  return i < 0 ? undefined : narByOriginVoyage(key.slice(0, i), Number(key.slice(i + 1)));
};
