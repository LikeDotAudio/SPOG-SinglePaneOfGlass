// src/editors/clock — the CLOCK / TIME GENERATOR editor (a graphics source).
//
// Opened when a WORLD CLOCKS feed (extraClass:"clock-source") is routed onto a
// twist, or a twist is literally named "Clock".
//
// A free-form "clock bench" modelled on the METER INPUT test monitor: every clock
// and the date read-out is an independent WINDOW ("device") you can drag-move (by
// its header), resize (corner handle, like a window), close (×), or spawn more of
// (+ Clock / + Date). Layout PRESETS re-tile every window at once, and the stage
// itself is a resizable canvas. Each clock window carries its own zone + face:
//   • DIGITAL      — a big red LED HH:MM read-out on black + zone caption.
//   • DIGITAL·SEC  — the same, with seconds (HH:MM:SS).
//   • LED RING     — HH:MM:SS ringed by 60 second ticks that pulse on the beat
//                    (the Evertz digital reference).
//   • ANALOG       — a white face with 12h + inner red 24h numerals and a high-vis
//                    red second hand that SWEEPS smoothly (the Evertz analog clock).
//
// Self-contained: zones are parsed from the routed feed labels (UTC / LOCAL /
// LOCAL ±NH) and are editable per window; no external time source — driven off the
// browser clock via rAF.

import type { EditorPlugin } from '../types.js';
import { el, addStyles, ctx2d } from '../../ui/dom.js';

const CSS = `
.ck{display:flex;flex-direction:column;gap:12px;height:100%;min-height:0;color:#dfe8f5;
  font-family:'Courier New',Consolas,monospace;}
.ck-bar{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;}
.ck-grp{display:flex;flex-direction:column;gap:7px;}
.ck-grp-lbl{font:800 10px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;}
.ck-grp-row{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;}
.ck-seg{display:inline-flex;border:1px solid #3a2b46;border-radius:10px;overflow:hidden;}
.ck-btn{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:8px 13px;border:none;
  background:#1a1220;color:#c9b6d6;cursor:pointer;}
.ck-btn:hover{filter:brightness(1.25);}
.ck-btn.on{background:#C864C8;color:#160a18;}
.ck-add{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:8px 14px;cursor:pointer;
  border:1px solid #3a6a3a;border-radius:10px;background:#12210f;color:#a6e2a6;}
.ck-add:hover{background:#1a3216;}
.ck-hint{font:700 10px 'Courier New',monospace;letter-spacing:.4px;color:#6b7686;}

/* The stage is the movable canvas — windows are absolutely placed within it and it
   is itself vertically resizable, so the operator can size the whole wall. */
.ck-stage{position:relative;flex:1;min-height:360px;overflow:auto;resize:vertical;
  background:#05060a;border:1px solid #191b24;border-radius:12px;
  background-image:radial-gradient(rgba(200,100,200,.09) 1px,transparent 1px);background-size:22px 22px;}

.ck-win{position:absolute;display:flex;flex-direction:column;min-width:120px;min-height:120px;
  background:#07080c;border:1px solid #20222c;border-radius:12px;overflow:hidden;resize:both;box-shadow:0 6px 20px rgba(0,0,0,.5);}
.ck-win.sel{border-color:#C864C8;box-shadow:0 0 0 1px #C864C8,0 8px 26px rgba(200,100,200,.28);}
.ck-win-head{display:flex;align-items:center;gap:6px;margin:0;padding:5px 7px;cursor:move;user-select:none;
  background:#160c1a;border-bottom:1px solid #241a26;}
.ck-win-title{flex:1;min-width:0;font:800 10px 'Courier New',monospace;letter-spacing:1px;color:#e79ae7;text-transform:uppercase;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;outline:none;cursor:text;}
.ck-win-title:focus{color:#fff;}
.ck-ico{cursor:pointer;color:#c9b6d6;background:rgba(255,255,255,.06);border-radius:6px;font:800 9px 'Courier New',monospace;
  letter-spacing:1px;line-height:1;padding:4px 6px;}
.ck-ico:hover{background:rgba(200,100,200,.3);color:#fff;}
.ck-ico.ck-x{color:#f0a0a0;}
.ck-win-body{flex:1;min-height:0;position:relative;}
.ck-win-body canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:auto;display:block;}

/* Date read-out window — a broadcast display of YYYY MM DD DAY, filling its window. */
.ck-date{display:flex;align-items:stretch;justify-content:center;gap:1px;width:100%;height:100%;
  background:#050505;box-shadow:inset 0 0 22px rgba(255,47,47,.12);}
.ck-date .ck-cell{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;}
.ck-date .ck-cell + .ck-cell{border-left:1px solid #1b1d24;}
.ck-date .ck-cap{font:700 9px 'Courier New',monospace;letter-spacing:2px;color:#7d8ba0;text-transform:uppercase;}
.ck-date .ck-val{font:800 26px 'Courier New',Consolas,monospace;letter-spacing:1px;color:#ff2f2f;
  text-shadow:0 0 12px rgba(255,47,47,.75);}
.ck-date .ck-day .ck-val{font-size:20px;letter-spacing:2px;}
`;

// ---- zone model -------------------------------------------------------------
interface Zone { label: string; utc: boolean; offsetH: number; }

/** Parse a routed feed label into a time zone. "UTC" → utc; "LOCAL ±NH" → offset. */
function parseZone(label: string): Zone {
  const clean = label.trim();
  if (/utc|gmt|zulu/i.test(clean)) return { label: 'UTC', utc: true, offsetH: 0 };
  // A signed hour offset, tolerating both ASCII '-' and the unicode minus '−'.
  const m = clean.match(/([+\-−])\s*(\d+)/);
  const offsetH = m ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : 0;
  return { label: clean || 'LOCAL', utc: false, offsetH };
}

/** The zones to seed the bench with: every routed feed, or a LOCAL + UTC default pair. */
function deriveZones(sources: ReadonlyArray<{ label: string }>): Zone[] {
  const zones = sources.map((s) => parseZone(s.label));
  return zones.length ? zones : [parseZone('LOCAL'), parseZone('UTC')];
}

/** {h,m,s,ms} for a zone at the current instant (UTC read-out or local ± offset). */
function zoneTime(z: Zone): { h: number; m: number; s: number; ms: number } {
  const now = new Date();
  if (z.utc) return { h: now.getUTCHours(), m: now.getUTCMinutes(), s: now.getUTCSeconds(), ms: now.getUTCMilliseconds() };
  const d = new Date(now.getTime() + z.offsetH * 3600_000);
  return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), ms: d.getMilliseconds() };
}

const pad = (n: number): string => String(n).padStart(2, '0');
const TAU = Math.PI * 2;

// ---- date read-out ----------------------------------------------------------
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** The local calendar date, split into YYYY / MM / DD / DAY for the display window. */
function dateParts(): { yyyy: string; mm: string; dd: string; day: string } {
  const d = new Date();
  return {
    yyyy: String(d.getFullYear()),
    mm: pad(d.getMonth() + 1),
    dd: pad(d.getDate()),
    day: WEEKDAYS[d.getDay()] ?? '',
  };
}

// ---- DIGITAL face (big red LED read-out, with or without seconds) -----------
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function drawDigital(g: CanvasRenderingContext2D, S: number, z: Zone, withSeconds: boolean): void {
  const t = zoneTime(z);
  const cx = S / 2, cy = S / 2;
  g.clearRect(0, 0, S, S);
  // Read-out panel.
  const pw = S * 0.92, ph = S * 0.52, x = cx - pw / 2, y = cy - ph / 2;
  g.fillStyle = '#050505'; roundRect(g, x, y, pw, ph, ph * 0.12); g.fill();
  // Zone caption.
  g.fillStyle = '#7d8ba0';
  g.font = `700 ${Math.round(S * 0.07)}px 'Courier New',monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(z.label.toUpperCase(), cx, y + ph * 0.2);
  // Time.
  const str = withSeconds ? `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}` : `${pad(t.h)}:${pad(t.m)}`;
  g.fillStyle = '#ff2f2f'; g.shadowColor = '#ff2f2f'; g.shadowBlur = S * 0.05;
  g.font = `800 ${Math.round(S * (withSeconds ? 0.2 : 0.28))}px 'Courier New',Consolas,monospace`;
  g.fillText(str, cx, cy + ph * 0.14);
  g.shadowBlur = 0;
}

// ---- LED RING face (Evertz digital reference) -------------------------------
// HH:MM:SS with 60 second ticks around the rim: marks up to the current second
// glow, and the current mark PULSES on the beat so the ring visibly ticks.
function drawLed(g: CanvasRenderingContext2D, S: number, z: Zone): void {
  const t = zoneTime(z);
  const cx = S / 2, cy = S / 2, R = S * 0.46;
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#0b0b0d';
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();

  const beat = t.ms < 140 ? 1 - t.ms / 140 : 0;      // 1→0 pulse each second
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * TAU;
    const cos = Math.cos(a), sin = Math.sin(a);
    const passed = i <= t.s, now = i === t.s;
    const major = i % 5 === 0;
    const rO = R * 0.98, rI = R * (major ? 0.80 : 0.90);   // long vs short segment
    g.save();
    g.globalAlpha = now ? 1 : passed ? 0.92 : 0.28;
    g.strokeStyle = now ? '#ff6a6a' : '#e21f1f';
    g.shadowColor = '#ff2b2b';
    g.shadowBlur = now ? 10 + beat * 14 : passed ? 4 : 0;
    g.lineWidth = S * ((major ? 0.026 : 0.02) + (now ? beat * 0.008 : 0));
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx + cos * rI, cy + sin * rI); g.lineTo(cx + cos * rO, cy + sin * rO); g.stroke();
    g.restore();
  }

  // Central LED read-out panel.
  const pw = R * 1.28, ph = R * 0.42, x = cx - pw / 2, y = cy - ph / 2;
  g.fillStyle = '#050505'; roundRect(g, x, y, pw, ph, ph * 0.16); g.fill();
  g.fillStyle = '#ff2f2f';
  g.shadowColor = '#ff2f2f'; g.shadowBlur = 12;
  g.font = `800 ${Math.round(ph * 0.62)}px 'Courier New',Consolas,monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`, cx, cy + ph * 0.04);
  g.shadowBlur = 0;
  g.fillStyle = '#7d8ba0';
  g.font = `700 ${Math.round(S * 0.052)}px 'Courier New',monospace`;
  g.fillText(z.label.toUpperCase(), cx, cy - ph * 0.9);
}

// ---- ANALOG face (Evertz analog reference) ----------------------------------
function drawAnalog(g: CanvasRenderingContext2D, S: number, z: Zone): void {
  const t = zoneTime(z);
  const cx = S / 2, cy = S / 2, R = S * 0.46;
  g.clearRect(0, 0, S, S);
  // Bezel + white face.
  g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  g.fillStyle = '#f4f4f2'; g.beginPath(); g.arc(cx, cy, R * 0.94, 0, TAU); g.fill();

  // Minute (thin) + hour (thick) ticks.
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * TAU, cos = Math.cos(a), sin = Math.sin(a);
    const hour = i % 5 === 0;
    g.strokeStyle = '#1a1a1a'; g.lineWidth = hour ? S * 0.016 : S * 0.006;
    const rI = R * (hour ? 0.8 : 0.85);
    g.beginPath(); g.moveTo(cx + cos * rI, cy + sin * rI); g.lineTo(cx + cos * R * 0.9, cy + sin * R * 0.9); g.stroke();
  }
  // 12h numerals (black) + inner 24h numerals (red), as on the reference face.
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) {
    const a = -Math.PI / 2 + (h / 12) * TAU, cos = Math.cos(a), sin = Math.sin(a);
    g.fillStyle = '#111'; g.font = `800 ${Math.round(S * 0.11)}px Arial,Helvetica,sans-serif`;
    g.fillText(String(h), cx + cos * R * 0.68, cy + sin * R * 0.68);
    g.fillStyle = '#c02020'; g.font = `700 ${Math.round(S * 0.058)}px Arial,Helvetica,sans-serif`;
    g.fillText(String(h === 12 ? 24 : h + 12), cx + cos * R * 0.5, cy + sin * R * 0.5);
  }
  // Brand caption.
  g.fillStyle = '#8a1f1f'; g.font = `800 ${Math.round(S * 0.05)}px Arial,sans-serif`;
  g.fillText(z.label.toUpperCase(), cx, cy + R * 0.34);

  // Hands. Second sweeps SMOOTHLY (ms fraction) for the high-visibility look.
  const secF = t.s + t.ms / 1000;
  const minF = t.m + secF / 60;
  const hourF = (t.h % 12) + minF / 60;
  const hand = (frac: number, len: number, w: number, color: string, tail = 0): void => {
    const a = -Math.PI / 2 + frac * TAU;
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - Math.cos(a) * tail, cy - Math.sin(a) * tail);
    g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.stroke();
  };
  hand(hourF / 12, R * 0.5, S * 0.028, '#141414');
  hand(minF / 60, R * 0.74, S * 0.02, '#141414');
  hand(secF / 60, R * 0.82, S * 0.012, '#e01010', R * 0.22);   // red sweep hand + counterweight
  g.fillStyle = '#141414'; g.beginPath(); g.arc(cx, cy, S * 0.03, 0, TAU); g.fill();
  g.fillStyle = '#e01010'; g.beginPath(); g.arc(cx, cy, S * 0.014, 0, TAU); g.fill();
}

// ---- faces ------------------------------------------------------------------
type Face = 'digital' | 'digitalsec' | 'ledring' | 'analog';
const FACES: Array<{ id: Face; label: string; short: string }> = [
  { id: 'digital', label: '◷ Digital', short: 'H:M' },
  { id: 'digitalsec', label: '◷ Digital · Sec', short: 'H:M:S' },
  { id: 'ledring', label: '◷ LED Ring', short: 'RING' },
  { id: 'analog', label: '◴ Analog', short: 'ANLG' },
];
const faceShort = (f: Face): string => FACES.find((x) => x.id === f)?.short ?? 'RING';
const nextFace = (f: Face): Face => {
  const i = FACES.findIndex((x) => x.id === f);
  return FACES[(i + 1) % FACES.length]?.id ?? 'ledring';
};

// A placed window's geometry: left, top, width, height (CSS px within the stage).
type Rect = [number, number, number, number];

const plugin: EditorPlugin = {
  id: 'clock',
  title: 'CLOCK · TIME GENERATOR',
  order: 8,
  blurb: 'Broadcast clock bench — spawn, drag-move, resize and close clock + date windows on a canvas; each carries its own zone (UTC / local ±h) and face (digital, seconds, LED ring, analog). Presets re-tile the wall.',
  match: (n) => /\bclock\b/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-clock', CSS);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    // ---- device model: each clock/date is a floating window -----------------
    interface Device {
      id: number;
      kind: 'clock' | 'date';
      win: HTMLElement;
      title: HTMLElement;
      // clock only
      zone?: Zone;
      face?: Face;
      cvs?: HTMLCanvasElement;
      g?: CanvasRenderingContext2D | null;
      // date only
      cells?: { yyyy: HTMLElement; mm: HTMLElement; dd: HTMLElement; day: HTMLElement };
    }
    const devices: Device[] = [];
    let seq = 0;
    let defaultFace: Face = 'ledring';
    let zTop = 10;
    const front = (): number => ++zTop;
    let selected: Device | null = null;

    const stage = el('div', { class: 'ck-stage' });

    const setRect = (d: Device, r: Rect): void => {
      Object.assign(d.win.style, { left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px` });
    };
    const select = (d: Device | null): void => {
      selected = d;
      for (const x of devices) x.win.classList.toggle('sel', x === d);
    };

    // Header icon button (face cycle, ×) — stops pointerdown so it doesn't drag.
    const icon = (cls: string, txt: string, title: string, onClick: () => void): HTMLElement => {
      const b = el('span', { class: `ck-ico ${cls}`, title }, [txt]);
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };

    // Make a window drag-movable (by its header) and bring-to-front on grab.
    // Native `resize:both` (set in CSS) handles the corner scale — no JS needed.
    const floatWin = (d: Device, head: HTMLElement): void => {
      d.win.addEventListener('pointerdown', () => { select(d); d.win.style.zIndex = String(front()); });
      head.addEventListener('pointerdown', (e) => {
        if ((e.target as HTMLElement).closest('.ck-ico, .ck-win-title')) return; // buttons + rename own the click
        e.preventDefault();
        head.setPointerCapture(e.pointerId);
        const sx = e.clientX, sy = e.clientY, ox = d.win.offsetLeft, oy = d.win.offsetTop;
        const move = (ev: PointerEvent): void => {
          d.win.style.left = `${Math.max(0, ox + ev.clientX - sx)}px`;
          d.win.style.top = `${Math.max(0, oy + ev.clientY - sy)}px`;
        };
        const up = (): void => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); };
        head.addEventListener('pointermove', move); head.addEventListener('pointerup', up);
      });
    };

    const removeDevice = (d: Device): void => {
      const i = devices.indexOf(d);
      if (i >= 0) devices.splice(i, 1);
      d.win.remove();
      if (selected === d) selected = null;
      publishCount();
    };

    // ---- spawn a CLOCK window -----------------------------------------------
    const addClock = (zone: Zone = parseZone('LOCAL'), face: Face = defaultFace, rect?: Rect): Device => {
      const title = el('div', { class: 'ck-win-title', title: 'Click to rename / retime (e.g. "TOKYO +9")' }, [zone.label.toUpperCase()]);
      title.contentEditable = 'true';
      const cvs = el('canvas') as HTMLCanvasElement;
      const faceBtn = icon('', faceShort(face), 'Cycle face', () => {
        d.face = nextFace(d.face ?? 'ledring');
        faceBtn.textContent = faceShort(d.face);
      });
      const head = el('div', { class: 'ck-win-head' }, [
        title, faceBtn, icon('ck-x', '×', 'Close window', () => removeDevice(d)),
      ]);
      const win = el('div', { class: 'ck-win' }, [head, el('div', { class: 'ck-win-body' }, [cvs])]);
      const d: Device = { id: ++seq, kind: 'clock', win, title, zone, face, cvs, g: ctx2d(cvs) };
      // Retime/rename: reparse the edited label into a zone (keeps the typed text).
      title.addEventListener('input', () => {
        const txt = title.textContent ?? '';
        const z = parseZone(txt);
        d.zone = { ...z, label: txt.trim() || z.label };
      });
      floatWin(d, head);
      devices.push(d);
      stage.appendChild(win);
      setRect(d, rect ?? [12 + (devices.length % 4) * 200, 12 + Math.floor(devices.length / 4) * 30, 190, 190]);
      win.style.zIndex = String(front());
      publishCount();
      return d;
    };

    // ---- spawn a DATE window ------------------------------------------------
    const addDate = (rect?: Rect): Device => {
      const mkVal = (): HTMLElement => el('div', { class: 'ck-val' });
      const cells = { yyyy: mkVal(), mm: mkVal(), dd: mkVal(), day: mkVal() };
      const cell = (cap: string, val: HTMLElement, extra = ''): HTMLElement =>
        el('div', { class: `ck-cell${extra}` }, [val, el('div', { class: 'ck-cap' }, [cap])]);
      const title = el('div', { class: 'ck-win-title' }, ['DATE']);
      const head = el('div', { class: 'ck-win-head' }, [title, icon('ck-x', '×', 'Close window', () => removeDevice(d))]);
      const dateBody = el('div', { class: 'ck-date' }, [
        cell('Year', cells.yyyy), cell('Month', cells.mm), cell('Day', cells.dd), cell('Weekday', cells.day, ' ck-day'),
      ]);
      const win = el('div', { class: 'ck-win' }, [head, el('div', { class: 'ck-win-body' }, [dateBody])]);
      const d: Device = { id: ++seq, kind: 'date', win, title, cells };
      floatWin(d, head);
      devices.push(d);
      stage.appendChild(win);
      setRect(d, rect ?? [12, 12, 300, 120]);
      win.style.zIndex = String(front());
      publishCount();
      return d;
    };

    // ---- layout presets: re-tile every window at once -----------------------
    // Clocks tile as squares; date windows land in a strip beneath them.
    const PAD = 12, TOP = 8;
    const applyPreset = (name: string): void => {
      const W = stage.clientWidth || host.clientWidth || 900;
      const clocks = devices.filter((d) => d.kind === 'clock');
      const dates = devices.filter((d) => d.kind === 'date');
      let dateY = TOP;
      if (clocks.length) {
        let cols = clocks.length;
        if (name === 'grid') cols = Math.ceil(Math.sqrt(clocks.length));
        else if (name === 'column') cols = 1;
        else cols = clocks.length; // row
        const size = Math.max(140, Math.min(300, Math.floor((W - PAD * (cols + 1)) / cols)));
        clocks.forEach((d, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          setRect(d, [PAD + c * (size + PAD), TOP + r * (size + PAD), size, size]);
        });
        const rows = Math.ceil(clocks.length / cols);
        dateY = TOP + rows * (size + PAD);
      }
      dates.forEach((d, i) => setRect(d, [PAD + i * 312, dateY, 300, 110]));
      // Grow the stage so every window is reachable without clipping.
      const bottom = devices.reduce((mx, d) => Math.max(mx, d.win.offsetTop + d.win.offsetHeight), 0);
      stage.style.minHeight = `${Math.max(360, bottom + PAD)}px`;
      activePreset = name;
      presetBtns.forEach((x) => x.b.classList.toggle('on', x.name === name));
    };

    // ---- toolbar ------------------------------------------------------------
    const addClockBtn = el('button', { class: 'ck-add' }, ['＋ Clock']);
    addClockBtn.addEventListener('click', () => { addClock(); applyPreset(activePreset); });
    const addDateBtn = el('button', { class: 'ck-add' }, ['＋ Date']);
    addDateBtn.addEventListener('click', () => { addDate(); applyPreset(activePreset); });

    // Global FACE — sets the default for new clocks AND retargets every clock now.
    const faceBtns = FACES.map((f) => {
      const b = el('button', { class: `ck-btn${f.id === defaultFace ? ' on' : ''}` }, [f.label]);
      b.addEventListener('click', () => setFace(f.id));
      return { id: f.id, b };
    });
    const setFace = (f: Face, publish = true): void => {
      defaultFace = f;
      for (const d of devices) if (d.kind === 'clock') {
        d.face = f;
        const fb = d.win.querySelector<HTMLElement>('.ck-win-head .ck-ico:not(.ck-x)');
        if (fb) fb.textContent = faceShort(f);
      }
      faceBtns.forEach((x) => x.b.classList.toggle('on', x.id === f));
      if (publish) ctx.services.publishParam?.('face', f, { throttle: false });
    };

    const PRESET_NAMES: Array<{ name: string; label: string }> = [
      { name: 'row', label: '▭ Row' }, { name: 'grid', label: '▦ Grid' }, { name: 'column', label: '▯ Column' },
    ];
    let activePreset = 'row';
    const presetBtns = PRESET_NAMES.map((p) => {
      const b = el('button', { class: `ck-btn${p.name === activePreset ? ' on' : ''}` }, [p.label]);
      b.addEventListener('click', () => { applyPreset(p.name); ctx.services.publishParam?.('preset', p.name, { throttle: false }); });
      return { name: p.name, b };
    });

    const grp = (label: string, ...kids: HTMLElement[]): HTMLElement =>
      el('div', { class: 'ck-grp' }, [el('div', { class: 'ck-grp-lbl' }, [label]), el('div', { class: 'ck-grp-row' }, kids)]);

    host.append(el('div', { class: 'ck' }, [
      el('div', { class: 'ck-bar' }, [
        grp('Add', addClockBtn, addDateBtn),
        grp('Face', el('div', { class: 'ck-seg' }, faceBtns.map((x) => x.b))),
        grp('Preset', el('div', { class: 'ck-seg' }, presetBtns.map((x) => x.b))),
        grp('Canvas', el('span', { class: 'ck-hint' }, ['drag a header to move · corner to scale · × to close · drag the stage edge to resize'])),
      ]),
      stage,
    ]));

    // ---- seed from the routed zones + a date window, then tile --------------
    for (const z of deriveZones(ctx.sources)) addClock(z, defaultFace);
    addDate();
    applyPreset('row');
    // Re-tile once the stage has a real width (first layout can measure 0).
    let laidOut = stage.clientWidth > 0;

    // ---- MQTT: default face + preset are the wall-level, R/W controls -------
    ctx.services.advertiseParams?.([
      { name: 'face', type: 'string', writable: true },
      { name: 'preset', type: 'string', writable: true },
      { name: 'clocks', type: 'number' },
    ]);
    function publishCount(): void {
      ctx.services.publishParam?.('clocks', devices.filter((d) => d.kind === 'clock').length, { throttle: false });
    }
    ctx.services.onParam?.('face', (v) => { if (FACES.some((f) => f.id === v)) setFace(v as Face, false); });
    ctx.services.onParam?.('preset', (v) => { if (PRESET_NAMES.some((p) => p.name === v)) applyPreset(String(v)); });
    ctx.services.publishParam?.('face', defaultFace, { throttle: false });
    ctx.services.publishParam?.('preset', activePreset, { throttle: false });
    publishCount();

    // ---- paint loop: date read-outs + clock faces (each fills its window) ---
    let lastDate = '';
    const paintDate = (cells: NonNullable<Device['cells']>): void => {
      const d = dateParts();
      const key = `${d.yyyy}${d.mm}${d.dd}${d.day}`;
      if (key === lastDate && cells.yyyy.textContent) return;
      lastDate = key;
      cells.yyyy.textContent = d.yyyy; cells.mm.textContent = d.mm; cells.dd.textContent = d.dd; cells.day.textContent = d.day;
    };
    const drawFace = (d: Device): void => {
      const cvs = d.cvs, g = d.g;
      if (!cvs || !g) return;
      const cw = cvs.clientWidth, ch = cvs.clientHeight;
      if (!cw || !ch) return;
      const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
      if (cvs.width !== bw) cvs.width = bw;
      if (cvs.height !== bh) cvs.height = bh;
      // Clear the whole bitmap, then draw a centred square face of side S (CSS px).
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, bw, bh);
      const S = Math.min(cw, ch);
      const ox = (cw - S) / 2, oy = (ch - S) / 2;
      g.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
      const face = d.face ?? 'ledring', z = d.zone as Zone;
      if (face === 'analog') drawAnalog(g, S, z);
      else if (face === 'ledring') drawLed(g, S, z);
      else drawDigital(g, S, z, face === 'digitalsec');
    };

    ctx.dispose.raf(() => {
      if (!laidOut && stage.clientWidth > 0) { laidOut = true; applyPreset(activePreset); }
      // paintDate keys on the calendar day, so a single lastDate guard is fine even
      // with several date windows — force each to fill on its first frame.
      let dateSeen = false;
      for (const d of devices) {
        if (d.kind === 'date') { if (d.cells) { if (dateSeen) lastDate = ''; paintDate(d.cells); dateSeen = true; } continue; }
        drawFace(d);
      }
    });
  },
};

export default plugin;
