// src/platform/merge/manager — the windowed merge MEDIATOR ("the manager").
//
// Sits between the editor and the bus. Every write to a topic (local, foreign, or
// phantom) is bucketed by origin into a short arbitration window; at window close
// the bucket resolves deterministically (resolve.ts) and every registered applier
// snaps to the ONE converged value — no "up then down" volley. A resolve that held
// a real fight is emitted as a MergeEvent for the observer + the Captain's Log.
//
// Transport-free by design: the wiring layer (editor-services) feeds it foreign
// writes and forwards local writes to the bus. The phantom injector needs no bus,
// so the whole thing is visible in a single console with no broker.

import { resolveWindow } from './resolve.js';
import { localSeatRank, localSeatLabel } from './seat.js';
import type { MergeConfig, MergeEvent, Proposal } from './types.js';

interface Channel {
  key: string;
  stored: unknown;
  bucket: Map<string, Proposal>;   // one proposal per origin
  timer: ReturnType<typeof setTimeout> | null;
  appliers: Set<(v: unknown) => void>;
}

const CFG_KEY = 'spog.merge.cfg';
const loadCfg = (): MergeConfig => {
  try { return { enabled: true, windowMs: 140, ...JSON.parse(localStorage.getItem(CFG_KEY) || '{}') }; }
  catch { return { enabled: true, windowMs: 140 }; }
};

class MergeManager {
  private cfg = loadCfg();
  private channels = new Map<string, Channel>();
  private listeners = new Set<(e: MergeEvent) => void>();
  private evtSeq = 0;
  /** Self origin — set once by the wiring layer from the bus session id. */
  selfFullId = 'local:TWIST:0';
  get selfOrigin(): string { return this.selfFullId.split(':')[0]!; }

  getConfig(): MergeConfig { return { ...this.cfg }; }
  setConfig(patch: Partial<MergeConfig>): void {
    this.cfg = { ...this.cfg, ...patch };
    try { localStorage.setItem(CFG_KEY, JSON.stringify(this.cfg)); } catch { /* private mode */ }
    this.emitConfig();
  }
  private cfgListeners = new Set<(c: MergeConfig) => void>();
  onConfig(cb: (c: MergeConfig) => void): () => void { this.cfgListeners.add(cb); return () => this.cfgListeners.delete(cb); }
  private emitConfig(): void { const c = this.getConfig(); this.cfgListeners.forEach((l) => l(c)); }

  onEvent(cb: (e: MergeEvent) => void): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }

  private channel(topic: string, key?: string): Channel {
    let ch = this.channels.get(topic);
    if (!ch) { ch = { key: key ?? topic.split('/').pop() ?? topic, stored: undefined, bucket: new Map(), timer: null, appliers: new Set() }; this.channels.set(topic, ch); }
    else if (key) ch.key = key;
    return ch;
  }

  /** Register an applier for a topic's resolved value. Returns an unsubscribe. */
  onApply(topic: string, key: string, cb: (v: unknown) => void): () => void {
    const ch = this.channel(topic, key);
    ch.appliers.add(cb);
    return () => ch.appliers.delete(cb);
  }

  /** A local write from this console's editor. Returns whether the mediator is engaged. */
  submitLocal(topic: string, key: string, value: unknown): boolean {
    if (!this.cfg.enabled) return false;   // bypass → caller does a plain publish
    this.propose(topic, key, { origin: this.selfOrigin, label: localSeatLabel(), value, seat: localSeatRank(), ts: Date.now(), fullId: this.selfFullId, local: true });
    return true;
  }

  /** A foreign write heard on the bus (payload = {value, ts, full_id, seat?}). */
  ingestForeign(topic: string, key: string, payload: unknown): void {
    const p = payload as { value?: unknown; ts?: number; full_id?: string; seat?: number; label?: string } | null;
    const value = p && typeof p === 'object' && 'value' in p ? p.value : p;
    const fullId = String(p?.full_id ?? 'peer:TWIST:0');
    const origin = fullId.split(':')[0]!;
    if (origin === this.selfOrigin) return;   // never mediate our own echo
    if (!this.cfg.enabled) { this.channel(topic, key).appliers.forEach((a) => a(value)); return; }
    this.propose(topic, key, { origin, label: p?.label ?? `seat ${origin.slice(0, 4)}`, value, seat: p?.seat ?? 0, ts: p?.ts ?? Date.now(), fullId, local: false });
  }

  /** Inject a phantom competitor (demo). Local, no bus, fully arbitrated. */
  inject(topic: string, key: string, value: unknown, opts?: { seat?: number; label?: string; origin?: string }): void {
    const origin = opts?.origin ?? 'phantom0';
    this.propose(topic, key, { origin, label: opts?.label ?? 'Phantom', value, seat: opts?.seat ?? 200, ts: Date.now(), fullId: `${origin}:TWIST:0`, local: false });
  }

  private propose(topic: string, key: string, p: Proposal): void {
    const ch = this.channel(topic, key);
    ch.bucket.set(p.origin, p);
    if (!ch.timer) ch.timer = setTimeout(() => this.close(topic), this.cfg.windowMs);
  }

  private close(topic: string): void {
    const ch = this.channels.get(topic);
    if (!ch) return;
    ch.timer = null;
    const bucket = [...ch.bucket.values()];
    ch.bucket.clear();
    if (!bucket.length) return;
    const r = resolveWindow(bucket, ch.stored);
    ch.stored = r.resolved;
    // If OUR console won, the editor already holds a fresher local value — re-applying
    // a window-stale copy would rubber-band an active drag. Only snap when we lost.
    const winner = r.proposals.find((p) => p.won);
    if (!winner?.local) ch.appliers.forEach((a) => { try { a(r.resolved); } catch { /* applier owns its errors */ } });
    // Emit only for a real meeting (≥2 seats) or an explicit fight — keep the feed meaningful.
    if (bucket.length >= 2 || r.contested || r.concordant) {
      const e: MergeEvent = { id: ++this.evtSeq, topic, key: ch.key, resolved: r.resolved, contested: r.contested, concordant: r.concordant, proposals: r.proposals, ts: Date.now() };
      this.listeners.forEach((l) => { try { l(e); } catch { /* observer */ } });
    }
  }
}

/** Process-wide manager (the console is a single page). */
export const mergeManager = new MergeManager();
