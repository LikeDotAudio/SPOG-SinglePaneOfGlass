// src/platform/merge/seat — the seat priority used as the primary merge tie-break.
// A higher rank wins a same-scalar contest (the director beats the operator);
// full_id lexicographic is the convergent secondary tie-break in the manager.
//
// NOTE (Phase 2): cross-console seat priority needs the rank on the wire. Today
// only the LOCAL seat's rank is authoritative; foreign writes fall back to their
// full_id order. The phantom controller (demo) carries an explicit rank so the
// priority rule is fully visible in a single console.

import { role } from '../auth.js';

const TIER_RANK: Record<string, number> = { Command: 300, Operations: 200, Engineering: 100 };

/** Rank a role by tier, nudged by a few well-known ids so peers within a tier order stably. */
export function rankOfRole(id: string, tier: string): number {
  const base = TIER_RANK[tier] ?? 50;
  const bump: Record<string, number> = { ep: 40, director: 30, td: 20, ops: 10 };
  return base + (bump[id] ?? 0);
}

/** The local operator's seat rank. */
export function localSeatRank(): number {
  const r = role();
  return rankOfRole(r.id, r.tier);
}

/** A short label for the local seat (shown in the observer + badge). */
export function localSeatLabel(): string {
  return role().sub || role().name || 'seat';
}
