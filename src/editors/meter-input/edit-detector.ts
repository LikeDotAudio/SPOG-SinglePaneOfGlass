// src/editors/meter-input/edit-detector — average luminance + luma-histogram
// frame-differencing scene-cut detector. Split from index.ts: all the per-frame
// diff state + math, plus the AVG/LOW/HIGH/count/tempo readouts and the edit log.
import { el } from '../../ui/dom.js';
import type { FrameData, LiveInput } from './live-input.js';

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export interface EditDetectorRefs {
  luminBar: HTMLElement; luminVal: HTMLElement; luminMin: HTMLElement; luminMax: HTMLElement;
  luminCount: HTMLElement; luminTempo: HTMLElement; editList: HTMLElement; editCountEl: HTMLElement;
}

export interface EditDetector {
  reset(): void;
  feed(d: FrameData, now: number, editSens: number): void;
  count(): number;
  tempo(): number;
  luma(): number;
}

// A big frame-to-frame change in the global luma histogram = a scene cut, which
// we log with a timestamp. `editSens` (the SENS pills) sets how big a jump counts.
export function createEditDetector(li: LiveInput, refs: EditDetectorRefs): EditDetector {
  const { luminBar, luminVal, luminMin, luminMax, luminCount, luminTempo, editList, editCountEl } = refs;
  let prevG: Float32Array | null = null;   // previous frame's normalised luma histogram
  let editStart = performance.now();        // fallback clock when the source has no timeline
  let lastCutT = -1, editCount = 0, curLuma = 0;
  let luMin = 101, luMax = -1;              // running lowest / highest average luminance
  // Random SPATIAL sample: a stable set of random columns whose per-column mean luma
  // we track frame-to-frame. Catches transitions the global histogram misses (a cut
  // between shots of similar overall brightness but different content).
  let sampleCols: number[] | null = null;
  let prevSample: Float32Array | null = null;
  const editTimes: number[] = [];           // source-time (s) of recent cuts → tempo
  const srcTime = (now: number): number => {
    const m = li.mode();
    if ((m === 'media' || m === 'stream') && isFinite(li.video.currentTime) && li.video.currentTime > 0) return li.video.currentTime;
    return (now - editStart) / 1000;   // test pattern / no timeline → elapsed wall time
  };
  const utcClock = (): string => `${new Date().toISOString().slice(11, 19)} UTC`;   // HH:MM:SS time-of-day
  const editTempo = (): number => {
    if (editTimes.length < 2) return 0;
    const span = (editTimes[editTimes.length - 1] ?? 0) - (editTimes[0] ?? 0);
    return span > 0 ? 60 * (editTimes.length - 1) / span : 0;   // cuts per minute
  };
  const reset = (): void => {
    prevG = null; prevSample = null; lastCutT = -1; editCount = 0; editStart = performance.now(); editTimes.length = 0;
    luMin = 101; luMax = -1;
    editList.replaceChildren(el('div', { class: 'mi-edit-empty' }, ['watching for edits…']));
    editCountEl.textContent = '0 events'; luminCount.textContent = '0'; luminTempo.textContent = '0.0';
    luminMin.textContent = '—'; luminMax.textContent = '—';
  };
  const addEdit = (t: number, luma: number): void => {
    editCount++; editTimes.push(t); if (editTimes.length > 40) editTimes.shift();
    if (editCount === 1) editList.replaceChildren();   // drop the "watching…" placeholder
    editList.insertBefore(el('div', { class: 'mi-edit-row' }, [
      el('span', { class: 'dot' }, ['●']), el('span', {}, ['Edit here']),
      el('span', { class: 't' }, [utcClock()]), el('span', { class: 'l' }, [`${luma.toFixed(0)}%`]),
    ]), editList.firstChild);   // newest on top
    editCountEl.textContent = `${editCount} event${editCount === 1 ? '' : 's'}`;
    luminCount.textContent = String(editCount);
  };

  // Edit detector: collapse the per-column luma histogram to one global one,
  // read its mean (AVG %), then compare to the previous frame — a big shift = cut.
  const feed = (d: FrameData, now: number, editSens: number): void => {
    const BINS = d.BINS, AWc = d.AW, g = new Float32Array(BINS);
    for (let x = 0; x < AWc; x++) { const base = x * BINS; for (let bin = 0; bin < BINS; bin++) g[bin] = (g[bin] ?? 0) + (d.yH[base + bin] ?? 0); }
    let tot = 0; for (let i = 0; i < BINS; i++) tot += g[i] ?? 0;
    let mean = 0;
    if (tot > 0) for (let i = 0; i < BINS; i++) { g[i] = (g[i] ?? 0) / tot; mean += (i / (BINS - 1)) * (g[i] ?? 0); }
    mean *= 100; curLuma = mean;
    let diff = 0;
    if (prevG) { for (let i = 0; i < BINS; i++) diff += Math.abs((g[i] ?? 0) - (prevG[i] ?? 0)); diff *= 0.5; }
    prevG = g;
    // Random spatial sampling: per-column mean luma over a stable random column
    // set → a spatial change metric that fires on cuts the histogram alone misses.
    if (!sampleCols) { sampleCols = []; for (let i = 0; i < 48; i++) sampleCols.push(Math.floor(Math.random() * AWc)); }
    const cur = new Float32Array(sampleCols.length);
    let sDiff = 0;
    for (let si = 0; si < sampleCols.length; si++) {
      const base = (sampleCols[si] ?? 0) * BINS; let ct = 0, sum = 0;
      for (let bin = 0; bin < BINS; bin++) { const cnt = d.yH[base + bin] ?? 0; ct += cnt; sum += cnt * (bin / (BINS - 1)); }
      const m = ct > 0 ? sum / ct : 0; cur[si] = m;
      if (prevSample) sDiff += Math.abs(m - (prevSample[si] ?? 0));
    }
    if (prevSample) sDiff /= sampleCols.length;   // 0..1 spatial change
    prevSample = cur;
    luMin = Math.min(luMin, mean); luMax = Math.max(luMax, mean);
    luminBar.style.width = `${clamp(mean, 0, 100)}%`;
    luminVal.textContent = `${mean.toFixed(1)}%`;
    luminMin.textContent = `${luMin.toFixed(1)}%`; luminMax.textContent = `${luMax.toFixed(1)}%`;
    const st = srcTime(now);
    const change = Math.max(diff, sDiff);   // histogram OR spatial transition
    if (change > editSens && st - lastCutT > 0.4) { lastCutT = st; addEdit(st, mean); }   // 0.4s debounce
    luminTempo.textContent = editTempo().toFixed(1);
  };

  return { reset, feed, count: () => editCount, tempo: editTempo, luma: () => curLuma };
}
