// src/editors/stagebox-input/dials — the three preamp dials (Gain / HPF / Pan)
// extracted from view. Builds the knobs into `.sb-knrow`, wires drag + publish,
// registers teardown on the disposer, and returns the array of paint callbacks so
// view can repaint them on mic/stand/bus changes. Render locals (state, idx,
// services, gainDb) are threaded in as params — no closures over view.

import type { Disposer } from '../../ui/timers.js';
import type { EditorServices } from '../types.js';
import { MICS } from './state.js';
import type { PanelState } from './state.js';

type DialKey = 'gain' | 'hpf' | 'pan';

/**
 * Build the three preamp dials into `knrow` and return their paint callbacks.
 *
 * Only the GAIN dial is an advertised param (throttled, published from the drag
 * loop via `services` on indexed name `in<idx>_gain`); HPF/Pan are local-only.
 */
export function buildDials(
  knrow: HTMLElement,
  s: PanelState,
  dispose: Disposer,
  idx: number,
  services: EditorServices,
  gainDb: () => number,
): Array<() => void> {
  const dials: Array<() => void> = [];
  const dialDefs: ReadonlyArray<readonly [DialKey, string, string]> = [
    ['gain', 'Gain', '#39d353'],
    ['hpf', 'HPF', '#6FC8F0'],
    ['pan', 'Pan', '#cba6ff'],
  ];
  dialDefs.forEach(([key, label, c]) => {
    const kn = document.createElement('div');
    kn.className = 'sb-kn';
    kn.innerHTML = `<div class="sb-dial" style="--c:${c}"><i></i></div><b></b><span>${label}</span>`;
    const dial = kn.querySelector<HTMLElement>('.sb-dial')!;
    const val = kn.querySelector<HTMLElement>('b')!;
    const paint = (): void => {
      const v = s[key];
      dial.style.setProperty('--p', v * 100 + '%');
      dial.style.setProperty('--rot', v * 270 - 135 + 'deg');
      const m = MICS[s.mic]!;
      val.textContent =
        key === 'gain'
          ? Math.round(m.gain[0] + v * (m.gain[1] - m.gain[0])) + ' dB'
          : key === 'hpf'
            ? Math.round(20 + v * 280) + ' Hz'
            : v < 0.48
              ? 'L' + Math.round((0.5 - v) * 200)
              : v > 0.52
                ? 'R' + Math.round((v - 0.5) * 200)
                : 'C';
    };
    let sy = 0;
    let sv = 0;
    let dr = false;
    dial.addEventListener('mousedown', (e) => {
      dr = true;
      sy = e.clientY;
      sv = s[key];
      e.preventDefault();
    });
    const onMove = (e: MouseEvent): void => {
      if (!dr) return;
      s[key] = Math.max(0, Math.min(1, sv + (sy - e.clientY) / 130));
      paint();
      // Only the preamp GAIN dial is an advertised param; throttled (drag loop).
      if (key === 'gain') services.publishParam?.(`in${idx}_gain`, gainDb());
    };
    const onUp = (): void => {
      dr = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    dispose.add(() => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    });
    knrow.appendChild(kn);
    dials.push(paint);
    paint();
  });
  return dials;
}
