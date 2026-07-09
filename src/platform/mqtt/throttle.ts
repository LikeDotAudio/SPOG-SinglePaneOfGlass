// src/platform/mqtt/throttle — per-topic trailing-edge coalescing for publishValue
// (audit F4). Params publish THROTTLED by default (a slider drag / prompter scroll
// fires ~60 Hz); coalesce per-topic to ~20 Hz so the broker sees an order of
// magnitude fewer messages and the final retained value always lands. Discrete
// one-shots bypass this (they pass {throttle:false} and call send() directly).

type SendFn = (topic: string, payload: unknown) => void;
interface Slot { timer: ReturnType<typeof setTimeout> | null; pending: unknown; last: number }

export interface Throttler {
  /** Queue a payload for a topic; sends on the leading edge, then coalesces to the trailing edge. */
  push(topic: string, payload: unknown): void;
  /** Cancel all pending trailing sends (call on bus dispose). */
  dispose(): void;
}

export function makeThrottler(send: SendFn, ms = 50): Throttler {
  const state = new Map<string, Slot>();
  return {
    push(topic, payload) {
      const now = Date.now();
      const st = state.get(topic);
      if (!st) { state.set(topic, { timer: null, pending: null, last: now }); send(topic, payload); return; }
      const elapsed = now - st.last;
      if (elapsed >= ms && !st.timer) { st.last = now; st.pending = null; send(topic, payload); return; }
      st.pending = payload;                       // within window → remember latest, fire on trailing edge
      if (!st.timer) {
        st.timer = setTimeout(() => {
          const s = state.get(topic); if (!s) return;
          s.timer = null; s.last = Date.now();
          if (s.pending !== null) { const p = s.pending; s.pending = null; send(topic, p); }
        }, Math.max(0, ms - elapsed));
      }
    },
    dispose() { state.forEach((s) => { if (s.timer) clearTimeout(s.timer); }); state.clear(); },
  };
}
