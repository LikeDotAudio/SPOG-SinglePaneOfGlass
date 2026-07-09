// src/ui/merge/observer — the live window onto the manager: a launcher chip that
// opens a panel showing the mediator's config, a streaming feed of every resolved
// window (contested / co-driven / composed), and the self-contained arena. This is
// the "I would like to see this" surface.

import { el, addStyles } from '../dom.js';
import { MERGE_CSS } from './observer-styles.js';
import { buildArena } from './observer-arena.js';
import { mergeManager } from '../../platform/merge/manager.js';
import { localSeatRank } from '../../platform/merge/seat.js';
import type { MergeEvent } from '../../platform/merge/types.js';

const fmtVal = (v: unknown): string =>
  typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : JSON.stringify(v);
const hhmmss = (ts: number): string => new Date(ts).toTimeString().slice(0, 8);

function eventRow(e: MergeEvent): HTMLElement {
  const kind = e.contested ? 'contest' : e.concordant ? 'concord' : 'compose';
  const tag = e.contested ? 'CONTESTED' : e.concordant ? 'CO-DRIVEN' : 'COMPOSED';
  const props = e.proposals
    .filter((p) => p.value !== undefined && p.value !== null)
    .map((p) => el('div', { class: `mrg-prop${p.won ? ' win' : ''}` }, [
      `${p.label}: ${fmtVal(p.value)} `,
      p.won ? el('span', { class: 'mrg-w' }, [`▸ won (rank ${p.seat})`]) : `(rank ${p.seat})`,
    ]));
  return el('div', { class: `mrg-evt ${kind}` }, [
    el('div', { class: 'mrg-l1' }, [
      el('span', { class: 'mrg-tag' }, [tag]),
      el('span', { class: 'mrg-key' }, [e.key]),
      el('span', { class: 'mrg-res' }, [fmtVal(e.resolved)]),
    ]),
    ...props,
    el('div', { class: 'mrg-time' }, [hhmmss(e.ts)]),
  ]);
}

export function initMergeObserver(): void {
  addStyles('merge-styles', MERGE_CSS);
  const cfg = mergeManager.getConfig();

  const launch = el('button', { class: 'mrg-launch', title: 'Merge mediator — deterministic conflict resolution' }, ['⚖ MERGE']);
  const feed = el('div', { class: 'mrg-feed' }, [el('div', { class: 'mrg-empty' }, ['No merges yet — drag the arena slider below.'])]);

  const enableChk = el('input', { type: 'checkbox' }) as HTMLInputElement; enableChk.checked = cfg.enabled;
  const winRange = el('input', { type: 'range', min: '40', max: '400', step: '20', value: String(cfg.windowMs) }) as HTMLInputElement;
  const winVal = el('span', {}, [`${cfg.windowMs}ms`]);
  enableChk.addEventListener('change', () => mergeManager.setConfig({ enabled: enableChk.checked }));
  winRange.addEventListener('input', () => { winVal.textContent = `${winRange.value}ms`; mergeManager.setConfig({ windowMs: Number(winRange.value) }); });

  const panel = el('div', { class: 'mrg-panel' }, [
    el('div', { class: 'mrg-head' }, ['⚖ MERGE MEDIATOR', el('span', { class: 'mrg-x', title: 'close' }, ['✕'])]),
    el('div', { class: 'mrg-cfg' }, [
      el('label', {}, [enableChk, 'engaged']),
      el('label', {}, ['window', winRange, winVal]),
      el('span', { class: 'mrg-seat' }, [`seat rank ${localSeatRank()}`]),
    ]),
    feed,
    buildArena(),
  ]);
  (panel.querySelector('.mrg-x') as HTMLElement).addEventListener('click', () => panel.classList.remove('open'));
  launch.addEventListener('click', () => { panel.classList.toggle('open'); launch.classList.remove('contest'); });

  document.body.append(launch, panel);

  let empty = true;
  mergeManager.onEvent((e) => {
    if (empty) { feed.innerHTML = ''; empty = false; }
    feed.prepend(eventRow(e));
    while (feed.childElementCount > 40) feed.lastElementChild?.remove();
  });
}
