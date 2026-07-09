// src/platform/merge/types — shared shapes for the merge manager + observer.

/** One writer's bid for a topic inside an arbitration window. */
export interface Proposal {
  origin: string;      // 8-hex writer identity (self-echo key)
  label: string;       // human seat label ("Director", "Phantom OPS", …)
  value: unknown;      // the proposed value (literal or sentinel)
  seat: number;        // seat rank — primary tie-break (higher wins)
  ts: number;          // event time — buckets the write into a window
  fullId: string;      // full session id — convergent secondary tie-break
  local: boolean;      // this console authored it (vs foreign / phantom)
  won?: boolean;       // set at resolve
}

/** The result of resolving one window — the observer's unit of display. */
export interface MergeEvent {
  id: number;
  topic: string;       // e.g. rooms/<prod>/twists/<twist>/params/position
  key: string;         // the short param name
  resolved: unknown;   // the value every console converges on
  contested: boolean;  // ≥2 origins proposed DISTINCT literals
  concordant: boolean; // ≥2 origins proposed the SAME literal (co-drive)
  proposals: Proposal[];
  ts: number;
}

export interface MergeConfig {
  enabled: boolean;    // master switch (mediator vs raw last-writer-wins)
  windowMs: number;    // arbitration window width
}
