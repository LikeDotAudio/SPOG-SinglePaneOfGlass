// src/editors/multi-viewer/panes — the wall's tile builders.
//
// Two pane faces: fullWin (a framed tile with tally, screen, editable UMD and a
// side/VU meter, drag-reorderable) and compactWin (a chromeless tile for the
// dense 8×8 / 16×16 walls). Both are closure-coupled to the render state, so
// createPanes() takes that state as an explicit dep bag rather than a closure.

import type { Disposer } from '../../ui/timers.js';
import { el } from '../../ui/dom.js';
import { vuBank, meterBar } from './meters.js';

export type Tally = 'pgm' | 'pvw' | 'off';
export interface Win {
  label: string;
  color: string;
  tally: Tally;
  /** An AUDIO GROUP pane: one multiviewer window carrying n channel VU meters
   *  (a routed stagebox/audio bundle occupies ONE pane, never one per channel). */
  channels?: string[];
}

export const next = (t: Tally): Tally => (t === 'off' ? 'pgm' : t === 'pgm' ? 'pvw' : 'off');

export interface PaneDeps {
  wins: Win[];
  dispose: Disposer;
  getPreset: () => string;
  redraw: () => void;
  publishSource: (i: number, opts?: { throttle: boolean }) => void;
  publishTally: (i: number) => void;
  publishAllPanes: () => void;
}

export interface Panes {
  fullWin: (w: Win, i: number) => HTMLElement;
  compactWin: (w: Win | undefined) => HTMLElement;
}

export function createPanes(d: PaneDeps): Panes {
  const { wins, dispose, getPreset, redraw, publishSource, publishTally, publishAllPanes } = d;
  let dragIdx: number | null = null;

  function fullWin(w: Win, i: number): HTMLElement {
    const winEl = el('div', {
      class: 'mv-win ' + (w.tally === 'pgm' ? 'pgm' : w.tally === 'pvw' ? 'pvw' : ''),
    });
    if (getPreset() === 'PIP' && i === 0) winEl.style.gridRow = `span ${Math.max(2, wins.length - 1)}`;
    winEl.draggable = true;
    const tally = el('span', {
      class: 'mv-tally',
      textContent: w.tally === 'pgm' ? 'PGM' : w.tally === 'pvw' ? 'PVW' : 'IN ' + (i + 1),
    });
    // An audio group renders as ONE pane holding n channel VU meters; video
    // (and unknown) feeds keep the mock picture + single side meter.
    const screen = w.channels
      ? vuBank(w.channels, dispose)
      : el('div', { class: 'mv-screen', textContent: `▣ ${w.label}` });
    const umd = el('div', {
      class: 'mv-umd',
      style: `--umd:${w.color}`,
      textContent: w.channels ? `♪ ${w.label} ×${w.channels.length}` : w.label,
    });
    umd.contentEditable = 'true';
    if (w.channels) winEl.append(tally, screen, umd);
    else winEl.append(tally, screen, umd, meterBar(dispose));
    screen.addEventListener('click', () => {
      w.tally = next(w.tally);
      publishTally(i);
      redraw();
    });
    umd.addEventListener('input', () => {
      w.label = umd.textContent ?? '';
      publishSource(i);
    });
    winEl.addEventListener('dragstart', () => {
      dragIdx = i;
      winEl.classList.add('dragging');
    });
    winEl.addEventListener('dragend', () => winEl.classList.remove('dragging'));
    winEl.addEventListener('dragover', (e) => e.preventDefault());
    winEl.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === i) return;
      const m = wins.splice(dragIdx, 1)[0];
      if (m) wins.splice(i, 0, m);
      dragIdx = null;
      publishAllPanes();
      redraw();
    });
    return winEl;
  }

  // A lightweight tile for the dense 8×8 / 16×16 walls (no per-tile chrome).
  function compactWin(w: Win | undefined): HTMLElement {
    const winEl = el('div', {
      class:
        'mv-win' + (w ? (w.tally === 'pgm' ? ' pgm' : w.tally === 'pvw' ? ' pvw' : '') : ' empty'),
    });
    winEl.append(el('div', { class: 'mv-tile', textContent: w ? (w.channels ? `♪ ${w.label} ×${w.channels.length}` : w.label) : '—' }));
    if (w) {
      const idx = wins.indexOf(w);
      winEl.addEventListener('click', () => {
        w.tally = next(w.tally);
        publishTally(idx);
        redraw();
      });
    }
    return winEl;
  }

  return { fullWin, compactWin };
}
