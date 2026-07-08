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
    
    // Listen for pings
    bus.subscribeRaw('SPOG/system/time/ping', (topic, msg) => {
      if (!this.master) return;
      try {
        const payload = JSON.parse(new TextDecoder().decode(msg));
        if (payload.t1 && payload.client) {
          bus.publishRaw(`SPOG/system/time/pong/${payload.client}`, JSON.stringify({
            t1: payload.t1,
            t2: Date.now(),
            t3: Date.now()
          }), { retain: false, qos: 0 });
        }
      } catch (e) { /* ignore */ }
    });

    // Listen for pongs addressed to us
    bus.subscribeRaw(`SPOG/system/time/pong/${this.myId}`, (topic, msg) => {
      try {
        const payload = JSON.parse(new TextDecoder().decode(msg));
        const t4 = Date.now();
        const newOffset = ((payload.t2 - payload.t1) + (payload.t3 - t4)) / 2;
        
        // Smooth the offset
        if (Math.abs(this.offset - newOffset) > 1000) {
          this.offset = newOffset; // Hard snap if way off
        } else {
          this.offset = this.offset * 0.8 + newOffset * 0.2; // Soft smooth
        }
      } catch (e) { /* ignore */ }
    });

    // Periodically send ping if we are not the master
    setInterval(() => {
      if (!this.master) {
        bus.publishRaw('SPOG/system/time/ping', JSON.stringify({ 
          t1: Date.now(), 
          client: this.myId 
        }), { retain: false, qos: 0 });
      }
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
