// src/ui/console/dest-fixtures-clock — the CLOCK fixture.
// A live time-of-day seven-seg read-out; click it to open the CLOCK editor.
// Blinks when the room is OFFLINE.

import { animate, card, pad, readout } from './dest-fixtures-shared.js';

export function clockCard(openEdit: () => void, offline: boolean): HTMLElement {
  const { cvs, draw } = readout(220, 58);
  cvs.classList.add('tap');
  if (offline) cvs.classList.add('dfx-blink');
  cvs.title = 'Open clock editor';
  cvs.addEventListener('click', openEdit);
  let last = '';
  animate(cvs, () => {
    const d = new Date();
    const s = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    if (s !== last) { last = s; draw(s); }
  });
  return card('CLOCK', cvs, 'tap to edit');
}
