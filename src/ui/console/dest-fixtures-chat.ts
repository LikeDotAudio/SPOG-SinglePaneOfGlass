// src/ui/console/dest-fixtures-chat — the CHAT LOG fixture.
// A per-destination transcript that rides the retained TwistBus chat/dest/# tree
// and narrates into the Captain's Log.

import { el } from '../dom.js';
import { getBus } from '../../platform/mqtt/index.js';
import { card, pad } from './dest-fixtures-shared.js';
import { logAction } from './captains-log.js';
import type { Production } from '../../model/index.js';

interface ChatEntry { from: string; text: string; ts: number; self: boolean; }
const chatStore = new Map<string, ChatEntry[]>();
let chatSeq = 0;
let chatWired = false;

function chatLog(id: string): ChatEntry[] {
  let l = chatStore.get(id);
  if (!l) { l = []; chatStore.set(id, l); }
  return l;
}
function renderMsg(e: ChatEntry): HTMLElement {
  const d = new Date(e.ts);
  return el('div', { class: `dfx-msg${e.self ? ' self' : ''}` }, [
    el('span', { class: 'dfx-who' }, [e.self ? 'YOU' : e.from]),
    el('span', { class: 'dfx-t' }, [` ${pad(d.getHours())}:${pad(d.getMinutes())} `]),
    el('span', { class: 'dfx-txt' }, [e.text]),
  ]);
}
/** Append to any currently-mounted log view for this destination (≤1 tab active). */
function appendToMounted(destId: string, e: ChatEntry): void {
  document.querySelectorAll('[data-chatlog]').forEach((n) => {
    if (n instanceof HTMLElement && n.dataset.chatlog === destId) {
      n.append(renderMsg(e)); n.scrollTop = n.scrollHeight;
    }
  });
}
/** Subscribe once to the shared bus; retained history replays into the stores. */
function ensureChatBus(): void {
  if (chatWired) return; chatWired = true;
  const bus = getBus();
  bus.subscribe('chat/dest/#', (topic, payload) => {
    if (!/\/msg\//.test(topic)) return;
    const p = payload as Partial<ChatEntry & { destId: string; full_id: string }>;
    if (!p || typeof p !== 'object' || typeof p.destId !== 'string' || typeof p.text !== 'string') return;
    if (p.full_id === bus.sessionId) return;   // suppress our own echo
    const entry: ChatEntry = { from: typeof p.from === 'string' ? p.from : 'REMOTE', text: p.text, ts: typeof p.ts === 'number' ? p.ts : Date.now(), self: false };
    chatLog(p.destId).push(entry);
    appendToMounted(p.destId, entry);
  });
}

export function chatCard(pgm: Production): HTMLElement {
  ensureChatBus();
  const bus = getBus();
  const id = pgm.id;
  const list = el('div', { class: 'dfx-log', dataset: { chatlog: id } });
  for (const e of chatLog(id)) list.append(renderMsg(e));
  const input = el('input', { class: 'dfx-in', type: 'text', placeholder: `Message ${pgm.name}…` });
  const sendBtn = el('button', { class: 'dfx-send' }, ['SEND']);
  const doSend = (): void => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    const entry: ChatEntry = { from: pgm.name, text, ts: Date.now(), self: true };
    chatLog(id).push(entry);
    list.append(renderMsg(entry)); list.scrollTop = list.scrollHeight;
    logAction(`CHAT · ${pgm.name}: ${text}`);
    const seq = ++chatSeq;
    bus.publishRaw(`chat/dest/${id}/msg/${bus.sessionId}-${seq}`,
      { destId: id, from: pgm.name, text, ts: entry.ts, full_id: bus.sessionId }, { retain: true });
  };
  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); doSend(); } });
  const body = el('div', { class: 'dfx-chat' }, [list, el('div', { class: 'dfx-row' }, [input, sendBtn])]);
  requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
  return card('CHAT LOG', body);
}
