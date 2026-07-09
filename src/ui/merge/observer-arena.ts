// src/ui/merge/observer-arena — a self-contained fight you can SEE in one console.
// Drag "your position"; a phantom controller bids for its own target on the same
// topic. Higher seat rank wins — flip the phantom above/below you and watch the
// slider snap to whoever outranks. No broker, no second tab required.

import { el } from '../dom.js';
import { mergeManager } from '../../platform/merge/manager.js';
import { localSeatRank } from '../../platform/merge/seat.js';

const TOPIC = 'demo/arena/position';
const PHANTOM_TARGET = 80;

export function buildArena(): HTMLElement {
  let phantomOn = true;
  let above = true;   // phantom outranks me?

  const slider = el('input', { type: 'range', min: '0', max: '100', value: '20' }) as HTMLInputElement;
  const val = el('span', { class: 'mrg-val' }, ['20']);
  const phantomChk = el('input', { type: 'checkbox' }) as HTMLInputElement; phantomChk.checked = true;
  const rankSel = el('select', {}, [
    el('option', { value: 'above' }, ['Phantom OUTRANKS me']),
    el('option', { value: 'below' }, ['Phantom below me']),
  ]) as HTMLSelectElement;

  // The manager owns the truth: snap the slider to whatever the window resolved to.
  mergeManager.onApply(TOPIC, 'position', (v) => {
    if (typeof v !== 'number') return;
    slider.value = String(Math.round(v));
    val.textContent = String(Math.round(v));
  });

  const drive = (): void => {
    const mine = Number(slider.value);
    val.textContent = String(mine);
    mergeManager.submitLocal(TOPIC, 'position', mine);
    if (phantomOn) {
      const seat = localSeatRank() + (above ? 50 : -50);
      mergeManager.inject(TOPIC, 'position', PHANTOM_TARGET, { seat, label: above ? 'Phantom (senior)' : 'Phantom (junior)', origin: 'phantom0' });
    }
  };
  slider.addEventListener('input', drive);
  phantomChk.addEventListener('change', () => { phantomOn = phantomChk.checked; });
  rankSel.addEventListener('change', () => { above = rankSel.value === 'above'; });

  return el('div', { class: 'mrg-arena' }, [
    el('h5', {}, ['ARENA — drag against a phantom controller']),
    el('div', { class: 'mrg-row' }, ['Your position', slider, val]),
    el('div', { class: 'mrg-row' }, [phantomChk, 'Phantom fights me (targets ' + PHANTOM_TARGET + ')']),
    el('div', { class: 'mrg-row' }, [rankSel]),
  ]);
}
