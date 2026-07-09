import { getBus } from './mqtt/index.js';

class NetworkTimeSync {
  public offset = 0;
  private myId = Math.random().toString(36).slice(2, 10);
  private master = false;
  private initialized = false;
  
  public init() {
    if (this.initialized) return;
    this.initialized = true;
    
    const bus = getBus();
    // Topics are relative to the SPOG root — the bus adds it. Payloads ride as plain
    // objects (publishRaw encodes; subscribe hands back the decoded object).

    // Listen for pings (the master answers with a pong stamped with its own clock).
    bus.subscribe('system/time/ping', (_topic, payload) => {
      if (!this.master) return;
      const p = payload as { t1?: number; client?: string } | null;
      if (p && p.t1 && p.client) {
        bus.publishRaw(`system/time/pong/${p.client}`, { t1: p.t1, t2: Date.now(), t3: Date.now() }, { retain: false });
      }
    });

    // Listen for pongs addressed to us and fold the round-trip into the offset.
    bus.subscribe(`system/time/pong/${this.myId}`, (_topic, payload) => {
      const p = payload as { t1?: number; t2?: number; t3?: number } | null;
      if (!p || p.t1 == null || p.t2 == null || p.t3 == null) return;
      const t4 = Date.now();
      const newOffset = ((p.t2 - p.t1) + (p.t3 - t4)) / 2;
      // Hard-snap if way off, else smooth toward the new estimate.
      this.offset = Math.abs(this.offset - newOffset) > 1000 ? newOffset : this.offset * 0.8 + newOffset * 0.2;
    });

    // Periodically send a ping if we are not the master.
    setInterval(() => {
      if (!this.master) bus.publishRaw('system/time/ping', { t1: Date.now(), client: this.myId }, { retain: false });
    }, 2000);
  }

  public now(): number {
    return Date.now() + this.offset;
  }

  public claimMaster() {
    this.master = true;
    this.offset = 0; // The master considers its own clock as the absolute truth
  }
}

export const timeSync = new NetworkTimeSync();
