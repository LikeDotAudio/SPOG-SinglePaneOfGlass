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
// The card DOM, layout presets, hover-help, hover probes and the edit detector
// live in sibling modules (cards / presets / help / hover-probes / edit-detector).

import type { EditorPlugin } from '../types.js';
import { el, qs } from '../../ui/dom.js';
import { createLoudnessTracker, drawLoudnessPlot } from '../../ui/loudness.js';
import { injectMeterInputStyles } from './styles.js';
import {
  createLiveInput, drawParadeReal, drawWaveReal, drawChromaReal, drawVectorReal, drawScope3, drawMetersReal, drawVUpair, drawGonio, drawRecorder,
  drawRGBOverlay, drawRGBStacked, drawCIE, drawDiamond, drawHSL,
  type PeakState, type FrameData,
} from './live-input.js';
import { createHoverLayer } from './hover.js';
import { buildCards, floatCard, HC } from './cards.js';
import { createPresets } from './presets.js';
import { attachHelp } from './help.js';
import { createEditDetector } from './edit-detector.js';
import { attachProbes } from './hover-probes.js';
import { buildToolbar } from './toolbar.js';
import { wireControls } from './controls.js';
import { wireWheelResize } from './resize.js';

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const plugin: EditorPlugin = {
  id: 'meter-input',
  title: 'METER INPUT · REAL-VIDEO TEST TOOLS',
  order: 10,
  match: (n) => /meter\s*input/i.test(n),
  render(host, ctx) {
    injectMeterInputStyles();

    const tb = buildToolbar();
    const { bar, sSub, sNorm, sHard } = tb;

    const li = createLiveInput();
    li.video.className = 'mi-vid';
    li.video.controls = true;

    const cards = buildCards(li.video, sSub, sNorm, sHard);
    const { cPreview, cardVideo, cardWave, luminBar, luminVal, luminMin, luminMax, luminCount, luminTempo, editList, editCountEl, bClear, grid, cardMap } = cards;

    host.append(el('div', { class: 'mi' }, [bar, grid]));

    // Each card is drag-movable (header) + resizable (corner); a LAYOUT PRESET
    // sets positions — Default, or bias the bench toward audio or video work.
    let zTop = 10;
    const front = (): number => ++zTop;
    const sens = { v: 0.35 };   // edit-detection threshold, set by the SENS pills (see ./controls)
    const { applyPreset, restoreCard } = createPresets(cardMap, front);
    for (const [key, card] of Object.entries(cardMap)) {
      card.style.setProperty('--hc', HC[key] ?? '#3a5573');
      floatCard(card, front, () => restoreCard(key));
    }

    // ── Hover-help on each card title + the whole-bench intro chip (see ./help) ──
    attachHelp(host, cardMap);

    const cParade = qs<HTMLCanvasElement>(host, '.c-parade');
    const cWave = qs<HTMLCanvasElement>(host, '.c-wave');
    const cChroma = qs<HTMLCanvasElement>(host, '.c-chroma');
    const cVec = qs<HTMLCanvasElement>(host, '.c-vec');
    const cAud = qs<HTMLCanvasElement>(host, '.c-aud');
    const cMeter = qs<HTMLCanvasElement>(host, '.c-meter');
    const cVU = qs<HTMLCanvasElement>(host, '.c-vu');
    const cGonio = qs<HTMLCanvasElement>(host, '.c-gonio');
    const cRec = qs<HTMLCanvasElement>(host, '.c-rec');
    const cRGBA = qs<HTMLCanvasElement>(host, '.c-rgba');
    const cStack = qs<HTMLCanvasElement>(host, '.c-stack');
    const cCIE = qs<HTMLCanvasElement>(host, '.c-cie');
    const cDiamond = qs<HTMLCanvasElement>(host, '.c-diamond');
    const cHSL = qs<HTMLCanvasElement>(host, '.c-hsl');
    const cLoud = qs<HTMLCanvasElement>(host, '.c-loud');
    const lufsEl = qs<HTMLElement>(host, '.lufs-v');

    // Each scope keeps a {z,px,py} view, now held at IDENTITY (the draw + hover code
    // still read it). The mouse WHEEL no longer zooms INTO the picture — it resizes
    // the scope's CARD (see ./resize).
    const mkView = (): { z: number; px: number; py: number } => ({ z: 1, px: 0, py: 0 });
    const views = { parade: mkView(), wave: mkView(), chroma: mkView(), vec: mkView(), gonio: mkView(), rgba: mkView(), stack: mkView(), cie: mkView(), diamond: mkView(), hsl: mkView() };
    wireWheelResize({ parade: cParade, chroma: cChroma, vec: cVec, gonio: cGonio, rgba: cRGBA, stack: cStack, cie: cCIE, diamond: cDiamond, hsl: cHSL, wave: cWave }, cardVideo);

    // ── Edit detector: average luminance + luma-histogram frame-differencing ──
    const editDetector = createEditDetector(li, { luminBar, luminVal, luminMin, luminMax, luminCount, luminTempo, editList, editCountEl });
    bClear.addEventListener('click', () => editDetector.reset());

    // Wire the control bar (presets · SENS · layout inspector · source buttons);
    // it returns setStat so the RAF can still surface source-status warnings.
    const setStat = wireControls({ host, li, editDetector, applyPreset, cardMap, sens, tb });

    const peak: PeakState = { l: 0, r: 0 };
    const vu = { l: -60, r: -60 };   // ballistic-smoothed dBFS for the analog needles
    const loudness = createLoudnessTracker({ start: -23 });
    const recL: number[] = [], recR: number[] = [], REC_SPAN = 600; let lastRec = 0;   // ~2 min at 200ms
    let last = 0;
    let lastFrame: FrameData | null = null;   // latest analyzed frame — for hover density readouts

    // Advertise this bench's measurements as read-only telemetry params (audit §4.5),
    // then publish them ~10 Hz over MQTT. No-op unless a broker is configured.
    ctx.services.advertiseParams?.([
      { name: 'loudness', type: 'number', unit: 'LUFS', writable: false },
      { name: 'rms_l', type: 'number', unit: 'dBFS', writable: false },
      { name: 'rms_r', type: 'number', unit: 'dBFS', writable: false },
      { name: 'peak_l', type: 'number', unit: 'dBFS', writable: false },
      { name: 'peak_r', type: 'number', unit: 'dBFS', writable: false },
      { name: 'avg_luma', type: 'number', unit: '%', writable: false },
      { name: 'edits', type: 'number', writable: false },
      { name: 'edit_tempo', type: 'number', unit: '/min', writable: false },
    ]);
    let lastPub = 0;
    const fit = (cv: HTMLCanvasElement): void => { if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; } };

    // ── Hover readout + right-click markers on every scope (see ./hover-probes) ──
    const hover = createHoverLayer();
    attachProbes(hover, {
      parade: cParade, wave: cWave, chroma: cChroma, vec: cVec, aud: cAud, meter: cMeter, vu: cVU, gonio: cGonio,
      rec: cRec, rgba: cRGBA, stack: cStack, cie: cCIE, diamond: cDiamond, hsl: cHSL, loud: cLoud,
    }, views, () => lastFrame);

    ctx.dispose.raf(() => {
      [cParade, cWave, cChroma, cVec, cAud, cMeter, cVU, cGonio, cRec, cRGBA, cStack, cCIE, cDiamond, cHSL, cLoud].forEach(fit);
      const now = performance.now();
      if (li.grab(now) && now - last > 33) {
        last = now;
        const d = li.analyze();
        if (d) {
          lastFrame = d;
          drawParadeReal(cParade, d, views.parade); drawWaveReal(cWave, d.yH, d.AW, d.BINS, '130,255,140', views.wave); drawVectorReal(cVec, d.pts, views.vec);
          drawChromaReal(cChroma, d.cH, d.AW, d.BINS, views.chroma);
          drawRGBOverlay(cRGBA, d, views.rgba); drawRGBStacked(cStack, d, views.stack); drawCIE(cCIE, d.pts, views.cie);
          drawDiamond(cDiamond, d.pts, views.diamond); drawHSL(cHSL, d.pts, views.hsl);
          editDetector.feed(d, now, sens.v);
        }
        else if (li.isTainted()) setStat('cross-origin source without CORS — use Capture Tab or Load File', true);
      }
      // Input Under Test: the canvas mirrors the offline test pattern; the <video>
      // element (real pixels only) is shown for captured tab / file / URL sources.
      const barsMode = li.mode() === 'bars';
      cPreview.style.display = barsMode ? 'block' : 'none';
      li.video.style.display = barsMode ? 'none' : 'block';
      if (barsMode) { fit(cPreview); li.paint(cPreview); }
      const tL = li.timeDataL(), tR = li.timeDataR();
      drawScope3(cAud, tL, tR, li.timeData());
      drawGonio(cGonio, tL, tR, views.gonio);
      const dbL = li.rmsL(), dbR = li.rmsR();
      drawMetersReal(cMeter, dbL, dbR, peak);
      vu.l += (dbL - vu.l) * 0.08; vu.r += (dbR - vu.r) * 0.08;   // ~300ms VU ballistics
      drawVUpair(cVU, vu.l, vu.r);
      if (now - lastRec > 200) {   // slow chart recorder: sample every 200ms
        lastRec = now;
        recL.push(dbL); recR.push(dbR);
        if (recL.length > REC_SPAN) recL.shift();
        if (recR.length > REC_SPAN) recR.shift();
      }
      drawRecorder(cRec, recL, recR, REC_SPAN);
      const mix = 10 * Math.log10((Math.pow(10, dbL / 10) + Math.pow(10, dbR / 10)) / 2 || 1e-9);
      loudness.update(clamp((mix + 60) / 60, 0, 1));
      lufsEl.textContent = loudness.lufs > -70 ? loudness.lufs.toFixed(1) : '-∞';
      drawLoudnessPlot(cLoud, loudness.history);
      if (ctx.services.publishParam && now - lastPub > 100) {
        lastPub = now;
        ctx.services.publishParam('loudness', loudness.lufs > -70 ? +loudness.lufs.toFixed(1) : null);
        ctx.services.publishParam('rms_l', +dbL.toFixed(1));
        ctx.services.publishParam('rms_r', +dbR.toFixed(1));
        ctx.services.publishParam('peak_l', +peak.l.toFixed(1));
        ctx.services.publishParam('peak_r', +peak.r.toFixed(1));
        ctx.services.publishParam('avg_luma', +editDetector.luma().toFixed(1));
        ctx.services.publishParam('edits', editDetector.count());
        ctx.services.publishParam('edit_tempo', +editDetector.tempo().toFixed(1));
      }
      // The luma waveform tracks the video feed's WIDTH + horizontal position so
      // each column reads directly against the picture (a real waveform monitor).
      cardWave.style.left = `${cardVideo.offsetLeft}px`;
      cardWave.style.width = `${cardVideo.offsetWidth}px`;
      // Keep the waveform canvas backing matched to its (video-locked) display width
      // so it stays crisp when the video/waveform pair is wheel-resized.
      if (cWave.clientWidth && cWave.width !== cWave.clientWidth) cWave.width = cWave.clientWidth;
      if (cWave.clientHeight && cWave.height !== cWave.clientHeight) cWave.height = cWave.clientHeight;
      hover.sync();   // keep right-click markers pinned as the card resizes
    });

    ctx.dispose.add(() => { li.stop(); hover.dispose(); });
  },
};

export default plugin;
