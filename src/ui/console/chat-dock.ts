// src/ui/console/chat-dock — the global PRODUCTION CHAT dock.
//
// A single console-level chat window (not a per-twist editor) docked in the bottom
// corner OPPOSITE the sources rail. Every destination/production is a chat endpoint; a
// message is ROUTED from one production to another (from ▸ to). Each send AND each
// received message is narrated into the Captain's Log (logAction), and rides the
// retained MQTT TwistBus so any subscriber on `chat/#` is a real party.
// Design: docs/Audit /Studio-Chat-Room-Audit.md. This is the "global dock" variant —
// endpoints are PRODUCTIONS (the destinations), not People. This file is the
// ORCHESTRATOR: initChatDock owns the shared mutable chat state (history/seqByPair/
// from/to); helpers, rendering, types, styles, and bus wiring live in chat-dock-* siblings.

import { addStyles } from '../dom.js';
import { logAction } from './captains-log.js';
import { getBus } from '../../platform/mqtt/index.js';
import { idbGetAll, idbDelete } from '../../platform/store-idb.js';
import type { ChatMsg, StoredChat } from './chat-dock-types.js';
import { CSS } from './chat-dock-styles.js';
import { pairKey, colorOf, summarize, productions, downscale } from './chat-dock-media.js';
import { renderThread, ingest } from './chat-dock-view.js';
import { wireBus } from './chat-dock-bus.js';

// Re-export the module surface so importers of './chat-dock.js' stay byte-identical.
export type { Endpoint, ChatMsg, StoredChat } from './chat-dock-types.js';

export function initChatDock(): void {
  addStyles('chat-dock-styles', CSS);
  const bus = getBus();

  const history = new Map<string, ChatMsg[]>();
  const seqByPair = new Map<string, number>();
  let from = '';
  let to = '';

  const curPair = (): string => pairKey(from, to);
  const render = (): void => renderThread(logEl, history, from, to);

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

  // Hydrate this seat's chat history; prune each thread to its newest 300 rows.
  void idbGetAll<StoredChat>('chat').then((rows) => {
    const byPair = new Map<string, StoredChat[]>();
    rows.forEach((r) => { if (r?.m?.id) { const a = byPair.get(r.pair) ?? []; a.push(r); byPair.set(r.pair, a); } });
    byPair.forEach((a) => {
      a.sort((x, y) => x.m.ts - y.m.ts || x.m.seq - y.m.seq);
      a.splice(0, Math.max(0, a.length - 300)).forEach((old) => void idbDelete('chat', old.k));
      a.forEach((r) => {
        ingest(r.m, history, curPair, render, false);
        const key = pairKey(r.m.from.name, r.m.to.name);
        seqByPair.set(key, Math.max(seqByPair.get(key) ?? 0, r.m.seq));
      });
    });
  });

  // ── send ───────────────────────────────────────────────────────────────
  function nextSeq(): number {
    const key = curPair();
    const n = (seqByPair.get(key) ?? 0) + 1;
    seqByPair.set(key, n);
    return n;
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
    ingest(m, history, curPair, render);
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
    render();
    panel.classList.add('open');
    launch.classList.remove('unread');
    badge.textContent = '0';
    textEl.focus();
  };
  const close = (): void => panel.classList.remove('open');
  const toggle = (): void => (panel.classList.contains('open') ? close() : open());

  launch.addEventListener('click', toggle);
  panel.querySelector('.cd-x')!.addEventListener('click', close);
  selFrom.addEventListener('change', () => { from = selFrom.value; render(); });
  selTo.addEventListener('change', () => { to = selTo.value; render(); });

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
    if (!ingest(m, history, curPair, render)) return;
    // Narrate incoming traffic too, so the Captain's Log holds the whole dialog.
    logAction(`CHAT · ${m.from.name} ▸ ${m.to.name}: ${summarize(m)}`);
    if (!panel.classList.contains('open')) {
      launch.classList.add('unread');
      badge.textContent = String((parseInt(badge.textContent || '0', 10) || 0) + 1);
    }
  });

  refreshEndpoints();   // re-read lazily-added productions when the panel opens
}
