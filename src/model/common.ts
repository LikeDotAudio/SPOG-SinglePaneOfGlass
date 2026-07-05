// src/model/common — primitives shared across every domain shape.
// See docs/TYPESCRIPT-WASM-REPORT.md §A.2.

export type Hex = `#${string}`;

/** A source/device is faulted when status is set and isn't "OK". */
export type Status = 'OK' | (string & {});

/**
 * A hover tip ("tool tick") authored in the Routes JSON — on a production/room,
 * a floor room, a person, a source box, or an individual twist. The bare-string
 * form is the whole tip; the object form adds the same ✓ good / ✕ bad guidance the
 * Meter Input scopes use. Surfaced by `ui/tip.ts` alongside the context-derived
 * "what the production expects" tip. See docs/Audit /LCARS-Hover-Tooltips-*.
 */
export type TipSpec = string | { title?: string; lead: string; good?: string; bad?: string };

/** A folder manifest (index.json): entries ending "/" are directories. */
export type Manifest = string[];

export type PoolKind = 'video' | 'audio' | 'playout' | 'productions' | 'streams' | 'person';
