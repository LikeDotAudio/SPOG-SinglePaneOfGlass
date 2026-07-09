// src/domain/tsg/catalog — collect every pattern under patterns/ (one file each).
//
// Adding a test signal is "drop a file in patterns/" — the glob registers it, the
// selector gallery and the routing lookups pick it up with ZERO edits here.

import type { TsgPattern, TsgGroup } from './types.js';

const mods = import.meta.glob<{ default?: TsgPattern }>('./patterns/*.ts', { eager: true });

/** Every registered pattern, in authored (order) sequence. */
export const PATTERNS: TsgPattern[] = Object.values(mods)
  .map((m) => m.default)
  .filter((p): p is TsgPattern => !!p && typeof p.draw === 'function')
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

/** The default pattern a bare "TSG SET" feed resolves to (SMPTE bars-equivalent). */
export const DEFAULT_TSG = PATTERNS.find((p) => p.id === 'ebubars') ?? PATTERNS[0]!;

/** Look up by stable id (persisted / MQTT value). Falls back to the default. */
export function patternById(id: string | undefined): TsgPattern {
  return PATTERNS.find((p) => p.id === id) ?? DEFAULT_TSG;
}

/** Resolve a routed feed LABEL to its pattern; a "SET"/unknown label → default.
 *  Matching is case/space-insensitive so JSON label drift doesn't break routing. */
export function patternForLabel(label: string | undefined): TsgPattern {
  const norm = (s: string): string => s.trim().toUpperCase();
  if (!label) return DEFAULT_TSG;
  return PATTERNS.find((p) => norm(p.label) === norm(label)) ?? DEFAULT_TSG;
}

/** Resolve a FRIENDLY query — the stable id, the routable label, OR the display name,
 *  in any case/spacing — to a pattern. Unlike patternById / patternForLabel (which
 *  fall back to DEFAULT_TSG), this returns null when nothing matches, so a deep-link
 *  handler can tell a typo apart from a real pattern and warn instead of silently
 *  showing bars. Exact match wins; a prefix match is the fallback (e.g. "plasma" →
 *  "PLASMA (BURN-IN)"). */
export function findPattern(query: string | undefined): TsgPattern | null {
  const norm = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]+/g, '');
  const q = norm(query || '');
  if (!q) return null;
  return PATTERNS.find((p) => norm(p.id) === q || norm(p.label) === q || norm(p.name) === q)
    ?? PATTERNS.find((p) => norm(p.id).startsWith(q) || norm(p.name).startsWith(q) || norm(p.label).startsWith(q))
    ?? null;
}

/** Patterns grouped for the gallery (SDR then HDR), preserving order within a group. */
export function byGroup(): Array<[TsgGroup, TsgPattern[]]> {
  const groups: TsgGroup[] = ['SDR', 'HDR'];
  return groups.map((grp) => [grp, PATTERNS.filter((p) => p.group === grp)]);
}
