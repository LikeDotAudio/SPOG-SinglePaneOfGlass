// src/editors/multi-viewer/meters — VU meter builders for the wall.
//
// Two animated audio faces: a vuBank (n channels for an audio-group pane) and a
// single meterBar strip (the side meter on a video tile). Both ride the shared
// editor disposer.

import type { Disposer } from '../../ui/timers.js';
import { el } from '../../ui/dom.js';

// A bank of n vertical VU meters — the SCREEN of an audio-group pane. Each
// channel gets its own bar + number, all animated on the shared disposer.
export function vuBank(channels: string[], dispose: Disposer): HTMLElement {
  const bank = el('div', { class: 'mv-vubank' });
  const fills: Array<{ fill: HTMLElement; lvl: number }> = [];
  channels.forEach((ch, i) => {
    const fill = el('i');
    const bar = el('div', { class: 'bar' }, [fill]);
    const cell = el('div', { class: 'mv-vu', title: ch }, [bar, el('span', { textContent: String(i + 1).padStart(2, '0') })]);
    bank.append(cell);
    fills.push({ fill, lvl: 0.2 + Math.random() * 0.4 });
  });
  dispose.interval(() => {
    for (const f of fills) {
      f.lvl = Math.max(0.04, Math.min(1, f.lvl + (Math.random() - 0.48) * 0.3));
      f.fill.style.height = `${f.lvl * 100}%`;
    }
  }, 120);
  return bank;
}

// Port of core.js meterBar('mv-meter'): a thin VU strip animated via the disposer.
export function meterBar(dispose: Disposer): HTMLElement {
  const m = el('div', { class: 'mv-meter' });
  const fill = el('i');
  m.append(fill);
  let lvl = 0.3;
  dispose.interval(() => {
    lvl = Math.max(0.05, Math.min(1, lvl + (Math.random() - 0.5) * 0.4));
    fill.style.height = `${lvl * 100}%`;
  }, 120);
  return m;
}
