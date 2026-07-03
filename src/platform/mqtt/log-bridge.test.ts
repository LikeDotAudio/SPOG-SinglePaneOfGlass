// src/platform/mqtt/log-bridge.test — the Captain's Log → MQTT bridge publishes
// every log entry (routing changes AND layout edits via logAction) to the bus, and
// keeps working when the broker connects AFTER boot.

import { describe, it, expect, beforeAll } from 'vitest';
import { startLogBridge } from './log-bridge.js';
import { logAction } from '../../ui/console/captains-log.js';
import type { TwistBus } from './types.js';

// captains-log render() touches `document` (badge count); stub it so logAction is
// safe under the node test env (the emit to listeners happens before render()).
beforeAll(() => {
  (globalThis as unknown as { document: unknown }).document = { querySelector: () => null };
});

interface Pub { topic: string; payload: unknown }
function fakeBus(getEnabled: () => boolean): { bus: TwistBus; pubs: Pub[] } {
  const pubs: Pub[] = [];
  const bus = {
    ready: Promise.resolve(),
    sessionId: 'abcd:TWIST:1',
    status: () => ({ enabled: getEnabled(), connected: getEnabled() }),
    publishConfig: () => {},
    publishValue: () => {},
    publishRaw: (topic: string, payload: unknown) => { pubs.push({ topic, payload }); },
    subscribe: () => () => {},
    dispose: () => {},
  } as unknown as TwistBus;
  return { bus, pubs };
}

describe('startLogBridge', () => {
  it('publishes each entry to log/<voyage>/<entry> AND log/latest', () => {
    const { bus, pubs } = fakeBus(() => true);
    const stop = startLogBridge(bus);
    logAction('Layout · PROD 7 — renamed container');
    stop();

    const latest = pubs.find((p) => p.topic === 'log/latest');
    expect(latest).toBeTruthy();
    expect((latest!.payload as { text: string }).text).toContain('renamed container');
    expect((latest!.payload as { full_id: string }).full_id).toBe('abcd:TWIST:1');
    expect(pubs.some((p) => /^log\/\d+\/\d+$/.test(p.topic))).toBe(true);
  });

  it('stays silent while the bus is disabled (no broker configured)', () => {
    const { bus, pubs } = fakeBus(() => false);
    const stop = startLogBridge(bus);
    logAction('should not publish');
    stop();
    expect(pubs.length).toBe(0);
  });

  it('publishes once the broker connects LATE (regression: old code stayed dead)', () => {
    let enabled = false;
    const { bus, pubs } = fakeBus(() => enabled);
    const stop = startLogBridge(bus);
    logAction('before connect');   // disabled → dropped
    enabled = true;                // broker connects after boot
    logAction('after connect');    // now live → published
    stop();

    const texts = pubs.map((p) => (p.payload as { text: string }).text);
    expect(texts.some((t) => t.includes('after connect'))).toBe(true);
    expect(texts.some((t) => t.includes('before connect'))).toBe(false);
  });
});
