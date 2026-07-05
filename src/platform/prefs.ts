// src/platform/prefs — THE versioned per-seat preference store
// (docs/Audit/Local-Cache-and-Preferences-Audit.md §3.3, §8 W1).
//
// One localStorage blob (`spog.prefs.v1`) holds every small global preference:
// chirality, colour scheme, authoring mode, and the console UI memory (selected
// destination tab, open footer groups, sash width, router-view collapse). Reads
// are synchronous — the colour + chirality engines paint BEFORE first render.
// Per-twist heavy keys (vm layouts, clock scenes, counters, drafts) keep their
// own localStorage keys but are NAMED in SEAT_KEY_PREFIXES so export / import /
// reset can enumerate the operator's whole seat.
//
// Every patch stamps `ts` (epoch ms) — the newer-wins key the W3 bus reconcile
// compares against the retained SPOG/seats/<seat>/prefs copy. `seat` is the
// STABLE identity the bus's per-boot sessionId is not.

export interface RouterCollapsed { prods: string[]; origins: string[] }
export interface UiPrefs {
  destTab?: string;
  openGroups?: string[];
  sashPx?: number;
  routerCollapsed?: RouterCollapsed;
}
export interface Prefs {
  v: 1;
  seat: string;   // stable seat id — survives reloads (unlike the bus sessionId)
  ts: number;     // last local write, epoch ms — the newer-wins reconcile key
  chirality?: 'left' | 'right';
  colour?: Record<string, unknown>;
  authoring?: boolean;
  ui: UiPrefs;
}

const KEY = 'spog.prefs.v1';

/** Every localStorage prefix that IS the operator's seat. twistMqtt* credentials
 *  are deliberately excluded — secrets never ride an export blob (audit §5.4). */
export const SEAT_KEY_PREFIXES: readonly string[] = [
  KEY, 'spog.counters.v1', 'spog.prompter.',
  // shipped-era keys (live on deployed seats) keep their historic names:
  'twist:routes:draft:', 'twist.vm.', 'twistClockLayouts', 'twistTimerWallClock',
  'twist-tutorial-dismissed',
];

function mintSeat(): string {
  try {
    const b = new Uint8Array(4);
    crypto.getRandomValues(b);
    return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch { return `seat-${Date.now().toString(16)}`; }
}

let cache: Prefs | null = null;

function save(p: Prefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
}

// One-time adoption of the pre-blob keys (they stop existing after this).
function migrateLegacy(p: Prefs): void {
  try {
    const chir = localStorage.getItem('twist.chirality');
    if (chir === 'left' || chir === 'right') p.chirality = chir;
    const col = localStorage.getItem('twist.colour');
    if (col) p.colour = JSON.parse(col) as Record<string, unknown>;
    const auth = localStorage.getItem('twist:authoring:on');
    if (auth !== null) p.authoring = auth === '1';
    ['twist.chirality', 'twist.colour', 'twist:authoring:on'].forEach((k) => localStorage.removeItem(k));
  } catch { /* malformed legacy values lose to defaults */ }
}

export function getPrefs(): Prefs {
  if (cache) return cache;
  let p: Prefs | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as Partial<Prefs>;
      if (j && j.v === 1 && typeof j.seat === 'string') {
        p = { v: 1, seat: j.seat, ts: typeof j.ts === 'number' ? j.ts : 0, ui: j.ui ?? {} };
        if (j.chirality === 'left' || j.chirality === 'right') p.chirality = j.chirality;
        if (j.colour && typeof j.colour === 'object') p.colour = j.colour;
        if (typeof j.authoring === 'boolean') p.authoring = j.authoring;
      }
    }
  } catch { /* fall through to fresh */ }
  if (!p) {
    p = { v: 1, seat: mintSeat(), ts: Date.now(), ui: {} };
    migrateLegacy(p);
    save(p);
  }
  cache = p;
  return p;
}

/** Merge a patch (ui merges one level deep), stamp ts, persist, announce. */
export function patchPrefs(
  patch: Partial<Omit<Prefs, 'v' | 'seat' | 'ts' | 'ui'>> & { ui?: Partial<UiPrefs> },
): Prefs {
  const p = getPrefs();
  const next: Prefs = { ...p, ...patch, v: 1, seat: p.seat, ts: Date.now(), ui: { ...p.ui, ...(patch.ui ?? {}) } };
  cache = next;
  save(next);
  document.dispatchEvent(new CustomEvent<Prefs>('prefs-change', { detail: next }));
  return next;
}

/** Adopt a whole blob from elsewhere (bus reconcile / import) — keeps this
 *  machine's seat id and the incoming ts (do NOT re-stamp: that would win every
 *  newer-wins comparison forever). */
export function adoptPrefs(p: Prefs): void {
  cache = { ...p, v: 1, seat: getPrefs().seat, ui: p.ui ?? {} };
  save(cache);
  document.dispatchEvent(new CustomEvent<Prefs>('prefs-change', { detail: cache }));
}

// ---- export / import "my seat" — the whole operator setup as one blob -------
export interface SeatExport { kind: 'spog-seat' | 'twist-seat'; exportedAt: string; keys: Record<string, string> }

export function exportSeat(): SeatExport {
  const keys: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (SEAT_KEY_PREFIXES.some((pre) => k === pre || k.startsWith(pre))) keys[k] = localStorage.getItem(k) ?? '';
    }
  } catch { /* private mode */ }
  return { kind: 'spog-seat', exportedAt: new Date().toISOString(), keys };
}

/** Restore an exported seat. Returns the number of keys written; reload after.
 *  Accepts the short-lived 'twist-seat' era too, renaming its keys on the way in. */
export function importSeat(blob: SeatExport): number {
  if (!blob || (blob.kind !== 'spog-seat' && blob.kind !== 'twist-seat') || typeof blob.keys !== 'object') return 0;
  const renames: ReadonlyArray<[string, string]> =
    [['twist.prefs.v1', 'spog.prefs.v1'], ['twist.counters.v1', 'spog.counters.v1'], ['twist.prompter.', 'spog.prompter.']];
  let n = 0;
  try {
    for (const [rawKey, v] of Object.entries(blob.keys)) {
      if (typeof v !== 'string') continue;
      const ren = renames.find(([old]) => rawKey === old || rawKey.startsWith(old));
      const k = ren ? ren[1] + rawKey.slice(ren[0].length) : rawKey;
      if (SEAT_KEY_PREFIXES.some((pre) => k === pre || k.startsWith(pre))) { localStorage.setItem(k, v); n++; }
    }
  } catch { /* quota / private mode */ }
  cache = null;   // force re-read on next getPrefs()
  return n;
}
