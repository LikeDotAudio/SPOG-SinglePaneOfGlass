// src/editors/vision-mixer/transition — the transition bar + take controls.
//
// The transition-type buttons (CUT/MIX/WIPE/DVE), the rate field, the CUT/AUTO
// take buttons, `doTake` (the actual bus swap + MQTT publish), and the T-bar drag
// handler. Extracted from the render closure. The auto-transition RAF token stays
// owned by index (it drives the animation loop); this builder only arms it via the
// `setAuto` callback, so no mutable animation state is duplicated.

import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { take, srcLabel } from './me.js';
import { TIPS } from './tips.js';
import type { TransitionKind } from '../../model/index.js';
import type { Surface } from './surface.js';

/** The in-flight auto-transition: which bank, when it started, and its duration. */
export interface AutoToken { bank: number; t0: number; ms: number; }

/**
 * Build the transition controls over the shared surface. `tbar`/`pct` are the
 * stage's T-bar refs; `setAuto` arms the RAF-driven auto-transition owned by index.
 * Returns `doTake` so the render closure (RAF, MQTT) can trigger a take too.
 */
export function buildTransition(
  s: Surface,
  refs: { tbar: HTMLInputElement; pct: HTMLElement; setAuto: (v: AutoToken) => void },
): {
  transBtns: { t: TransitionKind; b: HTMLElement }[];
  rate: HTMLInputElement;
  cutBtn: HTMLElement;
  autoBtn: HTMLElement;
  doTake: (bank: number) => void;
} {
  const def = s.def;
  const { tbar, pct, setAuto } = refs;

  const transBtns = def.transitions.map((t) => {
    const b = el('div', { class: 'vm-tbtn' }, [t]);
    b.addEventListener('click', () => {
      s.me().trans = t;
      s.publish(`me.${s.delegate + 1}.transition`, t);
      if (s.delegate === 0) s.publish('transition', t);
      s.sync();
    });
    tip(b, (t === 'CUT' ? TIPS.cut : t === 'MIX' ? TIPS.mix : t === 'WIPE' ? TIPS.wipe : TIPS.dveTrans)!);
    return { t, b };
  });
  const rate = el('input', { class: 'vm-num', type: 'number', min: '1', max: '300' }) as HTMLInputElement;
  rate.addEventListener('input', () => { s.me().rate = Math.max(1, +rate.value || 24); s.publish(`me.${s.delegate + 1}.rate`, s.me().rate); });
  tip(rate, TIPS.rate!);
  const cutBtn = el('div', { class: 'vm-tbtn take', style: 'background: var(--state-alarm,#ff3b3b); color: #fff;' }, ['CUT']);
  const autoBtn = el('div', { class: 'vm-tbtn take', style: 'background: var(--sig-audio,#FF9C63); color: #000;' }, ['AUTO']);
  tip(cutBtn, TIPS.take!);
  tip(autoBtn, 'Trigger the selected transition over the given rate.');

  // Auto-transition: CUT is instant; MIX/WIPE/DVE run the T-bar over `rate` frames.
  function doTake(bank: number): void {
    take(s.state.mes[bank]!);
    tbar.value = '0'; pct.textContent = '0%';
    s.publish(`me.${bank + 1}.pgm`, srcLabel(s.state.mes[bank]!.pgm, def));
    s.publish(`me.${bank + 1}.pvw`, srcLabel(s.state.mes[bank]!.pvw, def));
    if (bank === 0) { s.publish('pgm', srcLabel(s.state.mes[0]!.pgm, def)); s.publish('pvw', srcLabel(s.state.mes[0]!.pvw, def)); }
    s.sync();
  }
  cutBtn.addEventListener('click', () => { doTake(s.delegate); });
  autoBtn.addEventListener('click', () => {
    setAuto({ bank: s.delegate, t0: performance.now(), ms: (s.me().rate / 30) * 1000 });
  });
  tbar.addEventListener('input', () => {
    s.me().tbar = +tbar.value;
    pct.textContent = `${tbar.value}%`;
    s.publish(`me.${s.delegate + 1}.tbar`, s.me().tbar, true);
    if (s.delegate === 0) s.publish('tbar', s.me().tbar, true);
    if (s.me().tbar >= 100) doTake(s.delegate);
  });

  return { transBtns, rate, cutBtn, autoBtn, doTake };
}
