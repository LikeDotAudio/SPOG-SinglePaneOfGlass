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

/** Patterns grouped for the gallery (SDR then HDR), preserving order within a group. */
export function byGroup(): Array<[TsgGroup, TsgPattern[]]> {
  const groups: TsgGroup[] = ['SDR', 'HDR'];
  return groups.map((grp) => [grp, PATTERNS.filter((p) => p.group === grp)]);
}
