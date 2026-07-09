// src/editors/clock/windows — the clock/date WINDOW devices: the free-floating
// draggable/resizable window model plus its spawners. Extracted verbatim from
// index.ts (the 200-line split); behaviour is unchanged. createWindows takes the
// shared render context (C) so the builders keep closing over the same live
// device list, stage and face registry that index owns.

import { el, ctx2d } from '../../ui/dom.js';
import {
  type Zone, type Resolution, type FaceState, type FaceDef,
  RESOLUTIONS, ZONES, zoneOf, offsetLabel, zoneIdxForOffset,
} from './faces/shared.js';

export type Rect = [number, number, number, number];

export interface Device {
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

/** Shared render context — the live state + face registry index owns, passed to
    every sibling builder so extracted functions keep closing over the same
    objects (devices list, stage, mutable defaultFace/activePreset). */
export interface ClockCtx {
  host: HTMLElement;
  stage: HTMLElement;
  devices: Device[];
  dpr: number;
  detectedIdx: number;
  FACES: FaceDef[];
  faceById: (id: string) => FaceDef;
  normFace: (id?: string) => { face: string; res?: Resolution };
  defaultFace: string;
  activePreset: string;
  publishCount: () => void;
  syncPresetBtns: (name: string) => void;
}

export interface WindowsApi {
  addClock: (zone?: Zone, face?: string, rect?: Rect, res?: Resolution) => Device;
  addDate: (rect?: Rect) => Device;
  removeDevice: (d: Device) => void;
  setRect: (d: Device, r: Rect) => void;
  setDeviceFace: (d: Device, f: string) => void;
}

export function createWindows(C: ClockCtx): WindowsApi {
  const { stage, devices } = C;
  let seq = 0;
  let zTop = 10;
  const front = (): number => ++zTop;
  let selected: Device | null = null;

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
    if (d.cvs) d.cvs.style.background = C.faceById(f).lightBg
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
    d.win.addEventListener('pointerup', () => C.publishCount());
    head.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.ck-ico, .ck-win-title, select')) return;
      e.preventDefault();
      head.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, ox = d.win.offsetLeft, oy = d.win.offsetTop;
      const move = (ev: PointerEvent): void => {
        d.win.style.left = `${Math.max(0, ox + ev.clientX - sx)}px`;
        d.win.style.top = `${Math.max(0, oy + ev.clientY - sy)}px`;
      };
      const up = (): void => { 
        head.removeEventListener('pointermove', move); 
        head.removeEventListener('pointerup', up); 
        C.publishCount();
      };
      head.addEventListener('pointermove', move); head.addEventListener('pointerup', up);
    });
  };

  const removeDevice = (d: Device): void => {
    const i = devices.indexOf(d);
    if (i >= 0) devices.splice(i, 1);
    d.win.remove();
    if (selected === d) selected = null;
    C.publishCount();
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
  const addClock = (zone: Zone = zoneOf(ZONES[C.detectedIdx]!), face: string = C.defaultFace, rect?: Rect, res?: Resolution): Device => {
    const norm = C.normFace(face);
    const startRes: Resolution = res ?? norm.res ?? 'hms';
    const title = el('div', { class: 'ck-win-title', title: 'Click to rename' }, [zone.label.toUpperCase()]);
    title.contentEditable = 'true';
    const cvs = el('canvas') as HTMLCanvasElement;
    const d: Device = { id: ++seq, kind: 'clock', win: el('div', { class: 'ck-win' }), title, zone, face: norm.face, res: startRes, cvs, g: ctx2d(cvs), state: {} };
    // Per-window pickers: time zone · resolution · face. The zone dropdown is the full
    // UTC-offset catalogue with the operator's detected zone marked "◉"; picking one
    // sets the absolute offset AND names the clock from the list.
    d.offsetSel = picker(
      'Time zone',
      ZONES.map((z, i) => ({ v: String(i), label: `${i === C.detectedIdx ? '◉ ' : ''}${offsetLabel(z.off)} · ${z.codes}` })),
      String(zoneIdxForOffset(zone.offsetMin)),
      (v) => {
        const def = ZONES[Number(v)];
        if (!def) return;
        d.zone = zoneOf(def);
        d.title.textContent = def.code;
      },
    );
    d.resSel = picker('Resolution', RESOLUTIONS.map((r) => ({ v: r.id, label: r.label })), startRes, (v) => { d.res = v as Resolution; });
    d.faceSel = picker('Clock face', C.FACES.map((f) => ({ v: f.id, label: f.short })), norm.face, (v) => setDeviceFace(d, v));
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
    C.publishCount();
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
    C.publishCount();
    return d;
  };

  return { addClock, addDate, removeDevice, setRect, setDeviceFace };
}
