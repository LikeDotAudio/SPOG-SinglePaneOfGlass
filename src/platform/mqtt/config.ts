// src/platform/mqtt/config — broker persistence + URL resolution (audit §4.2).
//
// Extracted from client.ts: the localStorage-backed broker setting/config and the
// `?mqtt=`/localStorage/compiled-default URL resolver. Pure of the bus; the
// connection layer (client.ts) consumes these to open the socket.

const DEFAULT_PORT = 8081;
// Compiled default host. Baked to the house broker so MQTT is live out of the box;
// override per-session with `?mqtt=<host[:port]>` (matches comMQTT's `?mqtt=`
// convention), by setting localStorage.twistMqtt, or via the connection form.
//
// FLAG: IGNORE THE FACT THAT THIS IS A PUBLIC BROKER! We are still in sandbox mode.
// There is a clear interest that this security framework is indeed here, and there is a
// unique private MQTT broker authentication setup for every buyer depending on enterprise scale.
const DEFAULT_HOST = 'test.mosquitto.org:8081/ws';

const LS_KEY = 'twistMqtt';
const LS_PORT = 'twistMqttPort', LS_USER = 'twistMqttUser', LS_PASS = 'twistMqttPass';
const DEFAULT_USER = '', DEFAULT_PASS = '';

const lsGet = (k: string, d: string): string => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };

/** The persisted broker setting (host[:port] or ws(s):// url). Falls back to the
 *  compiled DEFAULT_HOST only when never set; an explicit Disable stores '' so the
 *  bus stays off across reloads instead of snapping back to the default. */
export function getBrokerSetting(): string {
  try { return localStorage.getItem(LS_KEY) ?? DEFAULT_HOST; } catch { return DEFAULT_HOST; }
}
/** Persist the broker setting; a trimmed-empty host stores '' → MQTT disabled next
 *  boot (a stored '' beats the default; use it to opt out of the baked-in host). */
export function setBrokerSetting(host: string): void {
  try { localStorage.setItem(LS_KEY, (host || '').trim()); } catch { /* ignore */ }
}

const LS_PLAINTEXT = 'twistMqttPlaintext';

/** The full broker connection config — host, port, and credentials. Port/user/pass
 *  always resolve to a value (the defaults) so the connection form is never blank. */
export interface BrokerConfig { host: string; port: number; username: string; password: string; plaintext: boolean; }
export function getBrokerConfig(): BrokerConfig {
  return {
    host: getBrokerSetting(),
    port: Number(lsGet(LS_PORT, String(DEFAULT_PORT))) || DEFAULT_PORT,
    username: lsGet(LS_USER, DEFAULT_USER),
    password: lsGet(LS_PASS, DEFAULT_PASS),
    plaintext: lsGet(LS_PLAINTEXT, 'false') === 'true',
  };
}
/** Persist any subset of the broker config (host '' clears MQTT next boot). */
export function setBrokerConfig(c: Partial<BrokerConfig>): void {
  try {
    if (c.host !== undefined) setBrokerSetting(c.host);
    if (c.port !== undefined) localStorage.setItem(LS_PORT, String(c.port));
    if (c.username !== undefined) localStorage.setItem(LS_USER, c.username);
    if (c.password !== undefined) localStorage.setItem(LS_PASS, c.password);
    if (c.plaintext !== undefined) localStorage.setItem(LS_PLAINTEXT, String(c.plaintext));
  } catch { /* ignore */ }
}

/** Resolve the broker WS url from `?mqtt=`, localStorage, or the compiled default. */
export function resolveBrokerUrl(): string | null {
  let raw = '';
  try {
    raw = new URLSearchParams(location.search).get('mqtt')
      ?? localStorage.getItem('twistMqtt')
      ?? DEFAULT_HOST;
  } catch { raw = DEFAULT_HOST; }
  raw = (raw || '').trim();
  if (!raw || raw === 'off' || raw === '0') return null;
  if (/^wss?:\/\//i.test(raw)) return raw;
  const proto = (typeof location !== 'undefined' && location.protocol === 'https:') ? 'wss' : 'ws';
  const port = Number(lsGet(LS_PORT, String(DEFAULT_PORT))) || DEFAULT_PORT;
  if (raw.includes(':') || raw.includes('/')) {
    // If it already has a port or a path, assume the user provided the full host spec
    return `${proto}://${raw}`;
  }
  return `${proto}://${raw}:${port}`;
}
