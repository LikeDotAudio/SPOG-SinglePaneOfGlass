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
import { el, addStyles } from '../dom.js';
import type { TwistBus } from '../../platform/mqtt/index.js';
import { SPOG_ROOT, getBrokerConfig, setBrokerConfig } from '../../platform/mqtt/index.js';
import mqttJsUrl from '../../vendor/mqtt.min.js?url';

// ---- minimal mqtt.js typings (mirrors platform/mqtt/client.ts) --------------
interface MqttClient {
  on(ev: 'connect' | 'reconnect' | 'close' | 'offline' | 'error', cb: (arg?: unknown) => void): void;
  on(ev: 'message', cb: (topic: string, payload: Uint8Array) => void): void;
  subscribe(topic: string, opts?: { qos?: 0 | 1 | 2 }): void;
  end(force?: boolean): void;
}
interface MqttModule { connect(url: string, opts?: Record<string, unknown>): MqttClient; }

// window.mqtt is declared globally by platform/mqtt/client.ts; read it via a cast.
const winMqtt = (): MqttModule | undefined => (window as unknown as { mqtt?: MqttModule }).mqtt;

/** Load mqtt.js: use an already-present global, else inject the unpkg script. */
function loadMqtt(): Promise<MqttModule | null> {
  if (winMqtt()) return Promise.resolve(winMqtt()!);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = mqttJsUrl;   // bundled, not unpkg (audit §8 W4)
    s.async = true;
    s.onload = () => resolve(winMqtt() ?? null);
    s.onerror = () => { console.warn('MQTT tree: failed to load mqtt.js from CDN'); resolve(null); };
    document.head.appendChild(s);
  });
}

/** Normalise a broker host + port to a WebSocket url (or null when no host). */
function resolveUrl(rawHost: string, port: number): string | null {
  const v = (rawHost || '').trim();
  if (!v || v === 'off' || v === '0') return null;
  if (/^wss?:\/\//i.test(v)) return v;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return v.includes(':') ? `${proto}://${v}` : `${proto}://${v}:${port || 9001}`;
}

const escapeHtml = (s: string): string => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c));

// The chip is pinned bottom-RIGHT and sits to the LEFT of the .ptp-clock read-out
// (both share bottom:42px). The clock publishes its live width as --ptp-clock-w
// (clock.ts) so the chip clears the clock as its format cycles (variable width).
// lcars-pulse.ts nudges both `right` offsets inward past the 20px edge pulse.
const MQ_CSS = `
.mq-chip{position:fixed;right:calc(28px + var(--ptp-clock-w,180px));bottom:42px;z-index:1600;display:inline-flex;align-items:center;gap:7px;
    background:#0c1730;border:1px solid #2c3e5e;border-radius:6px 14px 14px 6px;color:#bcd3ee;
    font:bold 10px sans-serif;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;cursor:pointer;
    box-shadow:0 3px 12px rgba(0,0,0,.5);}
.mq-chip:hover{border-color:#3a6acc;color:#fff;}
.mq-chip.seat-synced{box-shadow:0 0 10px rgba(57,211,83,.35);border-color:#2c6a3c;}
.mq-dot{width:9px;height:9px;border-radius:50%;background:#6b82a3;box-shadow:0 0 6px currentColor;color:#6b82a3;}
.mq-dot.on{background:#ffd400;color:#ffd400;} .mq-dot.live{background:#39d353;color:#39d353;} .mq-dot.err{background:#e33;color:#e33;}
.mqt{position:fixed;right:14px;bottom:114px;z-index:1601;display:none;flex-direction:column;
    width:min(820px,94vw);height:min(70vh,720px);background:#0a0805;color:#ffcf6b;
    border:1px solid #3a2f10;border-radius:10px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.7);
    font:13px/1.4 'Courier New',monospace;}
.mqt.open{display:flex;}
.mqt-head{display:flex;align-items:center;gap:12px;padding:9px 14px;background:#C2B74B;color:#1a1206;
    font-weight:900;letter-spacing:2px;flex:0 0 auto;}
.mqt-head button{font:bold 11px sans-serif;letter-spacing:1px;text-transform:uppercase;border:none;
    border-radius:5px;padding:5px 10px;cursor:pointer;background:#1a1206;color:#ffcf6b;}
.mqt-head button:hover{filter:brightness(1.3);}
.mqt-head .sp{flex:1;}
.mqt-head .mqt-count{background:#1a1206;color:#C2B74B;padding:2px 9px;border-radius:8px;font:bold 12px monospace;}
.mqt-head .mqt-x{background:transparent;color:#1a1206;font-size:16px;padding:2px 6px;cursor:pointer;}
/* Connection form — host / port / user / pass are ALWAYS shown and pre-filled. */
.mqt-form{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 14px;background:#181206;
    border-bottom:1px solid #2a2110;flex:0 0 auto;font:10px monospace;color:#C2B74B;}
.mqt-form label{display:inline-flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:1px;}
.mqt-form input{font:12px 'Courier New',monospace;padding:5px 8px;border:1px solid #3a2f10;border-radius:5px;
    background:#0a0805;color:#ffe9b0;}
.mqt-form input:focus{outline:none;border-color:#C2B74B;}
.mqt-form input.host{width:160px;} .mqt-form input.port{width:66px;}
.mqt-form input.user,.mqt-form input.pass{width:110px;}
.mqt-form button{font:bold 10px sans-serif;letter-spacing:1px;text-transform:uppercase;border:none;
    border-radius:5px;padding:6px 11px;cursor:pointer;background:#C2B74B;color:#1a1206;}
.mqt-form button.off{background:#3a2f10;color:#ffcf6b;}
.mqt-form button:hover{filter:brightness(1.15);}
.mqt-eff{padding:5px 14px;font:10px monospace;background:#140f06;flex:0 0 auto;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mqt-eff b.ok{color:#39d353;} .mqt-eff b.warn{color:#ffd400;} .mqt-eff b.bad{color:#ff6a6a;}
.mqt-eff .u{color:#8a7430;}
.mqt-scroll{flex:1 1 auto;overflow:auto;}
.mqt table{width:100%;border-collapse:collapse;}
.mqt th,.mqt td{text-align:left;padding:5px 14px;border-bottom:1px solid #1c1810;vertical-align:top;}
.mqt th{position:sticky;top:0;background:#140f06;color:#C2B74B;letter-spacing:1px;}
.mqt td.topic{color:#6FC8F0;white-space:nowrap;}
.mqt tr.branch td{cursor:pointer;background:#100c05;}
.mqt tr.branch td.topic{color:#C2B74B;font-weight:bold;}
.mqt tr.branch:hover td{background:#181205;}
.mqt .caret{display:inline-block;width:14px;color:#8a7430;}
.mqt .cnt{margin-left:8px;font-size:10px;color:#8a7430;font-weight:normal;}
.mqt .tick{display:inline-block;width:14px;color:#3a2f10;}
.mqt td.val{color:#ffe9b0;white-space:pre-wrap;word-break:break-word;}
.mqt td.age{color:#8a7430;text-align:right;white-space:nowrap;}
.mqt .empty{padding:40px;text-align:center;color:#6a5a30;letter-spacing:1px;}`;

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
  const store = new Map<string, { payload: string; ts: number }>();
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
  // Topics nest by their /-segments into fold-able branches. A branch remembers
  // the operator's fold choice; untouched branches default to OPEN unless they
  // fan out very wide (e.g. system/presence with hundreds of children).
  interface TreeNode { children: Map<string, TreeNode>; leaf?: { payload: string; ts: number } }
  const foldOverride = new Map<string, boolean>();   // path → collapsed?
  const WIDE = 12;                                    // >n children folds by default

  const buildTree = (): TreeNode => {
    const root: TreeNode = { children: new Map() };
    for (const k of [...store.keys()].sort()) {
      const rel = k.startsWith(SPOG_ROOT + '/') ? k.slice(SPOG_ROOT.length + 1) : k;
      let node = root;
      for (const seg of rel.split('/')) {
        let next = node.children.get(seg);
        if (!next) { next = { children: new Map() }; node.children.set(seg, next); }
        node = next;
      }
      node.leaf = store.get(k)!;
    }
    return root;
  };

  const leafCount = (n: TreeNode): number => {
    let c = n.leaf ? 1 : 0;
    for (const ch of n.children.values()) c += leafCount(ch);
    return c;
  };

  const render = (): void => {
    countEl.textContent = String(store.size);
    if (!store.size) {
      rows.innerHTML = `<tr><td colspan="3" class="empty">${connected ? '— no retained topics yet —' : '— not connected —'}</td></tr>`;
      return;
    }
    const now = Date.now();
    const out: string[] = [];
    const walk = (node: TreeNode, path: string, depth: number): void => {
      for (const [name, n] of node.children) {
        const full = path ? `${path}/${name}` : name;
        const pad = 14 + depth * 18;
        const isBranch = n.children.size > 0;
        if (!isBranch) {
          const { payload, ts } = n.leaf!;
          const age = Math.max(0, Math.round((now - ts) / 1000));
          out.push(`<tr class="leaf"><td class="topic" style="padding-left:${pad}px">` +
            `<span class="tick">·</span> ${escapeHtml(name)}</td>` +
            `<td class="val">${escapeHtml(payload)}</td><td class="age">${age}s</td></tr>`);
          continue;
        }
        const collapsed = foldOverride.get(full) ?? (n.children.size > WIDE);
        const ownVal = n.leaf ? escapeHtml(n.leaf.payload) : '';
        out.push(`<tr class="branch" data-path="${escapeHtml(full)}">` +
          `<td class="topic" style="padding-left:${pad}px">` +
          `<span class="caret">${collapsed ? '▸' : '▾'}</span> ${escapeHtml(name)}` +
          `<span class="cnt">${leafCount(n)}</span></td>` +
          `<td class="val">${ownVal}</td><td class="age"></td></tr>`);
        if (!collapsed) walk(n, full, depth + 1);
      }
    };
    walk(buildTree(), '', 0);
    rows.innerHTML = out.join('');
    setStatus();
  };

  // Fold/unfold on branch click (delegated — rows re-render wholesale).
  rows.addEventListener('click', (e) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>('tr.branch');
    if (!tr || !tr.dataset.path) return;
    const path = tr.dataset.path;
    const node = ((): TreeNode | null => {
      let n = buildTree();
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
    host: hostInput.value, port: Number(portInput.value) || 9001,
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
