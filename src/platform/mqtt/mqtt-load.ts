// src/platform/mqtt/mqtt-load — minimal mqtt.js typings + the bundled loader.
//
// Extracted from client.ts. VENDORED mqtt.js (audit §4.2 lane table / §8 W4):
// bundled + content-hashed by Vite, so the console has zero CDN dependency at boot.
// The UMD build sets window.mqtt when the injected script runs — same contract as
// the old unpkg tag.
import mqttJsUrl from '../../vendor/mqtt.min.js?url';

// ---- minimal mqtt.js typings (no @types/mqtt dependency) --------------------
export interface MqttClient {
  on(ev: 'connect' | 'reconnect' | 'close' | 'offline' | 'error', cb: (arg?: unknown) => void): void;
  on(ev: 'message', cb: (topic: string, payload: Uint8Array) => void): void;
  subscribe(topic: string, opts?: { qos?: 0 | 1 | 2 }): void;
  publish(topic: string, payload: string, opts?: { retain?: boolean; qos?: 0 | 1 | 2 }): void;
  end(force?: boolean, opts?: unknown, cb?: () => void): void;
}
export interface MqttModule {
  connect(url: string, opts?: Record<string, unknown>): MqttClient;
}
declare global {
  interface Window { mqtt?: MqttModule; OA_MQTT_DEBUG?: boolean; }
}

/** Load mqtt.js: use an already-present global, else inject the BUNDLED script. */
export function loadMqtt(): Promise<MqttModule | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.mqtt) return Promise.resolve(window.mqtt);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = mqttJsUrl;   // self-hosted — no unpkg, no third-party single point of failure
    s.async = true;
    s.onload = () => resolve(window.mqtt ?? null);
    s.onerror = () => { console.warn('TwistBus: failed to load bundled mqtt.js — MQTT disabled'); resolve(null); };
    document.head.appendChild(s);
  });
}
