// src/platform/merge/sentinel — SMRT's deterministic sentinel merge, ported to TS.
// See docs/Audits/Merge - vs last called.md §3 and the SMRT normative merge spec
// (docs/sentinel.md; conformance A-2.2-05, A-3.3-05, A-2.3-11).
//
// The algebra overloads three JSON scalars as CONTROL, not data:
//   undefined / null  = "no opinion — keep stored"   (nil)
//   false             = "off — suppress this branch"
//   true              = "render / pass through"       (yields to a stored literal)
//   anything else     = a LITERAL, and a literal always wins.
// Composite rule: objects merge recursively, arrays are ATOMIC (replace, never
// element-merge) — matching SPOG's whole-array crosspoints behaviour.

export type Overlay = { [k: string]: unknown };

export const isNoOpinion = (v: unknown): boolean => v === undefined || v === null;
export const isSentinel = (v: unknown): boolean => v === true || v === false || isNoOpinion(v);
/** SMRT is_array: a non-empty array is atomic data; an empty object is an overlay. */
export const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
const isPlainObject = (v: unknown): v is Overlay =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** eff(stored, incoming): the five-rule scalar precedence (SMRT §2.2). */
export function eff(stored: unknown, incoming: unknown): unknown {
  if (isNoOpinion(incoming)) return stored;                     // nil = no opinion → keep stored
  if (!isSentinel(incoming)) return incoming;                   // a literal always wins
  if (incoming === false) return false;                         // off-switch replaces
  return isSentinel(stored) ? true : stored;                    // true yields to a stored literal
}

/** Deterministic overlay merge: objects recurse, arrays + scalars go through eff. */
export function mergeSentinel(stored: unknown, incoming: unknown): unknown {
  if (isArray(incoming) || isArray(stored)) return eff(stored, incoming); // arrays atomic
  if (isPlainObject(stored) && isPlainObject(incoming)) {
    const out: Overlay = { ...stored };
    for (const k of Object.keys(incoming)) out[k] = mergeSentinel(stored[k], incoming[k]);
    return out;
  }
  return eff(stored, incoming);
}

/** True when a value is a real datum a human proposed (not a control sentinel). */
export const isLiteral = (v: unknown): boolean => !isSentinel(v);
