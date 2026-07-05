// src/ui/console/dest-fixtures — the standing fixtures every destination carries.
//
// renderPrograms mounts these into EVERY room's body, so no matter what twists a
// destination declares it always has:
//   • CLOCK        — a live time-of-day read-out; click it to open the CLOCK editor.
//   • DUAL COUNTER — TWO always-present counters (A + B) with ▶/↺ transports, plus
//                    a THIRD independent count: an old-time pocket stopwatch (its
//                    TOP crown is start/stop, its SIDE pusher is reset — chronos
//                    stopwatch look). Click a count to open the dual-count TIMER
//                    editor.
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
.dfx-chrono{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;}
.dfx-ccol{display:flex;flex-direction:column;gap:8px;flex:1 1 210px;min-width:0;}
.dfx-swcol{flex:1 0 130px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}
.dfx-swcol .dfx-wlab{text-align:center;line-height:1.5;}
.dfx-crow{display:flex;align-items:center;gap:6px;}
.dfx-crow .dfx-cvs{flex:1;min-width:0;}
.dfx-clab{font:800 11px 'Courier New',monospace;color:#C864C8;width:14px;text-align:center;}
.dfx-mrow{display:flex;gap:4px;}
.dfx-mini{border:none;border-radius:6px;padding:5px 7px;cursor:pointer;
  font:800 10px 'Courier New',monospace;background:#16233d;color:#bcd3ee;}
.dfx-mini.run{background:#e33;color:#150404;}
.dfx-watch{flex:0 0 auto;display:block;cursor:pointer;}
.dfx-wlab{font:700 8px 'Courier New',monospace;letter-spacing:1px;color:#6b7686;text-transform:uppercase;}
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
// EPOCH-based (Date.now, not performance.now) and persisted on every transport
// action — a running count survives, and keeps counting THROUGH, a reload
// (audit §3.2 / §8 W1). Elapsed is always derived, never ticked into storage.
interface CState { running: boolean; base: number; startedAt: number; }
// A + B are the dual counters; S is the standalone stopwatch's own count.
const COUNTER_KEY = 'spog.counters.v1';
const counterStore = new Map<string, { A: CState; B: CState; S: CState }>();
const mkC = (): CState => ({ running: false, base: 0, startedAt: 0 });
let countersLoaded = false;
function loadCounters(): void {
  if (countersLoaded) return;
  countersLoaded = true;
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    if (!raw) return;
    for (const [id, trio] of Object.entries(JSON.parse(raw) as Record<string, { A: CState; B: CState; S: CState }>)) {
      if (trio && trio.A && trio.B && trio.S) counterStore.set(id, trio);
    }
  } catch { /* malformed → fresh counters */ }
}
function saveCounters(): void {
  try { localStorage.setItem(COUNTER_KEY, JSON.stringify(Object.fromEntries(counterStore))); } catch { /* ignore */ }
}
function countersOf(id: string): { A: CState; B: CState; S: CState } {
  loadCounters();
  let s = counterStore.get(id);
  if (!s) { s = { A: mkC(), B: mkC(), S: mkC() }; counterStore.set(id, s); }
  return s;
}
const cMs = (s: CState): number => s.base + (s.running ? Date.now() - s.startedAt : 0);

// An old-time mechanical stopwatch (the chronos stopwatch display, shrunk to a
// fixture control) driving its OWN count: chrome bezel, white dial, magenta second
// sweep. The TOP crown starts/stops it; the SIDE pusher resets it. `k` scales it.
function stopwatchCtl(s: CState, offline: boolean, k = 1): HTMLCanvasElement {
  const TAU = Math.PI * 2;
  const W = Math.round(56 * k), H = Math.round(54 * k);
  const cvs = el('canvas', { class: 'dfx-watch' });
  cvs.width = W * dpr; cvs.height = H * dpr;
  cvs.style.width = `${W}px`; cvs.style.height = `${H}px`;
  const g = ctx2d(cvs); if (g) g.scale(dpr, dpr);
  cvs.title = 'Stopwatch — top crown: start/stop · side pusher: reset';
  if (offline) cvs.classList.add('dfx-blink');

  // Chronos-stopwatch geometry, but size R so BOTH crowns fit: the top crown's
  // overhang bounds the height, the side pusher's (cos18°·(R+2.5·0.17R) ≈ 1.36R)
  // bounds the width.
  const margin = 2 * k, REACH = 1.35;
  const R = Math.min((W / 2 - margin) / 1.36, (H - margin * 2) / (1 + REACH));
  const cx = W / 2, cy = margin + REACH * R;
  const angTop = -Math.PI / 2;                        // start/stop crown at 60 (top)
  const angSide = -Math.PI / 2 + (12 / 60) * TAU;     // reset pusher on the side (~2 o'clock)
  const topSize = R * 0.24, sideSize = R * 0.17;
  const knobAt = (ang: number, size: number): { x: number; y: number; size: number } =>
    ({ x: cx + Math.cos(ang) * (R + size * 1.5), y: cy + Math.sin(ang) * (R + size * 1.5), size });

  const drawWatch = (): void => {
    if (!g) return;
    g.clearRect(0, 0, W, H);
    const crown = (ang: number, size: number, cap: string): void => {
      const bx = cx + Math.cos(ang) * R, by = cy + Math.sin(ang) * R;
      const k = knobAt(ang, size);
      g.strokeStyle = '#9aa0aa'; g.lineWidth = size * 0.7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(bx, by); g.lineTo(k.x, k.y); g.stroke();
      const kn = g.createRadialGradient(k.x - size * 0.3, k.y - size * 0.3, size * 0.2, k.x, k.y, size);
      kn.addColorStop(0, '#f4f6f8'); kn.addColorStop(0.6, cap); kn.addColorStop(1, '#31343a');
      g.fillStyle = kn; g.beginPath(); g.arc(k.x, k.y, size, 0, TAU); g.fill();
    };
    crown(angTop, topSize, s.running ? '#e0219a' : '#3a3d44');   // start/stop (lit when running)
    crown(angSide, sideSize, '#5b6f86');                          // blue reset pusher
    // Chrome bezel + white dial.
    const bez = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.2, cx, cy, R * 1.05);
    bez.addColorStop(0, '#fdfefe'); bez.addColorStop(0.42, '#c9ccd2'); bez.addColorStop(0.7, '#7d828c'); bez.addColorStop(1, '#565a62');
    g.fillStyle = bez; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    const rF = R * 0.86;
    g.fillStyle = '#f6f7f4'; g.beginPath(); g.arc(cx, cy, rF, 0, TAU); g.fill();
    // 12 dial ticks (60 won't read at this size).
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * TAU, major = i % 3 === 0;
      g.strokeStyle = '#141414'; g.lineWidth = (major ? 1.4 : 0.7) * k;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * rF * (major ? 0.72 : 0.82), cy + Math.sin(a) * rF * (major ? 0.72 : 0.82));
      g.lineTo(cx + Math.cos(a) * rF * 0.94, cy + Math.sin(a) * rF * 0.94);
      g.stroke();
    }
    // Hands off the counter's elapsed ms: short dark minute, long magenta second sweep.
    const totalS = Math.max(0, cMs(s)) / 1000;
    const hand = (frac: number, len: number, w: number, color: string, tail = 0): void => {
      const a = -Math.PI / 2 + frac * TAU;
      g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - Math.cos(a) * tail, cy - Math.sin(a) * tail);
      g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      g.stroke();
    };
    hand(((totalS / 60) % 60) / 60, rF * 0.5, 1.4 * k, '#3a3d44');
    hand((totalS % 60) / 60, rF * 0.88, 1.1 * k, '#e0219a', rF * 0.18);
    g.fillStyle = '#e0219a'; g.beginPath(); g.arc(cx, cy, 1.8 * k, 0, TAU); g.fill();
  };
  animate(cvs, drawWatch);

  cvs.addEventListener('click', (e) => {
    e.stopPropagation();
    const hit = (k: { x: number; y: number; size: number }): boolean =>
      Math.hypot(e.offsetX - k.x, e.offsetY - k.y) <= Math.max(k.size * 2.4, 8);
    if (hit(knobAt(angTop, topSize))) {
      if (s.running) { s.base = cMs(s); s.running = false; }
      else { s.startedAt = Date.now(); s.running = true; }
      saveCounters();
    } else if (hit(knobAt(angSide, sideSize))) {
      s.base = 0; s.startedAt = Date.now();
      saveCounters();
    }
  });
  return cvs;
}

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
    if (s.running) { s.base = cMs(s); s.running = false; } else { s.startedAt = Date.now(); s.running = true; }
    saveCounters();
    sync();
  });
  rst.addEventListener('click', (e) => { e.stopPropagation(); s.base = 0; s.startedAt = Date.now(); saveCounters(); });
  let last = '';
  animate(cvs, () => { const str = hms(cMs(s)); if (str !== last) { last = str; draw(str); } });
  sync();
  return el('div', { class: 'dfx-crow' }, [el('span', { class: 'dfx-clab' }, [id]), cvs, el('div', { class: 'dfx-mrow' }, [run, rst])]);
}

// The stopwatch is the card's THIRD count — its own state, read off its own hands.
// It sits in its own column, filling the space to the right of the A/B counters.
function stopwatchCol(destId: string, offline: boolean): HTMLElement {
  const s = countersOf(destId).S;
  return el('div', { class: 'dfx-swcol' }, [
    stopwatchCtl(s, offline, 2.1),
    el('span', { class: 'dfx-wlab' }, ['top crown start/stop · side pusher reset']),
  ]);
}

function counterCard(pgm: Production, openEdit: () => void, offline: boolean): HTMLElement {
  const body = el('div', { class: 'dfx-chrono' }, [
    el('div', { class: 'dfx-ccol' }, [
      counterRow(pgm.id, 'A', openEdit, offline),
      counterRow(pgm.id, 'B', openEdit, offline),
    ]),
    stopwatchCol(pgm.id, offline),
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
