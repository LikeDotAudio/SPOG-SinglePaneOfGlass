// src/ui/console/mqtt-tree — the MQTT chip + a live retained-topic TREE panel.
//
// TypeScript port of the standalone twist-mqtt-tree.html diagnostic (audit
// §appendix — the twist equivalent of comMQTT's MqttConnectionTester.html).
// Clicking the bottom-right MQTT chip opens a panel that subscribes to `SPOG/#`
// and lists the live retained tree the TwistBus advertises.
//
// It opens its OWN diagnostic connection rather than reusing the shared TwistBus:
// the bus suppresses self-echoes (it drops anything this console published), so a
// bus-fed tree would be empty on a front-end-only deployment. A separate viewer
// sees the full retained tree — including this console's own advertisements.
//
// Broker config stays runtime-overridable (audit §4.2): the panel writes the same
// localStorage.twistMqtt the boot path reads. Save & Connect reloads so the shared
// publishing bus also moves to the new host; the tree itself auto-connects on open.
// CSS → ./mqtt-tree-styles.js; /-segment tree model + row render → ./mqtt-tree-nodes.js;
// mqtt.js via the shared platform loader (audit §5.5 split).
import { el, addStyles } from '../dom.js';
import type { TwistBus } from '../../platform/mqtt/index.js';
import { SPOG_ROOT, getBrokerConfig, setBrokerConfig } from '../../platform/mqtt/index.js';
import { loadMqtt, type MqttClient } from '../../platform/mqtt/mqtt-load.js';
import { MQ_CSS } from './mqtt-tree-styles.js';
import { type TopicStore, type TreeNode, escapeHtml, buildTree, renderRows } from './mqtt-tree-nodes.js';

/** Normalise a broker host + port to a WebSocket url (or null when no host). */
function resolveUrl(rawHost: string, port: number): string | null {
  const v = (rawHost || '').trim();
  if (!v || v === 'off' || v === '0') return null;
  if (/^wss?:\/\//i.test(v)) return v;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return (v.includes(':') || v.includes('/')) ? `${proto}://${v}` : `${proto}://${v}:${port || 8080}`;
}

export function initMqttTree(bus: TwistBus): void {
  if (document.querySelector('.mq-chip')) return;
  addStyles('mqtt-tree-styles', MQ_CSS);

  const dot = el('span', { class: 'mq-dot' });
  const chip = el('button', { class: 'mq-chip', title: 'MQTT — live retained topic tree' }, [dot, el('span', {}, ['MQTT'])]);

  // Connection form — host / port / user / pass are ALWAYS shown and pre-filled
  // from the persisted broker config (port/user/pass fall back to their defaults).
  const cfg = getBrokerConfig();
  const hostInput = el('input', { type: 'text', class: 'host', placeholder: 'broker host', value: cfg.host });
  const portInput = el('input', { type: 'text', class: 'port', placeholder: 'port', value: String(cfg.port) });
  const userInput = el('input', { type: 'text', class: 'user', placeholder: 'username', value: cfg.username });
  const passInput = el('input', { type: 'password', class: 'pass', placeholder: 'password', value: cfg.password });
  const bGo = el('button', {}, ['Save & Connect']);
  const bOff = el('button', { class: 'off' }, ['Disable']);
  const bX = el('button', { class: 'mqt-x', title: 'Close' }, ['×']);
  const countEl = el('span', { class: 'mqt-count' }, ['0']);
  const effEl = el('div', { class: 'mqt-eff' }, []);
  const rows = el('tbody');
  rows.innerHTML = '<tr><td colspan="3" class="empty">— not connected —</td></tr>';

  const table = el('table', {}, [
    el('thead', {}, [el('tr', {}, [
      el('th', { style: 'width:44%' }, [`TOPIC (${SPOG_ROOT}/…)`]),
      el('th', {}, ['PAYLOAD']),
      el('th', { style: 'width:70px' }, ['AGE']),
    ])]),
    rows,
  ]);
  const panel = el('div', { class: 'mqt' }, [
    el('div', { class: 'mqt-head' }, [
      el('span', {}, ['SPOG MQTT TREE']),
      el('span', { class: 'sp' }), countEl, bX,
    ]),
    el('div', { class: 'mqt-form' }, [
      el('label', {}, ['Host', hostInput]),
      el('label', {}, ['Port', portInput]),
      el('label', {}, ['User', userInput]),
      el('label', {}, ['Pass', passInput]),
      bGo, bOff,
    ]),
    effEl,
    el('div', { class: 'mqt-scroll' }, [table]),
  ]);
  document.body.append(panel, chip);

  // ---- diagnostic connection + retained-topic store -------------------------
  const store: TopicStore = new Map();
  let client: MqttClient | null = null;
  let connected = false;
  let started = false;
  type ConnState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'closed' | 'error';
  let state: ConnState = 'idle';
  let lastErr = '';
  const STATE_LABEL: Record<ConnState, string> = {
    idle: 'idle', connecting: 'connecting…', connected: 'connected',
    reconnecting: 'reconnecting…', offline: 'offline', closed: 'disconnected', error: 'error',
  };
  const errMsg = (e: unknown): string => {
    if (!e) return 'connection refused (check host, port, and that the broker exposes a WebSocket listener)';
    if (typeof e === 'string') return e;
    const m = (e as { message?: string }).message;
    return m ? String(m) : String(e);
  };
  // The status line: resolved url · STATE (colour-coded) · subscription + topic count.
  const setStatus = (): void => {
    const url = resolveUrl(hostInput.value, Number(portInput.value)) ?? '(no host set)';
    const cls = state === 'connected' ? 'ok' : (state === 'error' || state === 'offline') ? 'bad' : 'warn';
    const err = state === 'error' && lastErr ? ` — ${escapeHtml(lastErr)}` : '';
    const sub = state === 'connected'
      ? ` <span class="u">· subscribed ${SPOG_ROOT}/# · ${store.size} topic${store.size === 1 ? '' : 's'}</span>`
      : '';
    effEl.innerHTML = `<span class="u">→ ${escapeHtml(url)} ·</span> <b class="${cls}">${STATE_LABEL[state]}${err}</b>${sub}`;
  };

  // ---- hierarchical topic TREE (parents / children / siblings) --------------
  // Topics nest by their /-segments into fold-able branches (see mqtt-tree-nodes).
  const foldOverride = new Map<string, boolean>();   // path → collapsed?
  const WIDE = 12;                                    // >n children folds by default

  const render = (): void => {
    countEl.textContent = String(store.size);
    if (!store.size) {
      rows.innerHTML = `<tr><td colspan="3" class="empty">${connected ? '— no retained topics yet —' : '— not connected —'}</td></tr>`;
      return;
    }
    rows.innerHTML = renderRows(buildTree(store, SPOG_ROOT), foldOverride, WIDE, Date.now());
    setStatus();
  };

  // Fold/unfold on branch click (delegated — rows re-render wholesale).
  rows.addEventListener('click', (e) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>('tr.branch');
    if (!tr || !tr.dataset.path) return;
    const path = tr.dataset.path;
    const node = ((): TreeNode | null => {
      let n = buildTree(store, SPOG_ROOT);
      for (const seg of path.split('/')) {
        const next = n.children.get(seg);
        if (!next) return null;
        n = next;
      }
      return n;
    })();
    const current = foldOverride.get(path) ?? ((node?.children.size ?? 0) > WIDE);
    foldOverride.set(path, !current);
    render();
  });

  const connect = (): void => {
    const url = resolveUrl(hostInput.value, Number(portInput.value));
    if (!url) { state = 'idle'; effEl.innerHTML = '<span class="u">→ enter a broker host, then Save &amp; Connect</span>'; return; }
    state = 'connecting'; lastErr = ''; setStatus();
    void loadMqtt().then((mod) => {
      if (!mod) { state = 'error'; lastErr = 'mqtt.js unavailable (CDN blocked?)'; setStatus(); return; }
      if (client) { try { client.end(true); } catch { /* ignore */ } }
      connected = false; store.clear(); render();
      client = mod.connect(url, { username: userInput.value, password: passInput.value, keepalive: 60, reconnectPeriod: 5000, connectTimeout: 15000 });
      client.on('connect', () => { connected = true; state = 'connected'; client!.subscribe(`${SPOG_ROOT}/#`, { qos: 0 }); render(); });
      client.on('reconnect', () => { connected = false; state = 'reconnecting'; setStatus(); });
      client.on('close', () => { connected = false; if (state !== 'error') state = 'closed'; setStatus(); });
      client.on('offline', () => { connected = false; state = 'offline'; setStatus(); });
      client.on('error', (e) => { connected = false; state = 'error'; lastErr = errMsg(e); setStatus(); });
      client.on('message', (topic: string, payload: Uint8Array) => {
        let txt = new TextDecoder().decode(payload);
        try { txt = JSON.stringify(JSON.parse(txt)); } catch { /* leave raw */ }
        if (!txt) store.delete(topic); else store.set(topic, { payload: txt, ts: Date.now() });
        render();
      });
    });
  };

  // Chip toggles the panel; the tree auto-connects on first open if a broker is set.
  chip.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    if (open && !started && resolveUrl(hostInput.value, Number(portInput.value))) { started = true; connect(); }
  });
  bX.addEventListener('click', () => panel.classList.remove('open'));
  // Save & Connect persists the full config (host/port/user/pass) so the shared
  // PUBLISHING bus adopts it on the next boot and starts advertising the tree, then
  // reloads. Disable clears the host. Both mirror the old settings popover.
  const persist = (): void => setBrokerConfig({
    host: hostInput.value, port: Number(portInput.value) || 8080,
    username: userInput.value, password: passInput.value,
  });
  bGo.addEventListener('click', () => { persist(); location.reload(); });
  bOff.addEventListener('click', () => { setBrokerConfig({ host: '' }); location.reload(); });

  // The chip dot reflects the live diagnostic connection, falling back to the shared
  // bus's configured/connected state before the panel has been opened.
  const paint = (): void => {
    const s = bus.status();
    const err = started && state === 'error';
    const live = started ? state === 'connected' : s.connected;
    const enabled = started ? !!resolveUrl(hostInput.value, Number(portInput.value)) : s.enabled;
    dot.className = 'mq-dot' + (err ? ' err' : live ? ' live' : enabled ? ' on' : '');
    chip.title = err ? `MQTT error — ${lastErr}`
      : live ? 'MQTT connected — click for the topic tree'
      : enabled ? 'MQTT configured — click for the topic tree'
      : 'MQTT off — click to set a broker';
  };
  setStatus();
  paint();
  setInterval(() => { paint(); if (panel.classList.contains('open')) render(); }, 1000);
}
