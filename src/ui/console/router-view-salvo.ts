// src/ui/console/router-view-salvo — container→container SALVO (Phase 3). Clicking a
// group×group crosspoint (an aggregate row and/or column) wires EVERY matching source
// feed under the row group into the twists under the col group: one crosspoint per
// leaf, greedily paired by signal type (a source only lands in a twist whose `accepts`
// permits it, and never twice). See docs/Audit/Studio-Spaces-and-Hierarchical-Routing.
import { placeSourceInTwist } from './matrix.js';
import { parseConfig } from './matrix-groups.js';
import { gatherSenderNodes, firstLine, SEP } from './router-view-gather.js';
import type { TwistConfig } from '../../model/index.js';

export interface SalvoPair { node: HTMLElement; el: HTMLElement }

function nodeType(n: HTMLElement): 'video' | 'audio' | 'control' {
  if (n.classList.contains('video')) return 'video';
  if (n.classList.contains('control') || n.classList.contains('camera-control')) return 'control';
  return n.classList.contains('audio') ? 'audio' : 'video';
}
function accepts(cfg: TwistConfig | null, type: string): boolean {
  const a = cfg?.accepts;
  if (!a || a === 'both') return true;
  if (a === 'camera') return type === 'video';
  return a === type;
}
function alreadyRouted(el: HTMLElement, origin: string, label: string): boolean {
  const dz = el.querySelector<HTMLElement>('.drop-zone'); if (!dz) return false;
  return [...dz.querySelectorAll<HTMLElement>('.signal-node')].some((n) =>
    firstLine(n) === label && ((n.dataset.origin || firstLine(n)) === origin || !origin));
}

/** Greedily pair each source feed (row group) with the next compatible, still-free twist
 *  (col group). Returns the crosspoints a salvo WOULD make (empty = nothing to do). */
export function planSalvo(rowIds: Array<[string, string]>, colIds: Array<[string, string]>): SalvoPair[] {
  const sender = gatherSenderNodes();
  const sources = rowIds
    .map(([origin, label]) => ({ origin, label, node: sender.get(origin)?.get(label) ?? null }))
    .filter((s): s is { origin: string; label: string; node: HTMLElement } => !!s.node)
    .map((s) => ({ ...s, type: nodeType(s.node) }));

  const twistEls = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('.twist-container').forEach((tw) => {
    const prod = tw.dataset.prodName || (tw.closest('.program-row')?.querySelector<HTMLElement>('.program-title')?.innerText.trim() ?? '');
    const t = tw.querySelector<HTMLElement>('.twist-title')?.innerText.trim() ?? '';
    twistEls.set(prod + SEP + t, tw);
  });
  const twists = colIds
    .map(([prod, twist]) => ({ el: twistEls.get(prod + SEP + twist) ?? null }))
    .filter((t): t is { el: HTMLElement } => !!t.el)
    .map((t) => ({ el: t.el, cfg: parseConfig(t.el), used: false }));

  const pairs: SalvoPair[] = [];
  for (const s of sources) {
    const t = twists.find((tw) => !tw.used && accepts(tw.cfg, s.type) && !alreadyRouted(tw.el, s.origin, s.label));
    if (!t) continue;
    t.used = true;
    pairs.push({ node: s.node, el: t.el });
  }
  return pairs;
}

/** Apply the salvo; returns how many landed + the touched twists (for visual refresh). */
export function runSalvo(pairs: SalvoPair[]): { made: number; touched: Set<HTMLElement> } {
  const touched = new Set<HTMLElement>();
  let made = 0;
  for (const p of pairs) if (placeSourceInTwist(p.el, p.node)) { made++; touched.add(p.el); }
  return { made, touched };
}
