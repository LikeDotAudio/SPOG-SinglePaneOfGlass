// src/editors/vision-mixer/keyboard — the hardware-panel keyboard shortcuts.
//
// Enter = AUTO, Space = CUT, ↑/↓ = nudge the T-bar, and the classic switcher key
// map (1–= program bus, q–] preview bus, b–/ DSKs). A pure dispatcher: every key
// only clicks an existing control or reads Surface bus buttons. Extracted from
// the render closure; self-removes once the editor's DOM is gone.

import type { Surface } from './surface.js';

/** Wire the global keydown handler for the switcher. */
export function wireKeyboard(
  s: Surface,
  refs: { host: HTMLElement; tbar: HTMLInputElement; cutBtn: HTMLElement; autoBtn: HTMLElement; dskBtns: HTMLElement[] },
): void {
  const { host, tbar, cutBtn, autoBtn, dskBtns } = refs;

  const onKeyDown = (e: KeyboardEvent) => {
    if (!host.isConnected) {
      window.removeEventListener('keydown', onKeyDown);
      return;
    }
    const tgt = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tgt.tagName)) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      autoBtn.click();
      return;
    }
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      cutBtn.click();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      tbar.value = Math.max(0, +tbar.value - 5).toString();
      tbar.dispatchEvent(new Event('input'));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      tbar.value = Math.min(100, +tbar.value + 5).toString();
      tbar.dispatchEvent(new Event('input'));
      return;
    }

    const pgmKeys = ['1','2','3','4','5','6','7','8','9','0','-','='];
    const pvwKeys = ['q','w','e','r','t','y','u','i','o','p','[',']'];
    const dskKeys = ['b','n','m',',','.','/'];

    const pgmIndex = pgmKeys.indexOf(e.key.toLowerCase());
    if (pgmIndex >= 0 && s.busBtns.pgm[pgmIndex]) {
      e.preventDefault();
      s.busBtns.pgm[pgmIndex].click();
      return;
    }

    const pvwIndex = pvwKeys.indexOf(e.key.toLowerCase());
    if (pvwIndex >= 0 && s.busBtns.pvw[pvwIndex]) {
      e.preventDefault();
      s.busBtns.pvw[pvwIndex].click();
      return;
    }

    const dskIndex = dskKeys.indexOf(e.key.toLowerCase());
    if (dskIndex >= 0 && dskBtns[dskIndex]) {
      e.preventDefault();
      dskBtns[dskIndex].click();
      return;
    }
  };
  window.addEventListener('keydown', onKeyDown);
}
