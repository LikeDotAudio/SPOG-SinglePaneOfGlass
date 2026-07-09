// src/platform/merge/resolve — pure resolution of one arbitration window.
// Deterministic given the bucket contents (independent of arrival order), so
// every console converges: literals beat sentinels; among literals the winner is
// the highest seat rank, full_id lexicographic as the convergent tie-break.

import { isLiteral, isNoOpinion } from './sentinel.js';
import type { Proposal } from './types.js';

export interface Resolution {
  resolved: unknown;
  contested: boolean;
  concordant: boolean;
  proposals: Proposal[]; // same objects, `won` stamped on the winner
}

const key = (v: unknown): string => { try { return JSON.stringify(v); } catch { return String(v); } };

/** Resolve a bucket (one proposal per origin) against the last stored value. */
export function resolveWindow(bucket: Proposal[], stored: unknown): Resolution {
  const opinions = bucket.filter((p) => !isNoOpinion(p.value)); // drop no-opinion bids
  const literals = opinions.filter((p) => isLiteral(p.value));
  bucket.forEach((p) => { p.won = false; });

  let resolved: unknown = stored;
  if (literals.length) {
    // Highest seat wins; equal seats break by full_id (total, on-the-wire, convergent).
    const winner = literals.slice().sort((a, b) =>
      b.seat - a.seat || (a.fullId < b.fullId ? -1 : a.fullId > b.fullId ? 1 : 0))[0]!;
    winner.won = true;
    resolved = winner.value;
  } else if (opinions.some((p) => p.value === false)) {
    resolved = false; // off-switch, no literal present
  } else if (opinions.some((p) => p.value === true)) {
    resolved = isLiteral(stored) ? stored : true; // render sentinel yields to a stored literal
  }

  const distinct = new Set(literals.map((p) => key(p.value)));
  const contested = literals.length >= 2 && distinct.size >= 2;
  const concordant = literals.length >= 2 && distinct.size === 1;
  return { resolved, contested, concordant, proposals: bucket };
}
