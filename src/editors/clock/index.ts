// src/editors/clock — the CLOCK / TIME GENERATOR editor (a graphics source).
//
// Opened when a WORLD CLOCKS feed (extraClass:"clock-source") is routed onto a twist,
// or a twist is literally named "Clock".
//
// A free-form "clock bench": every clock and the date read-out is an independent
// WINDOW you can drag-move, resize, close, or spawn more of. Each clock window carries
// its own ZONE (UTC / local ± offset, pick from the header dropdown), RESOLUTION
// (HH:MM → HH:MM:SS → +frames), and FACE. Faces live one-per-file under faces/ and are
// collected here with import.meta.glob — adding a face is "drop a file in faces/".
// Layout PRESETS re-tile every window; the stage is a resizable canvas.

import type { EditorPlugin } from '../types.js';
import { el, addStyles, ctx2d } from '../../ui/dom.js';
import {
  type Zone, type Resolution, type FaceState, type FaceDef,
  parseZone, deriveZones, pad, RESOLUTIONS,
} from './faces/shared.js';

// ---- face registry (one file per face under faces/) -------------------------
const faceMods = import.meta.glob<{ default?: FaceDef }>('./faces/*.ts', { eager: true });
const FACES: FaceDef[] = Object.values(faceMods)
  .map((m) => m.default)
  .filter((d): d is FaceDef => !!d && typeof d.draw === 'function')
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
const hasFace = (id: string): boolean => FACES.some((f) => f.id === id);
const faceById = (id: string): FaceDef => FACES.find((f) => f.id === id) ?? FACES[0]!;
const DEFAULT_FACE = hasFace('ledring') ? 'ledring' : (FACES[0]?.id ?? 'digital');
// Map a (possibly legacy) saved face id onto a live one. 'digitalsec' folded into the
// resolution axis when it was split out into per-window resolution.
function normFace(id: string | undefined): { face: string; res?: Resolution } {
  if (id && hasFace(id)) return { face: id };
  if (id === 'digitalsec') return { face: 'digital', res: 'hms' };
  return { face: DEFAULT_FACE };
}

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

.ck-stage{position:relative;flex:1;min-height:360px;overflow:auto;resize:vertical;
  background:#05060a;border:1px solid #191b24;border-radius:12px;
  background-image:radial-gradient(rgba(200,100,200,.09) 1px,transparent 1px);background-size:22px 22px;}

.ck-win{position:absolute;display:flex;flex-direction:column;min-width:120px;min-height:120px;
  background:#07080c;border:1px solid #20222c;border-radius:12px;overflow:hidden;resize:both;box-shadow:0 6px 20px rgba(0,0,0,.5);}
.ck-win.sel{border-color:#C864C8;box-shadow:0 0 0 1px #C864C8,0 8px 26px rgba(200,100,200,.28);}
.ck-win-head{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0;padding:5px 7px;cursor:move;user-select:none;
  background:#160c1a;border-bottom:1px solid #241a26;}
.ck-win-title{flex:1 1 40px;min-width:0;font:800 10px 'Courier New',monospace;letter-spacing:1px;color:#e79ae7;text-transform:uppercase;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;outline:none;cursor:text;}
.ck-win-title:focus{color:#fff;}
.ck-ico{cursor:pointer;color:#c9b6d6;background:rgba(255,255,255,.06);border-radius:6px;font:800 9px 'Courier New',monospace;
  letter-spacing:1px;line-height:1;padding:4px 6px;}
.ck-ico:hover{background:rgba(200,100,200,.3);color:#fff;}
.ck-ico.ck-x{color:#f0a0a0;}
/* Per-window pickers (zone offset · resolution · face) — each clock is independent. */
.ck-face-sel{font:800 9px 'Courier New',monospace;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;min-width:0;
  background:#241a26;color:#e0c6ec;border:1px solid #3a2b46;border-radius:6px;padding:3px 3px;}
.ck-win-body{flex:1;min-height:0;position:relative;}
.ck-win-body canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:auto;display:block;}

.ck-date{display:flex;align-items:stretch;justify-content:center;gap:1px;width:100%;height:100%;--vf:26px;
  background:#050505;box-shadow:inset 0 0 22px rgba(255,47,47,.12);}
.ck-date .ck-cell{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2em;min-width:0;}
.ck-date .ck-cell + .ck-cell{border-left:1px solid #1b1d24;}
.ck-date .ck-cap{font:700 max(7px,calc(var(--vf)*.34)) 'Courier New',monospace;letter-spacing:2px;color:#7d8ba0;text-transform:uppercase;}
.ck-date .ck-val{font:800 var(--vf) 'Courier New',Consolas,monospace;letter-spacing:1px;color:#ff2f2f;line-height:1;
  text-shadow:0 0 12px rgba(255,47,47,.75);}
.ck-date .ck-day .ck-val{font-size:calc(var(--vf)*.77);letter-spacing:2px;}

.ck-saved{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;}
.ck-empty{font:700 10px 'Courier New',monospace;color:#5a6472;letter-spacing:.4px;}
`;

// ---- zone offset options for the per-window dropdown ------------------------
const OFFSETS: Array<{ v: string; label: string }> = [
  { v: 'utc', label: 'UTC' },
  ...[7, 6, 5, 4, 3, 2, 1].map((n) => ({ v: `+${n}`, label: `+${n}` })),
  { v: '0', label: 'LOCAL' },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ v: `-${n}`, label: `−${n}` })),
];
const offsetValue = (z: Zone): string => (z.utc ? 'utc' : z.offsetH > 0 ? `+${z.offsetH}` : String(z.offsetH));

// ---- date read-out ----------------------------------------------------------
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
function dateParts(): { yyyy: string; mm: string; dd: string; day: string } {
  const d = new Date();
  return { yyyy: String(d.getFullYear()), mm: pad(d.getMonth() + 1), dd: pad(d.getDate()), day: WEEKDAYS[d.getDay()] ?? '' };
}

type Rect = [number, number, number, number];

const plugin: EditorPlugin = {
  id: 'clock',
  title: 'CLOCK · TIME GENERATOR',
  order: 8,
  blurb: 'Broadcast clock bench — spawn, drag-move, resize and close clock + date windows on a canvas; each carries its own zone (UTC / local ±h), resolution (HH:MM → :SS → +frames) and face (digital, LED ring, analog, flip, Big Ben, Clasio, Time-Extreme, Cat).',
  match: (n) => /\bclock\b/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-clock', CSS);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    interface Device {
      id: number;
      kind: 'clock' | 'date';
      win: HTMLElement;
      title: HTMLElement;
      zone?: Zone;
      face?: string;
      res?: Resolution;
      faceSel?: HTMLSelectElement;
      offsetSel?: HTMLSelectElement;
      resSel?: HTMLSelectElement;
      cvs?: HTMLCanvasElement;
      g?: CanvasRenderingContext2D | null;
      state?: FaceState;
      cells?: { yyyy: HTMLElement; mm: HTMLElement; dd: HTMLElement; day: HTMLElement };
      dateEl?: HTMLElement;
    }
    const devices: Device[] = [];
    let seq = 0;
    let defaultFace: string = DEFAULT_FACE;
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
    const setDeviceFace = (d: Device, f: string): void => {
      d.face = f;
      if (d.faceSel) d.faceSel.value = f;
      if (d.cvs) d.cvs.style.background = faceById(f).lightBg
        ? 'radial-gradient(circle at 50% 42%, #e8ecf2, #c2cad6)' : 'transparent';
    };

    const icon = (cls: string, txt: string, title: string, onClick: () => void): HTMLElement => {
      const b = el('span', { class: `ck-ico ${cls}`, title }, [txt]);
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };

    const floatWin = (d: Device, head: HTMLElement): void => {
      d.win.addEventListener('pointerdown', () => { select(d); d.win.style.zIndex = String(front()); });
      head.addEventListener('pointerdown', (e) => {
        if ((e.target as HTMLElement).closest('.ck-ico, .ck-win-title, select')) return;
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

    // A small labelled <select> that doesn't start a window drag.
    const picker = (title: string, opts: Array<{ v: string; label: string }>, value: string,
                    onChange: (v: string) => void): HTMLSelectElement => {
      const sel = el('select', { class: 'ck-face-sel', title }) as HTMLSelectElement;
      for (const o of opts) sel.append(el('option', { value: o.v }, [o.label]));
      sel.value = value;
      sel.addEventListener('pointerdown', (e) => e.stopPropagation());
      sel.addEventListener('change', () => onChange(sel.value));
      return sel;
    };

    // ---- spawn a CLOCK window -----------------------------------------------
    const addClock = (zone: Zone = parseZone('LOCAL'), face: string = defaultFace, rect?: Rect, res?: Resolution): Device => {
      const norm = normFace(face);
      const startRes: Resolution = res ?? norm.res ?? 'hms';
      const title = el('div', { class: 'ck-win-title', title: 'Click to rename' }, [zone.label.toUpperCase()]);
      title.contentEditable = 'true';
      const cvs = el('canvas') as HTMLCanvasElement;
      const d: Device = { id: ++seq, kind: 'clock', win: el('div', { class: 'ck-win' }), title, zone, face: norm.face, res: startRes, cvs, g: ctx2d(cvs), state: {} };
      // Per-window pickers: zone offset · resolution · face.
      d.offsetSel = picker('Time zone offset', OFFSETS, offsetValue(zone), (v) => {
        d.zone = v === 'utc'
          ? { label: d.zone?.label ?? 'UTC', utc: true, offsetH: 0 }
          : { ...(d.zone ?? parseZone('LOCAL')), utc: false, offsetH: Number(v) };
      });
      d.resSel = picker('Resolution', RESOLUTIONS.map((r) => ({ v: r.id, label: r.label })), startRes, (v) => { d.res = v as Resolution; });
      d.faceSel = picker('Clock face', FACES.map((f) => ({ v: f.id, label: f.short })), norm.face, (v) => setDeviceFace(d, v));
      const head = el('div', { class: 'ck-win-head' }, [
        title, d.offsetSel, d.resSel, d.faceSel, icon('ck-x', '×', 'Close window', () => removeDevice(d)),
      ]);
      d.win.append(head, el('div', { class: 'ck-win-body' }, [cvs]));
      setDeviceFace(d, norm.face);
      title.addEventListener('input', () => {
        const txt = title.textContent ?? '';
        if (d.zone) d.zone = { ...d.zone, label: txt.trim() || d.zone.label };
      });
      floatWin(d, head);
      devices.push(d);
      stage.appendChild(d.win);
      setRect(d, rect ?? [12 + (devices.length % 4) * 200, 12 + Math.floor(devices.length / 4) * 30, 200, 200]);
      d.win.style.zIndex = String(front());
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
      const d: Device = { id: ++seq, kind: 'date', win, title, cells, dateEl: dateBody };
      floatWin(d, head);
      devices.push(d);
      stage.appendChild(win);
      setRect(d, rect ?? [12, 12, 300, 120]);
      win.style.zIndex = String(front());
      publishCount();
      return d;
    };

    // ---- layout presets -----------------------------------------------------
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
        else cols = clocks.length;
        const size = Math.max(140, Math.min(300, Math.floor((W - PAD * (cols + 1)) / cols)));
        clocks.forEach((d, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          setRect(d, [PAD + c * (size + PAD), TOP + r * (size + PAD), size, size]);
        });
        const rows = Math.ceil(clocks.length / cols);
        dateY = TOP + rows * (size + PAD);
      }
      dates.forEach((d, i) => setRect(d, [PAD + i * 312, dateY, 300, 110]));
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

    const faceBtns = FACES.map((f) => {
      const b = el('button', { class: `ck-btn${f.id === defaultFace ? ' on' : ''}` }, [f.label]);
      b.addEventListener('click', () => setFace(f.id));
      return { id: f.id, b };
    });
    const setFace = (f: string, publish = true): void => {
      defaultFace = f;
      for (const d of devices) if (d.kind === 'clock') setDeviceFace(d, f);
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

    // ---- saved layouts ------------------------------------------------------
    interface SceneItem { kind: 'clock' | 'date'; label: string; face?: string; res?: Resolution; utc?: boolean; offsetH?: number; rect: Rect; }
    const LS_KEY = 'twistClockLayouts';
    const loadSaved = (): Record<string, SceneItem[]> => {
      try { return (JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Record<string, SceneItem[]>) || {}; } catch { return {}; }
    };
    const persistSaved = (): void => { try { localStorage.setItem(LS_KEY, JSON.stringify(savedLayouts)); } catch { /* ignore */ } };
    let savedLayouts = loadSaved();
    const captureScene = (): SceneItem[] => devices.map((d) => ({
      kind: d.kind,
      label: d.kind === 'clock' ? (d.zone?.label ?? 'LOCAL') : 'DATE',
      face: d.face,
      res: d.res,
      utc: d.zone?.utc,
      offsetH: d.zone?.offsetH,
      rect: [d.win.offsetLeft, d.win.offsetTop, d.win.offsetWidth, d.win.offsetHeight],
    }));
    const applyScene = (items: SceneItem[]): void => {
      [...devices].forEach(removeDevice);
      for (const it of items) {
        if (it.kind === 'date') { addDate(it.rect); continue; }
        const base = parseZone(it.label);
        const zone: Zone = { label: it.label || base.label, utc: it.utc ?? base.utc, offsetH: it.offsetH ?? base.offsetH };
        addClock(zone, it.face ?? defaultFace, it.rect, it.res);
      }
    };
    const savedRow = el('div', { class: 'ck-saved' });
    const renderSaved = (): void => {
      savedRow.replaceChildren();
      const names = Object.keys(savedLayouts);
      if (!names.length) { savedRow.append(el('span', { class: 'ck-empty' }, ['none yet'])); return; }
      for (const name of names) {
        const b = el('button', { class: 'ck-btn on', title: 'Click to load · Alt-click to delete' }, [name]);
        b.addEventListener('click', (e) => {
          if ((e as MouseEvent).altKey) { delete savedLayouts[name]; persistSaved(); renderSaved(); return; }
          const items = savedLayouts[name]; if (items) applyScene(items);
        });
        savedRow.append(b);
      }
    };
    const saveBtn = el('button', { class: 'ck-add' }, ['＋ Save Layout']);
    saveBtn.addEventListener('click', () => {
      const name = (prompt('Save current layout as a preset:', `Layout ${Object.keys(savedLayouts).length + 1}`) || '').trim();
      if (!name) return;
      savedLayouts = { ...savedLayouts, [name]: captureScene() };
      persistSaved();
      renderSaved();
    });
    renderSaved();

    const grp = (label: string, ...kids: HTMLElement[]): HTMLElement =>
      el('div', { class: 'ck-grp' }, [el('div', { class: 'ck-grp-lbl' }, [label]), el('div', { class: 'ck-grp-row' }, kids)]);

    host.append(el('div', { class: 'ck' }, [
      el('div', { class: 'ck-bar' }, [
        grp('Add', addClockBtn, addDateBtn),
        grp('Face (all)', el('div', { class: 'ck-seg' }, faceBtns.map((x) => x.b))),
        grp('Preset', el('div', { class: 'ck-seg' }, presetBtns.map((x) => x.b))),
        grp('Layouts', saveBtn, savedRow),
        grp('Canvas', el('span', { class: 'ck-hint' }, ['each window has its own zone · resolution · face · drag a header to move · corner to scale · × to close'])),
      ]),
      stage,
    ]));

    // ---- seed from the routed zones + a date window, then tile --------------
    for (const z of deriveZones(ctx.sources)) addClock(z, defaultFace);
    addDate();
    applyPreset('row');
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
    ctx.services.onParam?.('face', (v) => { if (hasFace(String(v))) setFace(String(v), false); });
    ctx.services.onParam?.('preset', (v) => { if (PRESET_NAMES.some((p) => p.name === v)) applyPreset(String(v)); });
    ctx.services.publishParam?.('face', defaultFace, { throttle: false });
    ctx.services.publishParam?.('preset', activePreset, { throttle: false });
    publishCount();

    // ---- paint loop ---------------------------------------------------------
    let lastDate = '';
    const paintDate = (cells: NonNullable<Device['cells']>): void => {
      const d = dateParts();
      const key = `${d.yyyy}${d.mm}${d.dd}${d.day}`;
      if (key === lastDate && cells.yyyy.textContent) return;
      lastDate = key;
      cells.yyyy.textContent = d.yyyy; cells.mm.textContent = d.mm; cells.dd.textContent = d.dd; cells.day.textContent = d.day;
    };
    const drawFace = (d: Device, now: number): void => {
      const cvs = d.cvs, g = d.g;
      if (!cvs || !g) return;
      const cw = cvs.clientWidth, ch = cvs.clientHeight;
      if (!cw || !ch) return;
      const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
      if (cvs.width !== bw) cvs.width = bw;
      if (cvs.height !== bh) cvs.height = bh;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, bw, bh);
      const def = faceById(d.face ?? defaultFace);
      const [fw, fh] = def.fit;
      const S = Math.max(40, Math.min(cw / fw, ch / fh));
      const ox = (cw - S) / 2, oy = (ch - S) / 2;
      g.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
      def.draw(g, S, { z: d.zone as Zone, now, res: d.res ?? 'hms', state: (d.state ??= {}) });
    };

    ctx.dispose.raf(() => {
      const now = performance.now();
      if (!laidOut && stage.clientWidth > 0) { laidOut = true; applyPreset(activePreset); }
      let dateSeen = false;
      for (const d of devices) {
        if (d.kind === 'date') {
          if (d.cells) { if (dateSeen) lastDate = ''; paintDate(d.cells); dateSeen = true; }
          if (d.dateEl) {
            const w = d.dateEl.clientWidth, h = d.dateEl.clientHeight;
            if (w && h) d.dateEl.style.setProperty('--vf', `${Math.max(11, Math.min(h * 0.34, w * 0.09))}px`);
          }
          continue;
        }
        drawFace(d, now);
      }
    });
  },
};

export default plugin;
