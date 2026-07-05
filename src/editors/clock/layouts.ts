// src/editors/clock/layouts — window tiling PRESETS (row/grid/column) + saved
// layout SCENES (capture / recall / persist to localStorage). Extracted from
// index.ts (the 200-line split); createLayouts takes the shared context (C) plus
// the window spawners so applyScene can rebuild the live device set.

import { el } from '../../ui/dom.js';
import { type Resolution, type Zone, parseZone, ZONES, zoneIdxForOffset } from './faces/shared.js';
import type { ClockCtx, Rect, WindowsApi } from './windows.js';

interface SceneItem { kind: 'clock' | 'date'; label: string; face?: string; res?: Resolution; offsetMin?: number; rect: Rect; }

export interface LayoutsApi {
  applyPreset: (name: string) => void;
  saveBtn: HTMLElement;
  savedRow: HTMLElement;
}

export function createLayouts(C: ClockCtx, w: WindowsApi): LayoutsApi {
  const { host, stage, devices } = C;

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
        w.setRect(d, [PAD + c * (size + PAD), TOP + r * (size + PAD), size, size]);
      });
      const rows = Math.ceil(clocks.length / cols);
      dateY = TOP + rows * (size + PAD);
    }
    dates.forEach((d, i) => w.setRect(d, [PAD + i * 312, dateY, 300, 110]));
    const bottom = devices.reduce((mx, d) => Math.max(mx, d.win.offsetTop + d.win.offsetHeight), 0);
    stage.style.minHeight = `${Math.max(360, bottom + PAD)}px`;
    C.activePreset = name;
    C.syncPresetBtns(name);
  };

  // ---- saved layouts ------------------------------------------------------
  const LS_KEY = 'twistClockLayouts';
  const loadSaved = (): Record<string, SceneItem[]> => {
    try { return (JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Record<string, SceneItem[]>) || {}; } catch { return {}; }
  };
  const persistSaved = (): void => { try { localStorage.setItem(LS_KEY, JSON.stringify(savedLayouts)); } catch { /* ignore */ } };
  let savedLayouts = loadSaved();
  const captureScene = (): SceneItem[] => devices.map((d) => ({
    kind: d.kind,
    label: d.kind === 'clock' ? (d.zone?.label ?? 'UTC') : 'DATE',
    face: d.face,
    res: d.res,
    offsetMin: d.zone?.offsetMin,
    rect: [d.win.offsetLeft, d.win.offsetTop, d.win.offsetWidth, d.win.offsetHeight],
  }));
  const applyScene = (items: SceneItem[]): void => {
    [...devices].forEach(w.removeDevice);
    for (const it of items) {
      if (it.kind === 'date') { w.addDate(it.rect); continue; }
      const zone: Zone = it.offsetMin != null
        ? { label: it.label || ZONES[zoneIdxForOffset(it.offsetMin)]!.code, offsetMin: it.offsetMin }
        : parseZone(it.label);
      w.addClock(zone, it.face ?? C.defaultFace, it.rect, it.res);
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

  return { applyPreset, saveBtn, savedRow };
}
