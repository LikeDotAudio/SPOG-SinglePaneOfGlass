// src/editors/chronos/controllers — the timing engines behind each Chronos card.
//
// A controller owns a millisecond value + transport and knows how to advance itself
// each frame. Three kinds:
//   • up    — a count-up stopwatch / chronometer (0 → up while running).
//   • down  — a count-down egg timer (capacity → 0; stops + rings once at zero).
//   • clock — the local time of day (free-running; ignores start/stop/reset).
// Displays (displays/*.ts) render a controller's `ms`; the two are orthogonal — any
// display can draw any controller. Modelled on the timer editor's engine, minus the
// broadcast keypad/GPI surface (this is the graphic set, not the RC1000 panel).

import { localMs, type CtrlKind } from './shared.js';

const HOUR = 3_600_000;
const UP_CEIL = 100 * HOUR - 1;   // 99h display ceiling for count-up
const DOWN_MAX = 60 * 60_000;     // 60-minute egg-timer dial full-scale

export class Controller {
  readonly id: string;
  readonly kind: CtrlKind;
  label: string;
  ms: number;
  running = false;
  capacityMs: number;   // count-down start value (= the egg-timer dial reading)
  private rang = false;  // latches once a down count reaches zero this run

  constructor(init: { id: string; kind: CtrlKind; label: string; capacityMs?: number }) {
    this.id = init.id;
    this.kind = init.kind;
    this.label = init.label;
    this.capacityMs = Math.min(DOWN_MAX, init.capacityMs ?? 5 * 60_000);
    this.ms = init.kind === 'down' ? this.capacityMs : 0;
  }

  start(): void { if (this.kind !== 'clock') { this.running = true; this.rang = false; } }
  stop(): void { this.running = false; }
  toggle(): void { if (this.running) this.stop(); else this.start(); }
  reset(): void { this.running = false; this.rang = false; this.ms = this.kind === 'down' ? this.capacityMs : 0; }

  /** Egg-timer only: set the count-down duration (also re-arms a stopped timer). */
  setCapacity(ms: number): void {
    this.capacityMs = Math.max(0, Math.min(DOWN_MAX, ms));
    if (!this.running) { this.ms = this.capacityMs; this.rang = false; }
  }
  /** Egg-timer only: wind the dial by a delta (the twist of the knob). */
  addCapacity(ms: number): void { this.setCapacity(this.capacityMs + ms); }

  /** Advance by dt ms. Returns true if a down count hit zero on THIS tick (ring once). */
  tick(dt: number): boolean {
    if (this.kind === 'clock') { this.ms = localMs(); return false; }
    if (!this.running) return false;
    if (this.kind === 'up') { this.ms = Math.min(UP_CEIL, this.ms + dt); return false; }
    // down
    this.ms -= dt;
    if (this.ms <= 0) {
      this.ms = 0; this.running = false;
      const first = !this.rang; this.rang = true;
      return first;
    }
    return false;
  }
}

/** Seed controllers from the routed feed labels (defaults to Chrono A + B + Local + Egg). */
export function deriveControllers(sources: ReadonlyArray<{ label: string }>): Controller[] {
  const A = (): Controller => new Controller({ id: 'A', kind: 'up', label: 'CHRONO A' });
  const B = (): Controller => new Controller({ id: 'B', kind: 'up', label: 'CHRONO B' });
  const L = (): Controller => new Controller({ id: 'L', kind: 'clock', label: 'LOCAL TIME' });
  const E = (): Controller => new Controller({ id: 'E', kind: 'down', label: 'EGG TIMER', capacityMs: 5 * 60_000 });
  const wantAll = sources.length === 0 || sources.some((s) => /set|chronos/i.test(s.label));
  if (wantAll) return [A(), B(), L(), E()];
  const out: Controller[] = [];
  for (const s of sources) {
    if (/egg|kitchen|cook|down/i.test(s.label)) out.push(E());
    else if (/local|clock|time/i.test(s.label)) out.push(L());
    else if (/\bb\b|chrono b/i.test(s.label)) out.push(B());
    else if (/\ba\b|chrono a|stop\s?watch|chrono/i.test(s.label)) out.push(A());
  }
  return out.length ? out : [A(), B(), L(), E()];
}
