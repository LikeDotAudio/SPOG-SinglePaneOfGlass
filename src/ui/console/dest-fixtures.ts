// src/ui/console/dest-fixtures — the standing fixtures every destination carries.
//
// renderPrograms mounts these into EVERY room's body, so no matter what twists a
// destination declares it always has:
//   • CLOCK        — a live time-of-day read-out; click it to open the CLOCK editor.
//   • DUAL COUNTER — TWO always-present counters (A + B); click a count to open the
//                    dual-count TIMER editor. Small transports run them in place.
//   • CHAT LOG     — a per-destination transcript that rides the retained TwistBus
//                    chat/dest/# tree and narrates into the Captain's Log.
// When the room is OFFLINE (a fault status), the clock + counters BLINK.
//
// Clicking a fixture opens the matching editor by handing renderPrograms's own
// openEditor a synthetic twist element named "Clock"/"Timer" (the same dispatch
// path a real twist uses). The clock/counter rAF loops self-terminate when their
// node leaves the DOM (the pane is rebuilt per activation), so re-rendering leaks
// nothing.

import { el, addStyles, ctx2d } from '../dom.js';
import { drawSegString } from '../seven-seg.js';
import { getBus } from '../../platform/mqtt/index.js';
import { logAction } from './captains-log.js';
import type { OpenEditor } from './matrix.js';
import type { Production } from '../../model/index.js';

const CSS = `
.dfx{display:flex;flex-wrap:wrap;gap:10px;width:100%;margin-top:8px;}
.dfx-card{background:#0a080d;border:1px solid #241a26;border-radius:12px;padding:8px 10px;
  display:flex;flex-direction:column;gap:6px;min-width:230px;flex:1 1 230px;}
.dfx-head{font:800 10px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;
  display:flex;align-items:center;gap:8px;}
.dfx-sub{font:700 8px 'Courier New',monospace;letter-spacing:1px;color:#6b7686;text-transform:uppercase;}
.dfx-cvs{display:block;background:#000;border-radius:8px;width:100%;height:auto;}
.dfx-cvs.tap{cursor:pointer;}
.dfx-chrono{display:flex;flex-direction:column;gap:8px;}
.dfx-crow{display:flex;align-items:center;gap:6px;}
.dfx-crow .dfx-cvs{flex:1;min-width:0;}
.dfx-clab{font:800 11px 'Courier New',monospace;color:#C864C8;width:14px;text-align:center;}
.dfx-mrow{display:flex;gap:4px;}
.dfx-mini{border:none;border-radius:6px;padding:5px 7px;cursor:pointer;
  font:800 10px 'Courier New',monospace;background:#16233d;color:#bcd3ee;}
.dfx-mini.run{background:#e33;color:#150404;}
.dfx-chat{display:flex;flex-direction:column;gap:6px;}
.dfx-log{height:96px;overflow:auto;background:#050506;border:1px solid #201620;border-radius:8px;padding:6px;
  display:flex;flex-direction:column;gap:3px;font:600 10px 'Courier New',monospace;color:#cdd6e6;}
.dfx-msg{line-height:1.3;word-break:break-word;}
.dfx-who{font-weight:800;color:#C864C8;}
.dfx-msg.self .dfx-who{color:#9fe0b0;}
.dfx-t{color:#5a6472;}
.dfx-row{display:flex;gap:6px;}
.dfx-in{flex:1;min-width:0;background:#0a0a0d;border:1px solid #241a26;border-radius:7px;padding:6px 8px;
  color:#e7d3ea;font:600 11px 'Courier New',monospace;}
.dfx-in:focus{outline:none;border-color:#C864C8;}
.dfx-send{border:none;border-radius:7px;padding:6px 12px;cursor:pointer;
  font:800 10px 'Courier New',monospace;letter-spacing:1px;background:#7a1f2a;color:#ffe;}
@keyframes dfx-blink{0%,49.9%{opacity:1;}50%,100%{opacity:.12;}}
.dfx-blink{animation:dfx-blink 1s infinite;}
`;

const pad = (n: number): string => String(n).padStart(2, '0');
const hms = (ms: number): string => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(t / 3600) % 100)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
};

const dpr = Math.min(window.devicePixelRatio || 1, 3);
function readout(W: number, H: number): { cvs: HTMLCanvasElement; draw: (s: string) => void } {
  const cvs = el('canvas', { class: 'dfx-cvs' });
  cvs.width = W * dpr; cvs.height = H * dpr;
  cvs.style.maxWidth = W + 'px';
  const g = ctx2d(cvs); if (g) g.scale(dpr, dpr);
  return { cvs, draw: (s: string): void => { if (g) drawSegString(g, W, H, s, 'seg', 'red', '#000'); } };
}

/** A frame loop that stops itself once the node has left the document. */
function animate(node: Node, frame: () => void): void {
  const tick = (): void => { if (!document.contains(node)) return; frame(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

function card(title: string, body: Node, sub?: string): HTMLElement {
  const head = el('div', { class: 'dfx-head' }, sub ? [title, el('span', { class: 'dfx-sub' }, [sub])] : [title]);
  return el('div', { class: 'dfx-card' }, [head, body]);
}

/** A detached twist element carrying the room's identity, so renderPrograms's
 *  openEditor dispatches to the right editor exactly as a real twist would. */
function synthTwist(pgm: Production, name: string): HTMLElement {
  const titleText = pgm.parentName ? `${pgm.parentName.toUpperCase()} — ${pgm.name}` : pgm.name;
  const t = el('div', { class: 'twist-container', dataset: { prodId: pgm.id, prodName: titleText } });
  if (pgm.parentName) t.dataset.prodFloor = pgm.parentName;
  if (pgm.color) t.style.setProperty('--lcars-color', pgm.color);
  if (pgm.tip) t.dataset.prodTip = JSON.stringify(pgm.tip);
  t.append(el('div', { class: 'twist-title' }, [name]));
  return t;
}

// ---- CLOCK: live time-of-day, click to open the clock editor -----------------
function clockCard(openEdit: () => void, offline: boolean): HTMLElement {
  const { cvs, draw } = readout(220, 58);
  cvs.classList.add('tap');
  if (offline) cvs.classList.add('dfx-blink');
  cvs.title = 'Open clock editor';
  cvs.addEventListener('click', openEdit);
  let last = '';
  animate(cvs, () => {
    const d = new Date();
    const s = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    if (s !== last) { last = s; draw(s); }
  });
  return card('CLOCK', cvs, 'tap to edit');
}

// ---- DUAL COUNTER: two count-up counters per destination, persistent state ---
interface CState { running: boolean; base: number; startedAt: number; }
const counterStore = new Map<string, { A: CState; B: CState }>();
const mkC = (): CState => ({ running: false, base: 0, startedAt: 0 });
function countersOf(id: string): { A: CState; B: CState } {
  let s = counterStore.get(id);
  if (!s) { s = { A: mkC(), B: mkC() }; counterStore.set(id, s); }
  return s;
}
const cMs = (s: CState): number => s.base + (s.running ? performance.now() - s.startedAt : 0);

function counterRow(destId: string, id: 'A' | 'B', openEdit: () => void, offline: boolean): HTMLElement {
  const s = countersOf(destId)[id];
  const { cvs, draw } = readout(180, 40);
  cvs.classList.add('tap');
  if (offline) cvs.classList.add('dfx-blink');
  cvs.title = 'Open dual count editor';
  cvs.addEventListener('click', openEdit);
  const run = el('button', { class: 'dfx-mini' }, ['▶']);
  const rst = el('button', { class: 'dfx-mini' }, ['↺']);
  const sync = (): void => { run.textContent = s.running ? '‖' : '▶'; run.classList.toggle('run', s.running); };
  run.addEventListener('click', (e) => {
    e.stopPropagation();
    if (s.running) { s.base = cMs(s); s.running = false; } else { s.startedAt = performance.now(); s.running = true; }
    sync();
  });
  rst.addEventListener('click', (e) => { e.stopPropagation(); s.base = 0; s.startedAt = performance.now(); });
  let last = '';
  animate(cvs, () => { const str = hms(cMs(s)); if (str !== last) { last = str; draw(str); } });
  sync();
  return el('div', { class: 'dfx-crow' }, [el('span', { class: 'dfx-clab' }, [id]), cvs, el('div', { class: 'dfx-mrow' }, [run, rst])]);
}

function counterCard(pgm: Production, openEdit: () => void, offline: boolean): HTMLElement {
  const body = el('div', { class: 'dfx-chrono' }, [
    counterRow(pgm.id, 'A', openEdit, offline),
    counterRow(pgm.id, 'B', openEdit, offline),
  ]);
  return card('DUAL COUNTER', body, 'tap a count to edit');
}

// ---- CHAT LOG: per-destination, rides the retained TwistBus ------------------
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

function chatCard(pgm: Production): HTMLElement {
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

/** Mount the standing fixtures into a destination's program body.
 *  `openEditor` opens the clock/timer editors; `offline` blinks the clock + counters. */
export function mountDestFixtures(body: HTMLElement, pgm: Production, openEditor?: OpenEditor, offline = false): void {
  addStyles('twist-dest-fixtures', CSS);
  const openClock = (): void => openEditor?.(synthTwist(pgm, 'Clock'));
  const openTimer = (): void => openEditor?.(synthTwist(pgm, 'Timer'));
  body.append(el('div', { class: 'dfx' }, [
    clockCard(openClock, offline),
    counterCard(pgm, openTimer, offline),
    chatCard(pgm),
  ]));
}
