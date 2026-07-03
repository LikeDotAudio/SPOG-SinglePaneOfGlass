// src/ui/console/chat-dock — the global PRODUCTION CHAT dock.
//
// A single console-level chat window (not a per-twist editor) docked in the bottom
// corner OPPOSITE the sources rail — the slot the "1990s VIEW" button used to hold.
// Every destination/production is a chat endpoint; a message is ROUTED from one
// production to another (from ▸ to). Each send AND each received message is narrated
// into the Captain's Log (logAction), and the whole exchange rides the retained MQTT
// TwistBus so a second console — or any subscriber on `chat/#` — is a real party.
//
// Design: docs/Audit /Studio-Chat-Room-Audit.md. This is the "global dock" variant
// of that audit — endpoints are PRODUCTIONS (the destinations), not People, and the
// dialog is production ⇄ production per the deploy request.

import { addStyles } from '../dom.js';
import { logAction } from './captains-log.js';
import { getBus, type TwistBus } from '../../platform/mqtt/index.js';

interface Endpoint { name: string; color: string }   // color = "r,g,b" triplet
interface ChatMsg {
  id: string;
  seq: number;
  ts: number;
  from: Endpoint;
  to: Endpoint;
  kind: 'text' | 'image' | 'link';
  text?: string;                 // text body, or link caption
  href?: string;                 // link target
  media?: string;                // image data-URI (downscaled)
  full_id: string;               // === sender bus.sessionId (self-echo suppression)
}

const DEFAULT_COLOR = '57,211,83';   // comms green
const slug = (s: string): string => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** One thread per unordered pair, so A▸B and B▸A share the same transcript. */
const pairKey = (a: string, b: string): string => [slug(a), slug(b)].sort().join('~');

const CSS = `
.chat-launch{position:fixed;right:14px;bottom:76px;z-index:1000;background:#39d353;color:#03210c;border:none;border-radius:18px 6px 6px 18px;font-family:Arial,Helvetica,sans-serif;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:8px 18px 8px 16px;cursor:pointer;box-shadow:inset 5px 0 0 #1f8f38;display:flex;align-items:center;gap:8px;}
.chat-launch:hover{filter:brightness(1.1);}
.chat-launch .cd-badge{display:none;min-width:16px;height:16px;line-height:16px;text-align:center;border-radius:8px;background:#ff3b3b;color:#fff;font-size:10px;padding:0 4px;}
.chat-launch.unread .cd-badge{display:inline-block;}

.chat-panel{position:fixed;right:14px;bottom:120px;z-index:2400;width:min(420px,92vw);height:min(560px,70vh);display:none;flex-direction:column;background:#0a0c12;border:1px solid #22303a;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.6);overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#d6e6ef;}
.chat-panel.open{display:flex;}
.cd-head{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#111a12;border-bottom:1px solid #1f8f38;}
.cd-head b{font-weight:900;letter-spacing:2px;font-size:12px;color:#39d353;text-transform:uppercase;}
.cd-x{margin-left:auto;background:none;border:none;color:#8fa6b2;font-size:18px;line-height:1;cursor:pointer;padding:0 4px;}
.cd-x:hover{color:#fff;}

.cd-route{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#080a10;border-bottom:1px solid #1a2530;flex-wrap:wrap;}
.cd-route .arw{color:#39d353;font-weight:900;}
.cd-route select{flex:1;min-width:120px;background:#03060c;color:#cfe6ff;border:1px solid #1d2942;border-radius:8px;padding:6px 8px;font:inherit;font-size:12px;}

.cd-log{flex:1;min-height:0;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px;}
.cd-empty{margin:auto;color:#4a5b66;font-size:12px;text-align:center;}
.cd-row{max-width:82%;display:flex;flex-direction:column;gap:3px;}
.cd-row.out{align-self:flex-end;align-items:flex-end;}
.cd-row.in{align-self:flex-start;align-items:flex-start;}
.cd-meta{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#6d818d;}
.cd-bub{padding:8px 11px;border-radius:12px;font-size:13px;line-height:1.4;word-break:break-word;background:#12202a;border:1px solid #1d3340;}
.cd-row.out .cd-bub{background:#0f2a17;border-color:#1f8f38;}
.cd-bub a{color:#7fd0ff;}
.cd-bub img{max-width:100%;border-radius:8px;display:block;cursor:zoom-in;margin-top:2px;}
.cd-linkchip{display:inline-flex;align-items:center;gap:6px;color:#7fd0ff;text-decoration:none;}
.cd-linkchip:hover{text-decoration:underline;}

.cd-compose{display:flex;align-items:center;gap:6px;padding:9px 10px;border-top:1px solid #1a2530;background:#080a10;}
.cd-compose textarea{flex:1;resize:none;height:38px;max-height:96px;background:#03060c;color:#cfe6ff;border:1px solid #1d2942;border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;}
.cd-tool{background:#12202a;border:1px solid #1d3340;color:#9fd6ff;border-radius:8px;width:34px;height:34px;font-size:15px;cursor:pointer;flex:none;}
.cd-tool:hover{background:#1a2e3a;}
.cd-send{background:#39d353;border:none;color:#03210c;border-radius:8px;width:38px;height:34px;font-size:16px;font-weight:900;cursor:pointer;flex:none;}
.cd-send:hover{filter:brightness(1.1);}`;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string): string => String(s).replace(/[&<>"]/g, (c) => ESC[c] ?? c);
const hms = (ts: number): string => new Date(ts).toISOString().slice(11, 19);

/** Downscale an image file to a small JPEG data-URI (front-end sim: no media server). */
function downscale(file: File, max = 512, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cw = Math.max(1, Math.round(img.width * scale));
        const ch = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        const g = c.getContext('2d');
        if (!g) { resolve(String(fr.result)); return; }
        g.drawImage(img, 0, 0, cw, ch);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = String(fr.result);
    };
    fr.readAsDataURL(file);
  });
}

/** All destination productions, read from the footer tab strip (every leaf tab is a
 *  production; nested group headers are `.lcars-group-label`, not `.lcars-tab`). */
function productions(): Endpoint[] {
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('#production-tabs .lcars-tab'));
  const seen = new Set<string>();
  const out: Endpoint[] = [];
  for (const t of tabs) {
    const name = (t.textContent || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, color: t.style.getPropertyValue('--lcars').trim() || DEFAULT_COLOR });
  }
  return out;
}

export function initChatDock(): void {
  addStyles('chat-dock-styles', CSS);
  const bus = getBus();

  const history = new Map<string, ChatMsg[]>();
  const seqByPair = new Map<string, number>();
  let from = '';
  let to = '';

  // ── DOM ────────────────────────────────────────────────────────────────
  const launch = document.createElement('button');
  launch.className = 'chat-launch';
  launch.title = 'Production chat — text/image/link between destinations';
  launch.innerHTML = '💬 CHAT <span class="cd-badge">0</span>';
  const badge = launch.querySelector<HTMLElement>('.cd-badge')!;

  const panel = document.createElement('div');
  panel.className = 'chat-panel';
  panel.innerHTML = `
    <div class="cd-head"><b>Production Chat</b><button class="cd-x" title="Close">×</button></div>
    <div class="cd-route">
      <select class="cd-from" title="Speaking as (from production)"></select>
      <span class="arw">▸</span>
      <select class="cd-to" title="Send to (destination production)"></select>
    </div>
    <div class="cd-log"></div>
    <div class="cd-compose">
      <button class="cd-tool cd-img" title="Attach image">🖼</button>
      <button class="cd-tool cd-link" title="Insert link">🔗</button>
      <textarea class="cd-text" placeholder="Message…" rows="1"></textarea>
      <button class="cd-send" title="Send">▸</button>
    </div>`;
  document.body.append(launch, panel);

  const selFrom = panel.querySelector<HTMLSelectElement>('.cd-from')!;
  const selTo = panel.querySelector<HTMLSelectElement>('.cd-to')!;
  const logEl = panel.querySelector<HTMLElement>('.cd-log')!;
  const textEl = panel.querySelector<HTMLTextAreaElement>('.cd-text')!;
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
  panel.append(fileInput);

  // ── endpoints / thread selection ───────────────────────────────────────
  function refreshEndpoints(): void {
    const list = productions();
    if (!list.length) return;
    const fill = (sel: HTMLSelectElement, keep: string): string => {
      sel.innerHTML = '';
      for (const p of list) {
        const o = document.createElement('option');
        o.value = p.name; o.textContent = p.name;
        sel.append(o);
      }
      const val = list.some((p) => p.name === keep) ? keep : list[0]!.name;
      sel.value = val;
      return val;
    };
    from = fill(selFrom, from || list[0]!.name);
    to = fill(selTo, to || (list[1]?.name ?? list[0]!.name));
  }
  const colorOf = (name: string): string => productions().find((p) => p.name === name)?.color || DEFAULT_COLOR;
  const curPair = (): string => pairKey(from, to);

  // ── rendering ──────────────────────────────────────────────────────────
  function bubble(m: ChatMsg): HTMLElement {
    const out = m.from.name === from;
    const row = document.createElement('div');
    row.className = 'cd-row ' + (out ? 'out' : 'in');
    const meta = document.createElement('div');
    meta.className = 'cd-meta';
    meta.textContent = `${m.from.name} ▸ ${m.to.name} · ${hms(m.ts)}`;
    const bub = document.createElement('div');
    bub.className = 'cd-bub';
    if (m.kind === 'image' && m.media) {
      const img = document.createElement('img');
      img.src = m.media; img.alt = m.text || 'image';
      img.addEventListener('click', () => window.open(m.media, '_blank'));
      if (m.text) bub.append(document.createTextNode(m.text));
      bub.append(img);
    } else if (m.kind === 'link' && m.href) {
      const a = document.createElement('a');
      a.className = 'cd-linkchip'; a.href = m.href; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = '🔗 ' + (m.text || m.href);
      bub.append(a);
    } else {
      bub.innerHTML = autolink(m.text || '');
    }
    row.append(meta, bub);
    return row;
  }

  /** HTML-escape then turn bare URLs into links. */
  function autolink(text: string): string {
    return esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  function renderThread(): void {
    logEl.innerHTML = '';
    const msgs = history.get(curPair()) ?? [];
    if (!msgs.length) {
      const e = document.createElement('div');
      e.className = 'cd-empty';
      e.textContent = from === to
        ? 'Pick two productions to open a channel.'
        : `No messages between ${from} and ${to} yet.`;
      logEl.append(e);
      return;
    }
    for (const m of msgs) logEl.append(bubble(m));
    logEl.scrollTop = logEl.scrollHeight;
  }

  /** Store a message in its thread; paint if it's the open thread. Returns true if new. */
  function ingest(m: ChatMsg): boolean {
    const key = pairKey(m.from.name, m.to.name);
    const arr = history.get(key) ?? [];
    if (arr.some((x) => x.id === m.id)) return false;
    arr.push(m);
    arr.sort((a, b) => a.seq - b.seq || a.ts - b.ts);
    history.set(key, arr);
    if (key === curPair()) renderThread();
    return true;
  }

  // ── send ───────────────────────────────────────────────────────────────
  function nextSeq(): number {
    const key = curPair();
    const n = (seqByPair.get(key) ?? 0) + 1;
    seqByPair.set(key, n);
    return n;
  }
  function summarize(m: ChatMsg): string {
    if (m.kind === 'image') return '[image]' + (m.text ? ' ' + m.text : '');
    if (m.kind === 'link') return '🔗 ' + (m.text ? m.text + ' — ' : '') + (m.href ?? '');
    return m.text ?? '';
  }
  function send(partial: Pick<ChatMsg, 'kind' | 'text' | 'href' | 'media'>): void {
    if (!from || !to) return;
    if (from === to) { textEl.placeholder = 'Choose a different destination …'; return; }
    const seq = nextSeq();
    const m: ChatMsg = {
      id: `${bus.sessionId}-${curPair()}-${seq}`,
      seq, ts: Date.now(),
      from: { name: from, color: colorOf(from) },
      to: { name: to, color: colorOf(to) },
      full_id: bus.sessionId,
      ...partial,
    };
    ingest(m);
    // Captain's Log — every message is narrated (the deploy requirement).
    logAction(`CHAT · ${m.from.name} ▸ ${m.to.name}: ${summarize(m)}`);
    // Retained MQTT projection — keyed by sender session so consoles never clobber.
    const base = `chat/${curPair()}`;
    bus.publishRaw(`${base}/msg/${bus.sessionId}-${seq}`, m, { retain: true });
    bus.publishRaw(`${base}/latest`, m, { retain: true });
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  const open = (): void => {
    refreshEndpoints();
    renderThread();
    panel.classList.add('open');
    launch.classList.remove('unread');
    badge.textContent = '0';
    textEl.focus();
  };
  const close = (): void => panel.classList.remove('open');
  const toggle = (): void => (panel.classList.contains('open') ? close() : open());

  launch.addEventListener('click', toggle);
  panel.querySelector('.cd-x')!.addEventListener('click', close);
  selFrom.addEventListener('change', () => { from = selFrom.value; renderThread(); });
  selTo.addEventListener('change', () => { to = selTo.value; renderThread(); });

  const sendText = (): void => {
    const t = textEl.value.trim();
    if (!t) return;
    send({ kind: 'text', text: t });
    textEl.value = '';
  };
  panel.querySelector('.cd-send')!.addEventListener('click', sendText);
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  });
  panel.querySelector('.cd-link')!.addEventListener('click', () => {
    const href = window.prompt('Link URL:');
    if (!href) return;
    const url = /^https?:\/\//i.test(href) ? href : 'https://' + href;
    const caption = window.prompt('Caption (optional):') || '';
    send({ kind: 'link', href: url, text: caption });
  });
  panel.querySelector('.cd-img')!.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (!f) return;
    void downscale(f).then((media) => send({ kind: 'image', media, text: textEl.value.trim() || undefined }))
      .then(() => { textEl.value = ''; })
      .catch(() => { /* bad image — ignore */ });
  });
  // Paste an image straight into the composer.
  textEl.addEventListener('paste', (e) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
    const f = item?.getAsFile();
    if (!f) return;
    e.preventDefault();
    void downscale(f).then((media) => send({ kind: 'image', media, text: textEl.value.trim() || undefined }))
      .then(() => { textEl.value = ''; });
  });

  // ── receive (retained history replays here on subscribe) ────────────────
  wireBus(bus, (m) => {
    if (m.full_id === bus.sessionId) return;   // drop our own echo
    if (!ingest(m)) return;
    // Narrate incoming traffic too, so the Captain's Log holds the whole dialog.
    logAction(`CHAT · ${m.from.name} ▸ ${m.to.name}: ${summarize(m)}`);
    if (!panel.classList.contains('open')) {
      launch.classList.add('unread');
      badge.textContent = String((parseInt(badge.textContent || '0', 10) || 0) + 1);
    }
  });

  refreshEndpoints();
  // A production may be added lazily; re-read the endpoint list when the panel opens.
}

/** Subscribe to every chat thread. Split out so the summarize/log closure stays tidy. */
function wireBus(bus: TwistBus, onMsg: (m: ChatMsg) => void): void {
  bus.subscribe('chat/#', (topic, payload) => {
    if (!/\/(msg\/|latest$)/.test(topic)) return;
    const m = payload as ChatMsg;
    if (m && typeof m === 'object' && m.from && m.to && m.kind) onMsg(m);
  });
}
