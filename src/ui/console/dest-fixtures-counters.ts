// src/ui/console/dest-fixtures-counters — the DUAL COUNTER fixture.
//
// TWO always-present count-up counters (A + B) with ▶/↺ transports, plus a THIRD
// independent count: an old-time pocket stopwatch (TOP crown start/stop, SIDE
// pusher reset — chronos stopwatch look). Click a count to open the dual-count
// TIMER editor. State is EPOCH-based (Date.now, not performance.now) and persisted
// on every transport action — a running count survives, and keeps counting THROUGH,
// a reload (audit §3.2 / §8 W1). Elapsed is always derived, never ticked into
// storage. The counter store is owned here; siblings read it via countersOf().

import { el, ctx2d } from '../dom.js';
import { animate, card, dpr, hms, readout } from './dest-fixtures-shared.js';
import type { Production } from '../../model/index.js';
import { getBus } from '../../platform/mqtt/index.js';
import { timeSync } from '../../platform/time-sync.js';

interface CState { running: boolean; base: number; startedAt: number; }
// A + B are the dual counters; S is the standalone stopwatch's own count.
const counterStore = new Map<string, { A: CState; B: CState; S: CState }>();
const mkC = (): CState => ({ running: false, base: 0, startedAt: 0 });

function countersOf(id: string): { A: CState; B: CState; S: CState; T?: any } {
  timeSync.init();
  let s = counterStore.get(id);
  if (!s) { 
    s = { A: mkC(), B: mkC(), S: mkC() }; 
    counterStore.set(id, s);
    const bus = getBus();
    bus.subscribe(`destinations/${id}/counters`, (v: any) => {
      if (v && v.A && v.B && v.S) {
        Object.assign(s!.A, v.A);
        Object.assign(s!.B, v.B);
        Object.assign(s!.S, v.S);
      }
    });
    bus.subscribe(`destinations/${id}/counters_timer`, (v: any) => {
      if (v) (s as any).T = v;
    });
  }
  return s;
}

function syncCounters(id: string): void {
  const s = counterStore.get(id);
  if (s) {
    timeSync.claimMaster();
    getBus().publishValue(`destinations/${id}/counters`, s, { throttle: false });
  }
}

const cMs = (s: CState): number => s.base + (s.running ? timeSync.now() - s.startedAt : 0);

// An old-time mechanical stopwatch (the chronos stopwatch display, shrunk to a
// fixture control) driving its OWN count: chrome bezel, white dial, magenta second
// sweep. The TOP crown starts/stops it; the SIDE pusher resets it. `k` scales it.
function stopwatchCtl(destId: string, s: CState, offline: boolean, k = 1): HTMLCanvasElement {
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
      else { s.startedAt = timeSync.now(); s.running = true; }
      syncCounters(destId);
    } else if (hit(knobAt(angSide, sideSize))) {
      s.base = 0; s.startedAt = timeSync.now();
      syncCounters(destId);
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
  const sync = (): void => { 
    const tSync = (countersOf(destId) as any).T?.[id];
    const isRun = tSync ? tSync.running : s.running;
    run.textContent = isRun ? '‖' : '▶'; 
    run.classList.toggle('run', isRun); 
  };
  run.addEventListener('click', (e) => {
    e.stopPropagation();
    const tSync = (countersOf(destId) as any).T?.[id];
    if (tSync) {
      tSync.running = !tSync.running;
      tSync.unix = timeSync.now();
      timeSync.claimMaster();
      getBus().publishValue(`destinations/${destId}/counters_timer`, (countersOf(destId) as any).T, { throttle: false });
    } else {
      if (s.running) { s.base = cMs(s); s.running = false; } else { s.startedAt = timeSync.now(); s.running = true; }
      syncCounters(destId);
    }
    sync();
  });
  rst.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    const tSync = (countersOf(destId) as any).T?.[id];
    if (tSync) {
      tSync.valueFrames = 0; tSync.unix = timeSync.now();
      timeSync.claimMaster();
      getBus().publishValue(`destinations/${destId}/counters_timer`, (countersOf(destId) as any).T, { throttle: false });
    } else {
      s.base = 0; s.startedAt = timeSync.now(); syncCounters(destId); 
    }
  });
  let last = '';
  animate(cvs, () => { 
    const tSync = (countersOf(destId) as any).T?.[id];
    let str = '';
    if (tSync) {
       const elapsedMs = tSync.running ? timeSync.now() - tSync.unix : 0;
       let frames = tSync.valueFrames;
       if (tSync.direction === 'down') frames -= Math.floor(elapsedMs / 1000 * tSync.fps);
       else frames += Math.floor(elapsedMs / 1000 * tSync.fps);
       if (frames < 0) frames = 0;
       const totalS = Math.floor(frames / tSync.fps);
       const h = Math.floor(totalS / 3600), m = Math.floor((totalS % 3600) / 60), sc = totalS % 60;
       str = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sc.toString().padStart(2,'0')}`;
    } else {
       str = hms(cMs(s)); 
    }
    if (str !== last) { last = str; draw(str); } 
  });
  sync();
  return el('div', { class: 'dfx-crow' }, [el('span', { class: 'dfx-clab' }, [id]), cvs, el('div', { class: 'dfx-mrow' }, [run, rst])]);
}

// The stopwatch is the card's THIRD count — its own state, read off its own hands.
// It sits in its own column, filling the space to the right of the A/B counters.
function stopwatchCol(destId: string, offline: boolean): HTMLElement {
  const s = countersOf(destId).S;
  return el('div', { class: 'dfx-swcol' }, [
    stopwatchCtl(destId, s, offline, 2.1),
    el('span', { class: 'dfx-wlab' }, ['top crown start/stop · side pusher reset']),
  ]);
}

export function counterCard(pgm: Production, openEdit: () => void, offline: boolean): HTMLElement {
  const body = el('div', { class: 'dfx-chrono' }, [
    el('div', { class: 'dfx-ccol' }, [
      counterRow(pgm.id, 'A', openEdit, offline),
      counterRow(pgm.id, 'B', openEdit, offline),
    ]),
    stopwatchCol(pgm.id, offline),
  ]);
  return card('DUAL COUNTER', body, 'tap a count to edit');
}
