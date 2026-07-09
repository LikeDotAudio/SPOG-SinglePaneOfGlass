// src/ui/merge/badge — the transient "the argument" surface: a centre-top toast
// that flashes ONLY when a merge window actually held a fight (contested) or two
// seats co-drove one control (concordant). Silent for clean/composed merges — the
// mediator is loud exactly when a human wouldn't have expected the jump.

import { el, addStyles } from '../dom.js';
import { MERGE_CSS } from './observer-styles.js';
import { mergeManager } from '../../platform/merge/manager.js';
import type { MergeEvent } from '../../platform/merge/types.js';

const short = (v: unknown): string => {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(1);
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 18 ? s.slice(0, 17) + '…' : s;
};

/** Human line for a contested/concordant event (also reused by the Captain's Log). */
export function describeEvent(e: MergeEvent): string {
  const win = e.proposals.find((p) => p.won);
  const others = e.proposals.filter((p) => p !== win && p.value !== undefined && p.value !== null);
  if (e.concordant) {
    const seats = e.proposals.map((p) => p.label).join(' & ');
    return `${e.key} co-driven: ${seats} both set ${short(e.resolved)}`;
  }
  const losers = others.map((p) => `${p.label} ${short(p.value)}`).join(', ');
  return `${e.key} contested: ${win?.label ?? '?'} ${short(e.resolved)} ▸ won · ${losers} ▸ yielded`;
}

let toast: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** Mount the global conflict toast once (call from the shell). */
export function initMergeBadge(): void {
  addStyles('merge-styles', MERGE_CSS);
  toast = el('div', { class: 'mrg-toast' });
  document.body.appendChild(toast);
  mergeManager.onEvent((e) => {
    if (!e.contested && !e.concordant) return;   // clean merge → stay silent
    if (!toast) return;
    toast.textContent = `⚖ ${describeEvent(e)}`;
    toast.classList.toggle('concord', e.concordant && !e.contested);
    toast.classList.add('show');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast?.classList.remove('show'), 2600);
  });
}
