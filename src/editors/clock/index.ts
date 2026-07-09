// src/editors/clock — the CLOCK / TIME GENERATOR editor (a graphics source).
//
// Opened when a WORLD CLOCKS feed (extraClass:"clock-source") is routed onto a twist,
// or a twist is literally named "Clock".
//
// A free-form "clock bench": every clock and the date read-out is an independent
// WINDOW you can drag-move, resize, close, or spawn more of. Each clock window carries
// its own ZONE (auto-detected local, or any entry from the world UTC-offset catalogue in
// the header dropdown — all offsets are absolute, so every clock reads a real wall time),
// RESOLUTION
// (HH:MM → HH:MM:SS → +frames), and FACE. Faces live one-per-file under faces/ and are
// collected here with import.meta.glob — adding a face is "drop a file in faces/".
// Layout PRESETS re-tile every window; the stage is a resizable canvas.
//
// The window model, tiling/scene presets, stylesheet and paint loop live in sibling
// modules (windows/layouts/paint/styles); index keeps the face registry, toolbar,
// seed/MQTT wiring and the rAF glue.

import { VOICE_COMMANDS } from './VOICE.js';
import type { EditorPlugin } from '../types.js';
import { el, addStyles } from '../../ui/dom.js';
import {
  type Resolution, type FaceDef,
  deriveZones, detectZoneIdx,
} from './faces/shared.js';
import { CSS } from './styles.js';
import { createWindows, type ClockCtx, type Device } from './windows.js';
import { createLayouts } from './layouts.js';
import { createPaint } from './paint.js';

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

const plugin: EditorPlugin = {
  id: 'clock',
  title: 'CLOCK · TIME GENERATOR',
  order: 8,
  blurb: 'Broadcast clock bench — spawn, drag-move, resize and close clock + date windows on a canvas; each carries its own world time zone (auto-detected local + a full UTC-offset catalogue), resolution (HH:MM → :SS → +frames) and face (digital, LED ring, analog, flip, Big Ben, Clasio, Time-Extreme, Cat).',
  match: (n) => /\bclock\b/i.test(n),
  voiceCommands: VOICE_COMMANDS,
  render(host, ctx) {
    addStyles('twist-editor-clock', CSS);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // The catalogue index the operator is in right now — the "◉ here" default + marker.
    const detectedIdx = detectZoneIdx();

    const stage = el('div', { class: 'ck-stage' });
    const devices: Device[] = [];

    let layouts: any = null;
    let suppressPublish = false;

    // Shared render context handed to every sibling builder.
    const C: ClockCtx = {
      host, stage, devices, dpr, detectedIdx,
      FACES, faceById, normFace,
      defaultFace: DEFAULT_FACE,
      activePreset: 'row',
      publishCount: () => {
        if (suppressPublish) return;
        ctx.services.publishParam?.('clocks', devices.filter((d) => d.kind === 'clock').length, { throttle: false });
        if (layouts) {
          ctx.services.publishParam?.('layout', JSON.stringify(layouts.captureScene()));
          ctx.services.publishParam?.('saved_layouts', JSON.stringify(layouts.getSavedLayouts()));
        }
      },
      syncPresetBtns: () => { /* wired below once the toolbar buttons exist */ },
    };

    const w = createWindows(C);
    layouts = createLayouts(C, w);
    const applyPreset = layouts.applyPreset;

    ctx.services.onParam?.('layout', (v) => {
      if (typeof v !== 'string') return;
      try {
        const scene = JSON.parse(v);
        suppressPublish = true;
        layouts.applyScene(scene);
        suppressPublish = false;
      } catch (e) { /* ignore */ }
    });
    ctx.services.onParam?.('saved_layouts', (v) => {
      if (typeof v !== 'string') return;
      try {
        const saved = JSON.parse(v);
        suppressPublish = true;
        layouts.setSavedLayouts(saved);
        suppressPublish = false;
      } catch (e) { /* ignore */ }
    });

    // ---- toolbar ------------------------------------------------------------
    const addClockBtn = el('button', { class: 'ck-add' }, ['＋ Clock']);
    addClockBtn.addEventListener('click', () => { w.addClock(); applyPreset(C.activePreset); });
    const addDateBtn = el('button', { class: 'ck-add' }, ['＋ Date']);
    addDateBtn.addEventListener('click', () => { w.addDate(); applyPreset(C.activePreset); });

    const faceBtns = FACES.map((f) => {
      const b = el('button', { class: `ck-btn${f.id === C.defaultFace ? ' on' : ''}` }, [f.label]);
      b.addEventListener('click', () => setFace(f.id));
      return { id: f.id, b };
    });
    const setFace = (f: string, publish = true): void => {
      C.defaultFace = f;
      for (const d of devices) if (d.kind === 'clock') w.setDeviceFace(d, f);
      faceBtns.forEach((x) => x.b.classList.toggle('on', x.id === f));
      if (publish) ctx.services.publishParam?.('face', f, { throttle: false });
    };

    const PRESET_NAMES: Array<{ name: string; label: string }> = [
      { name: 'row', label: '▭ Row' }, { name: 'grid', label: '▦ Grid' }, { name: 'column', label: '▯ Column' },
    ];
    const presetBtns = PRESET_NAMES.map((p) => {
      const b = el('button', { class: `ck-btn${p.name === C.activePreset ? ' on' : ''}` }, [p.label]);
      b.addEventListener('click', () => { applyPreset(p.name); ctx.services.publishParam?.('preset', p.name, { throttle: false }); });
      return { name: p.name, b };
    });
    C.syncPresetBtns = (name) => presetBtns.forEach((x) => x.b.classList.toggle('on', x.name === name));

    const grp = (label: string, ...kids: HTMLElement[]): HTMLElement =>
      el('div', { class: 'ck-grp' }, [el('div', { class: 'ck-grp-lbl' }, [label]), el('div', { class: 'ck-grp-row' }, kids)]);

    host.append(el('div', { class: 'ck' }, [
      el('div', { class: 'ck-bar' }, [
        grp('Add', addClockBtn, addDateBtn),
        grp('Face (all)', el('div', { class: 'ck-seg' }, faceBtns.map((x) => x.b))),
        grp('Preset', el('div', { class: 'ck-seg' }, presetBtns.map((x) => x.b))),
        grp('Layouts', layouts.saveBtn, layouts.savedRow),
        grp('Canvas', el('span', { class: 'ck-hint' }, ['each window has its own zone · resolution · face · drag a header to move · corner to scale · × to close'])),
      ]),
      stage,
    ]));

    // ---- seed from the routed zones + a date window, then tile --------------
    for (const z of deriveZones(ctx.sources)) w.addClock(z, C.defaultFace);
    w.addDate();
    applyPreset('row');
    let laidOut = stage.clientWidth > 0;

    // ---- MQTT: default face + preset are the wall-level, R/W controls -------
    ctx.services.advertiseParams?.([
      { name: 'face', type: 'string', writable: true },
      { name: 'preset', type: 'string', writable: true },
      { name: 'clocks', type: 'number' },
      { name: 'layout', type: 'string', writable: true },
      { name: 'saved_layouts', type: 'string', writable: true },
    ]);
    ctx.services.onParam?.('face', (v) => { if (hasFace(String(v))) setFace(String(v), false); });
    ctx.services.onParam?.('preset', (v) => { if (PRESET_NAMES.some((p) => p.name === v)) applyPreset(String(v)); });
    ctx.services.publishParam?.('face', C.defaultFace, { throttle: false });
    ctx.services.publishParam?.('preset', C.activePreset, { throttle: false });
    C.publishCount();

    // ---- paint loop ---------------------------------------------------------
    const paint = createPaint(C);
    ctx.dispose.raf(() => {
      const now = performance.now();
      if (!laidOut && stage.clientWidth > 0) { laidOut = true; applyPreset(C.activePreset); }
      let dateSeen = false;
      for (const d of devices) {
        if (d.kind === 'date') {
          if (d.cells) { if (dateSeen) paint.resetDateCache(); paint.paintDate(d.cells); dateSeen = true; }
          if (d.dateEl) {
            const dw = d.dateEl.clientWidth, dh = d.dateEl.clientHeight;
            if (dw && dh) d.dateEl.style.setProperty('--vf', `${Math.max(11, Math.min(dh * 0.34, dw * 0.09))}px`);
          }
          continue;
        }
        paint.drawFace(d, now);
      }
    });
  },
};

export default plugin;
