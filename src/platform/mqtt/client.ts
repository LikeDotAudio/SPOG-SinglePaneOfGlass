// src/platform/mqtt/client — the TwistBus connection (audit §4.2).
//
// Faithful TS port of comMQTT's MqttProvider.jsx connection layer: mqtt.js over
// WebSockets, a per-session identity stamped into every payload, birth + last-will
// + 1 Hz heartbeat on a presence topic, reconnect, and self-echo suppression.
//
// Graceful degradation is a HARD requirement (TWIST is a static, zero-backend
// site): with no broker configured the bus becomes a no-op whose `ready` still
// resolves, so the console boots and runs identically with or without MQTT.

import type { TwistBus, ConfigMsg, ValueMsg } from './types.js';
import { getBrokerConfig, resolveBrokerUrl } from './config.js';
import { loadMqtt, type MqttClient } from './mqtt-load.js';
import { encodeAndEncrypt, decryptAndDecode } from './crypto.js';
import { makeThrottler } from './throttle.js';
import { topicMatches } from './topics.js';

// Re-exported so consumers (barrel index.ts) keep importing broker config from
// client.js after the config/loader extraction — public bus API is unchanged.
export {
  getBrokerSetting, setBrokerSetting, getBrokerConfig, setBrokerConfig,
  resolveBrokerUrl, type BrokerConfig,
} from './config.js';

export const SPOG_ROOT = 'SPOG';

function makeSessionId(): string {
  let hex = '';
  try {
    const b = new Uint8Array(4);
    crypto.getRandomValues(b);
    hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  } catch { hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'); }
  return `${hex}:TWIST:${Date.now()}`;
}

const dbg = (...a: unknown[]): void => { if (typeof window !== 'undefined' && window.OA_MQTT_DEBUG) console.log('[TwistBus]', ...a); };

/** A bus that does nothing but keeps the app happy when no broker is configured. */
function noopBus(sessionId: string): TwistBus {
  return {
    ready: Promise.resolve(),
    sessionId,
    status: () => ({ enabled: false, connected: false }),
    publishConfig: () => {},
    publishValue: () => {},
    publishRaw: () => {},
    subscribe: () => () => {},
    dispose: () => {},
  };
}

/**
 * Create the TwistBus. Returns immediately; `ready` resolves once connected or
 * once we've settled into the no-op/degraded path. Never throws, never blocks boot.
 */
export function createTwistBus(): TwistBus {
  const sessionId = makeSessionId();
  const myOrigin = sessionId.split(':')[0];   // 8-hex prefix — the v2 self-echo identity
  const url = resolveBrokerUrl();
  if (!url) { dbg('no broker configured — no-op bus'); return noopBus(sessionId); }

  const presenceTopic = `${SPOG_ROOT}/system/presence/${sessionId.split(':')[0]}`;
  const subs = new Set<{ filter: string; cb: (t: string, p: unknown) => void }>();
  // LAST-VALUE CACHE (audit §7.3 gap 1): the broker replays retained topics ONCE,
  // at the connect-time SPOG/# subscribe — anything subscribing later (editors
  // register onParam when they OPEN) missed it. Cache the last payload per topic
  // and replay matching entries to every new subscriber, so retained state
  // restores no matter when the applier arrives. Self-echoes are cached too —
  // an editor REopened later should see this console's own current state.
  const lastValue = new Map<string, unknown>();
  let client: MqttClient | null = null;
  let connected = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const full = (suffix: string): string => `${SPOG_ROOT}/${suffix.replace(/^\/+/, '')}`;

  let messageCounter = 0;
  let rateTimer: ReturnType<typeof setInterval> | null = null;
  const rateTopic = `${SPOG_ROOT}/system/rate/${sessionId.split(':')[0]}`;

  const send = async (topic: string, payload: any, retain = true): Promise<void> => {
    if (!client) return;                       // mqtt.js buffers pre-connect and flushes on connect
    try {
      let outPayload: string | Uint8Array;
      if (getBrokerConfig().plaintext) {
        outPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
      } else {
        outPayload = await encodeAndEncrypt(payload);
      }
      client.publish(topic, outPayload as any, { retain, qos: 0 });
      messageCounter++;
    } catch (e) { dbg('publish failed', topic, e); }
  };

  // Wire-rate throttle (audit F4): coalesce rapid param publishes per-topic — see throttle.ts.
  const throttler = makeThrottler((topic, payload) => void send(topic, payload));

  let resolveReady!: () => void;
  const ready = new Promise<void>((r) => { resolveReady = r; });
  // Never let boot hang on a dead broker: settle `ready` after connectTimeout.
  const readyTimer = setTimeout(() => { dbg('ready timeout — degraded'); resolveReady(); }, 30_000);

  void loadMqtt().then((mod) => {
    if (disposed) return;
    if (!mod) { clearTimeout(readyTimer); resolveReady(); return; }
    dbg('connecting', url);
    const cfg = getBrokerConfig();
    client = mod.connect(url, {
      username: cfg.username, password: cfg.password,
      keepalive: 60, reconnectPeriod: 5000, connectTimeout: 30_000,
      will: { topic: presenceTopic, payload: JSON.stringify({ active: false, full_id: sessionId }), retain: true, qos: 0 },
    });
    client.on('connect', () => {
      connected = true;
      dbg('connected', sessionId);
      client!.subscribe(`${SPOG_ROOT}/#`, { qos: 0 });
      const beat = (): void => { send(presenceTopic, { active: true, full_id: sessionId, ts: Date.now() }); };
      beat();
      heartbeat = setInterval(beat, 1000);
      rateTimer = setInterval(() => {
        send(rateTopic, { messagesPerMinute: messageCounter, ts: Date.now(), full_id: sessionId }, false);
        messageCounter = 0;
      }, 60000);
      clearTimeout(readyTimer);
      resolveReady();
    });
    client.on('reconnect', () => { connected = false; });
    client.on('close', () => { connected = false; });
    client.on('offline', () => { connected = false; });
    client.on('error', (e) => dbg('error', e));
    client.on('message', async (topic: string, payload: Uint8Array) => {
      let parsed: unknown = await decryptAndDecode(payload);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mqtt-raw-message', { detail: { topic, payload } }));
      }
      const rel = topic.startsWith(`${SPOG_ROOT}/`) ? topic.slice(SPOG_ROOT.length + 1) : topic;
      // Cache before the echo check (empty retained payload = tombstone → evict).
      if (payload.length === 0 || parsed === null) lastValue.delete(rel);
      else lastValue.set(rel, parsed);
      // Self-echo suppression by ORIGIN (v2 carries only the 4-byte origin, not the
      // full "<hex>:TWIST:<birth>" string; the decoder rebuilds it for both formats).
      const pOrigin = String((parsed as { full_id?: string } | null)?.full_id ?? '').split(':')[0];
      if (pOrigin && pOrigin === myOrigin) return;
      for (const s of subs) if (topicMatches(s.filter, rel)) s.cb(rel, parsed);
    });
  });

  return {
    ready,
    sessionId,
    status: () => ({ enabled: true, connected }),

    publishConfig(suffix, msg): void {
      const full_id = sessionId;
      send(full(`${suffix}`), { ...msg, full_id } satisfies ConfigMsg);
    },

    publishValue<T>(suffix: string, value: T, opts?: { throttle?: boolean }): void {
      const topic = full(suffix);
      const payload = { value, ts: Date.now(), full_id: sessionId } satisfies ValueMsg<T>;
      // Throttled by default (editor-services passes throttle:true unless a caller
      // opts out for a discrete one-shot); coalesce rapid drags on the trailing edge.
      if (opts?.throttle === false) void send(topic, payload);
      else throttler.push(topic, payload);
    },

    publishRaw(suffix, payload, opts): void {
      send(full(suffix), payload, opts?.retain ?? true);
    },

    subscribe(filter, cb): () => void {
      const entry = { filter: filter.replace(/^\/+/, ''), cb };
      subs.add(entry);
      // Replay the cache to the late subscriber (async so subscribe() never
      // re-enters the caller mid-registration).
      queueMicrotask(() => {
        if (!subs.has(entry)) return;
        for (const [t, p] of lastValue) if (topicMatches(entry.filter, t)) { try { entry.cb(t, p); } catch { /* applier */ } }
      });
      return () => subs.delete(entry);
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      clearTimeout(readyTimer);
      if (heartbeat) clearInterval(heartbeat);
      if (rateTimer) clearInterval(rateTimer);
      throttler.dispose();
      subs.clear();
      if (client) {
        send(presenceTopic, { active: false, full_id: sessionId });
        try { client.end(true); } catch { /* ignore */ }
      }
    },
  };
}
