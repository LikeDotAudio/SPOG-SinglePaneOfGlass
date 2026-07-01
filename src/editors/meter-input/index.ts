// src/editors/meter-input — Meter Input test tool with REAL video/audio scopes.
//
// Route any source into the METER INPUT twist (TEST TOOLS) and it becomes a bench
// of measurement instruments running on ACTUAL pixels + audio — not synthetic state.
// Pick a source for the ANALYZED SOURCE: Test Pattern (offline), Capture Tab
// (getDisplayMedia — scope any tab/window incl. a playing clip), Load File, or a
// CORS media URL. A cross-origin <iframe> can't be scoped directly (tainted canvas)
// — Capture Tab sidesteps that.
//
// Each scope card starts in a default spot, then drag-moves (header) + resizes
// (corner). Loudness reuses ui/loudness.ts; the audio scope shows L / R / L+R.

import type { EditorPlugin } from '../types.js';
import { el, qs } from '../../ui/dom.js';
import { createLoudnessTracker, drawLoudnessPlot } from '../../ui/loudness.js';
import { injectMeterInputStyles } from './styles.js';
import {
  createLiveInput, drawParadeReal, drawWaveReal, drawVectorReal, drawScope3, drawMetersReal, drawVUpair,
  type PeakState,
} from './live-input.js';

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// A card gets a starting position/size, then becomes drag-move (via its header)
// and resize (native corner handle) — the operator lays the bench out to taste.
function floatCard(card: HTMLElement, x: number, y: number, w: number, h: number, bringToFront: () => number): void {
  Object.assign(card.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, margin: '0', resize: 'both', overflow: 'hidden' });
  const handle = card.querySelector<HTMLElement>('h4');
  if (!handle) return;
  handle.style.cursor = 'move'; handle.style.userSelect = 'none';
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, ox = card.offsetLeft, oy = card.offsetTop;
    card.style.zIndex = String(bringToFront());
    const move = (ev: PointerEvent): void => { card.style.left = `${Math.max(0, ox + ev.clientX - sx)}px`; card.style.top = `${Math.max(0, oy + ev.clientY - sy)}px`; };
    const up = (): void => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
}

const plugin: EditorPlugin = {
  id: 'meter-input',
  title: 'METER INPUT · REAL-VIDEO TEST TOOLS',
  order: 10,
  match: (n) => /meter\s*input/i.test(n),
  render(host, ctx) {
    injectMeterInputStyles();

    const srcChips = ctx.sources.length
      ? ctx.sources.map((s) => el('span', { class: 'mi-src', style: `border-color:${s.color}` }, [s.label]))
      : [el('span', { class: 'mi-src empty' }, ['no source routed — pick one below'])];

    const bBars = el('button', { class: 'mi-btn on' }, ['▦ Test Pattern']);
    const bCap = el('button', { class: 'mi-btn' }, ['⧉ Capture Tab']);
    const bFile = el('button', { class: 'mi-btn' }, ['▶ Load File']);
    const url = el('input', { class: 'mi-url', type: 'text', placeholder: '…CORS .mp4/.webm URL' });
    const bUrl = el('button', { class: 'mi-btn' }, ['Load URL']);
    const file = el('input', { type: 'file', accept: 'video/*', style: 'display:none' });
    const stat = el('span', { class: 'mi-stat' }, ['source: test pattern']);

    const li = createLiveInput();
    li.video.className = 'mi-vid';
    li.video.controls = true;

    const scope = (tag: string, hClass: string, canvasClass: string): HTMLElement =>
      el('div', { class: `mi-scope ${hClass}` }, [el('span', { class: 'mi-tag' }, [tag]), el('canvas', { class: canvasClass })]);

    const cardVideo = el('div', { class: 'mi-vidcard' }, [el('h4', {}, ['Analyzed Source (what the scopes read)']), li.video]);
    const cardParade = el('div', { class: 'mi-card' }, [el('h4', {}, ['RGB Parade · IRE']), scope('R · G · B', '', 'c-parade')]);
    const cardWave = el('div', { class: 'mi-card' }, [el('h4', {}, ['Luma Waveform']), scope("Y'", '', 'c-wave')]);
    const cardVec = el('div', { class: 'mi-card' }, [el('h4', {}, ['Vectorscope']), scope('', '', 'c-vec')]);
    const cardAud = el('div', { class: 'mi-card' }, [el('h4', {}, ['Audio Oscilloscope · L / R / L+R']), scope('', '', 'c-aud')]);
    const cardMeter = el('div', { class: 'mi-card' }, [el('h4', {}, ['Meters · L / R dBFS']), scope('', '', 'c-meter')]);
    const cardVU = el('div', { class: 'mi-card' }, [el('h4', {}, ['VU · Analog']), scope('', '', 'c-vu')]);
    const cardLoud = el('div', { class: 'mi-card' }, [
      el('h4', {}, ['Loudness Over Time · ITU-R BS.1770']),
      el('div', { class: 'mi-loudrow' }, [
        el('div', { class: 'mi-lufs' }, [el('span', { class: 'lufs-v' }, ['-∞']), el('small', {}, ['LUFS'])]),
        el('div', { class: 'mi-scope', style: 'flex:1' }, [el('canvas', { class: 'c-loud' })]),
      ]),
    ]);
    // The video is a floating card too (first → painted behind), so scopes/meters
    // can be dragged on top of it, or the video moved + resized.
    const grid = el('div', { class: 'mi-grid' }, [cardVideo, cardParade, cardWave, cardVec, cardAud, cardMeter, cardVU, cardLoud]);

    host.append(el('div', { class: 'mi' }, [
      el('div', { class: 'mi-bar' }, [
        el('span', { class: 'mi-src', style: 'border-color:#6FC8F0' }, ['INPUT UNDER TEST']),
        ...srcChips, bBars, bCap, bFile, url, bUrl, file, stat,
      ]),
      grid,
    ]));

    // Starting layout — then each card is drag-movable (header) + resizable (corner).
    let zTop = 10;
    const front = (): number => ++zTop;
    ([
      [cardVideo, 330, 0, 600, 340],
      [cardParade, 0, 0, 320, 235], [cardWave, 0, 245, 320, 235], [cardVec, 940, 0, 300, 290],
      [cardAud, 330, 350, 300, 220], [cardMeter, 640, 350, 300, 220], [cardVU, 0, 490, 320, 210], [cardLoud, 940, 300, 400, 190],
    ] as Array<[HTMLElement, number, number, number, number]>).forEach(([c, x, y, w, h]) => floatCard(c, x, y, w, h, front));

    const cParade = qs<HTMLCanvasElement>(host, '.c-parade');
    const cWave = qs<HTMLCanvasElement>(host, '.c-wave');
    const cVec = qs<HTMLCanvasElement>(host, '.c-vec');
    const cAud = qs<HTMLCanvasElement>(host, '.c-aud');
    const cMeter = qs<HTMLCanvasElement>(host, '.c-meter');
    const cVU = qs<HTMLCanvasElement>(host, '.c-vu');
    const cLoud = qs<HTMLCanvasElement>(host, '.c-loud');
    const lufsEl = qs<HTMLElement>(host, '.lufs-v');

    const setStat = (t: string, warn = false): void => { stat.textContent = t; stat.style.color = warn ? '#ff6a6a' : '#e6a13a'; };
    bBars.addEventListener('click', () => { li.useBars(); bBars.classList.add('on'); setStat('source: test pattern'); });
    bCap.addEventListener('click', () => {
      li.captureTab().then(() => { bBars.classList.remove('on'); setStat('source: captured tab (real pixels + audio)'); })
        .catch((e: Error) => setStat('capture cancelled: ' + e.message, true));
    });
    bFile.addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files?.[0]; if (!f) return;
      li.useMedia(URL.createObjectURL(f), false).then(() => { bBars.classList.remove('on'); setStat('source: file · ' + f.name); })
        .catch((e: Error) => setStat('load failed: ' + e.message, true));
    });
    bUrl.addEventListener('click', () => {
      const u = url.value.trim(); if (!u) return;
      li.useMedia(u, true).then(() => { bBars.classList.remove('on'); setStat('source: url'); })
        .catch((e: Error) => setStat('load failed: ' + e.message, true));
    });

    const peak: PeakState = { l: 0, r: 0 };
    const vu = { l: -60, r: -60 };   // ballistic-smoothed dBFS for the analog needles
    const loudness = createLoudnessTracker({ start: -23 });
    let last = 0;
    const fit = (cv: HTMLCanvasElement): void => { if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; } };

    ctx.dispose.raf(() => {
      [cParade, cWave, cVec, cAud, cMeter, cVU, cLoud].forEach(fit);
      const now = performance.now();
      if (li.grab(now) && now - last > 33) {
        last = now;
        const d = li.analyze();
        if (d) { drawParadeReal(cParade, d); drawWaveReal(cWave, d.yMin, d.yMax, d.AW); drawVectorReal(cVec, d.pts); }
        else if (li.isTainted()) setStat('cross-origin source without CORS — use Capture Tab or Load File', true);
      }
      drawScope3(cAud, li.timeDataL(), li.timeDataR(), li.timeData());
      const dbL = li.rmsL(), dbR = li.rmsR();
      drawMetersReal(cMeter, dbL, dbR, peak);
      vu.l += (dbL - vu.l) * 0.08; vu.r += (dbR - vu.r) * 0.08;   // ~300ms VU ballistics
      drawVUpair(cVU, vu.l, vu.r);
      const mix = 10 * Math.log10((Math.pow(10, dbL / 10) + Math.pow(10, dbR / 10)) / 2 || 1e-9);
      loudness.update(clamp((mix + 60) / 60, 0, 1));
      lufsEl.textContent = loudness.lufs > -70 ? loudness.lufs.toFixed(1) : '-∞';
      drawLoudnessPlot(cLoud, loudness.history);
    });

    ctx.dispose.add(() => li.stop());
  },
};

export default plugin;
