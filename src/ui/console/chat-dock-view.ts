// src/ui/console/chat-dock-view — rendering + thread store for the PRODUCTION CHAT
// dock. Shared mutable state (the history Map, current from/to) is OWNED by the
// orchestrator and injected here as explicit params.

import type { ChatMsg } from './chat-dock-types.js';
import { hms, autolink, pairKey } from './chat-dock-media.js';
import { idbPut } from '../../platform/store-idb.js';

/** One message bubble; `from` is the current "speaking as" endpoint (out vs in). */
export function bubble(m: ChatMsg, from: string): HTMLElement {
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

export function renderThread(logEl: HTMLElement, history: Map<string, ChatMsg[]>, from: string, to: string): void {
  logEl.innerHTML = '';
  const msgs = history.get(pairKey(from, to)) ?? [];
  if (!msgs.length) {
    const e = document.createElement('div');
    e.className = 'cd-empty';
    e.textContent = from === to
      ? 'Pick two productions to open a channel.'
      : `No messages between ${from} and ${to} yet.`;
    logEl.append(e);
    return;
  }
  for (const m of msgs) logEl.append(bubble(m, from));
  logEl.scrollTop = logEl.scrollHeight;
}

/** Store a message in its thread; repaint (via `render`) if it's the open thread.
 *  Returns true if new. `curPair`/`render` close over the orchestrator's from/to. */
export function ingest(
  m: ChatMsg,
  history: Map<string, ChatMsg[]>,
  curPair: () => string,
  render: () => void,
  persist = true,
): boolean {
  const key = pairKey(m.from.name, m.to.name);
  const arr = history.get(key) ?? [];
  if (arr.some((x) => x.id === m.id)) return false;
  arr.push(m);
  arr.sort((a, b) => a.seq - b.seq || a.ts - b.ts);
  history.set(key, arr);
  if (key === curPair()) render();
  // Ring-buffered IndexedDB copy (audit §8 W2) — images ride the bus but only
  // SMALL ones persist locally; a reload leans on the broker for big media.
  if (persist) {
    const lite: ChatMsg = m.media && m.media.length > 60_000 ? { ...m, kind: 'text', media: undefined, text: `[image] ${m.text ?? ''}`.trim() } : m;
    void idbPut('chat', { k: m.id, pair: key, m: lite });
  }
  return true;
}
