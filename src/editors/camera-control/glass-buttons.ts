// src/editors/camera-control/glass-buttons — the on-glass momentary controls:
// the Colour Bars toggle, the push-&-hold Auto White Balance button, and the
// push-&-hold Auto-Iris on the iris encoder. Extracted from index.ts.

import type { CameraConsole } from './state.js';
import { qs } from '../../ui/dom.js';

/** Wire the three momentary glass controls (bars toggle, hold-WB, hold-iris). */
export function buildGlassButtons(cc: CameraConsole): void {
  const host = cc.body;
  const ui = cc.ui;

  // Colour Bars — glass button (bottom-right).
  const barsBtn = qs(host, '.cc-bars-btn');
  const smpteBox = qs(host, '.cc-smpte');
  const dvd = qs(host, '.cc-dvd');
  barsBtn.addEventListener('click', () => {
    ui.bars = !ui.bars;
    barsBtn.classList.toggle('on', ui.bars);
    smpteBox.classList.toggle('on', ui.bars);
    dvd.classList.toggle('on', ui.bars);
    qs(host, '.cc-wf-tag').textContent = ui.bars ? 'RGB PARADE · COLOUR BARS' : 'RGB PARADE · IRE';
  });

  // Auto White Balance — glass button (left). Push & HOLD 2s to engage; a tap
  // while active de-activates immediately.
  const wbBtn = qs(host, '.cc-wb-btn');
  const wbFill = qs<HTMLElement>(wbBtn, '.fill');
  let wbT: number | null = null;
  let wbRAF = 0;
  const wbStart = (e?: Event): void => {
    if (e) e.preventDefault();
    if (wbBtn.classList.contains('on')) {
      wbBtn.classList.remove('on');
      ui.autowb = false;
      return;
    }
    const t0 = performance.now();
    const tick = (): void => {
      const p = Math.min(1, (performance.now() - t0) / 2000);
      wbFill.style.height = p * 100 + '%';
      if (wbT !== null) wbRAF = requestAnimationFrame(tick);
    };
    wbT = window.setTimeout(() => {
      wbBtn.classList.add('on');
      wbFill.style.height = '0';
      ui.autowb = true;
      wbT = null;
    }, 2000);
    tick();
  };
  const wbCancel = (): void => {
    if (wbT !== null) {
      clearTimeout(wbT);
      wbT = null;
    }
    cancelAnimationFrame(wbRAF);
    wbFill.style.height = '0';
  };
  wbBtn.addEventListener('mousedown', wbStart);
  window.addEventListener('mouseup', wbCancel);
  wbBtn.addEventListener('mouseleave', wbCancel);
  wbBtn.addEventListener('touchstart', wbStart, { passive: false });
  wbBtn.addEventListener('touchend', wbCancel);

  // Iris encoder — push & HOLD (without dragging) to auto-iris.
  const irisDial = qs(host, '.cc-mono .cc-dial');
  let irisHold: number | null = null;
  let irisMoved = false;
  let irisY = 0;
  const irisDown = (y: number): void => {
    irisMoved = false;
    irisY = y;
    irisHold = window.setTimeout(() => {
      if (!irisMoved) ui.autoiris = true;
    }, 250);
  };
  const irisUp = (): void => {
    if (irisHold !== null) clearTimeout(irisHold);
    ui.autoiris = false;
  };
  irisDial.addEventListener('mousedown', (e) => irisDown(e.clientY));
  window.addEventListener('mousemove', (e) => {
    if (Math.abs(e.clientY - irisY) > 5) irisMoved = true;
  });
  window.addEventListener('mouseup', irisUp);
  irisDial.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      if (t) irisDown(t.clientY);
    },
    { passive: true },
  );
  window.addEventListener('touchend', irisUp);
}
