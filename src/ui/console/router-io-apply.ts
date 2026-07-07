// src/ui/console/router-io-apply — replay imported routes into the live DOM through
// the SAME write path the 1990s grid uses (placeSourceInTwist), matching every named
// device against the catalog with the app's own naming rules. See the import design in
// docs/Audit/1990s-View-Import-Export-Audit.md §7.

import { SEP, firstLine, gatherSenderNodes, gatherReceivers, gatherLinks } from './router-view-gather.js';
import { placeSourceInTwist } from './matrix.js';
import { updateTwistVisuals } from './helix.js';
import { norm } from './router-io-sheet.js';

export interface Route { room: string; twist: string; origin: string; feed: string; }
export type ImportMode = 'merge' | 'replace';
export interface ApplySummary { added: number; removed: number; unmatched: Route[]; rejected: Route[] }

const rkey = (room: string, twist: string, origin: string, feed: string): string =>
  [norm(room), norm(twist), norm(origin), norm(feed)].join(SEP);

// ---- live DOM lookups -------------------------------------------------------
function senderIndex(): { byPair: Map<string, HTMLElement>; byFeed: Map<string, HTMLElement[]> } {
  const byPair = new Map<string, HTMLElement>(), byFeed = new Map<string, HTMLElement[]>();
  gatherSenderNodes().forEach((labels, origin) => labels.forEach((node, label) => {
    if (!node) return;
    byPair.set(norm(origin) + SEP + norm(label), node);
    const arr = byFeed.get(norm(label)) ?? []; arr.push(node); byFeed.set(norm(label), arr);
  }));
  return { byPair, byFeed };
}
function twistIndex(): Map<string, HTMLElement> {
  const m = new Map<string, HTMLElement>();
  gatherReceivers().forEach((twists, prod) => twists.forEach((el, tname) => m.set(norm(prod) + SEP + norm(tname), el)));
  return m;
}

/** Remove a placed route (mirrors the grid's breakRoute) — returns true if found. */
function removeRoute(twistEl: HTMLElement, origin: string, feed: string): boolean {
  const dz = twistEl.querySelector<HTMLElement>('.drop-zone'); if (!dz) return false;
  for (const node of dz.querySelectorAll<HTMLElement>(':scope > .signal-node')) {
    const feeds = node.classList.contains('dropped-group')
      ? [...node.querySelectorAll<HTMLElement>('.dropped-group-children .signal-node')] : [node];
    for (const f of feeds) {
      if (norm(firstLine(f)) !== norm(feed)) continue;
      const o = f.dataset.origin || node.dataset.origin || firstLine(f);
      if (origin && norm(o) !== norm(origin)) continue;
      const kids = f.closest('.dropped-group-children'); f.remove();
      if (kids && !kids.querySelector('.signal-node')) kids.closest('.dropped-group')?.remove();
      return true;
    }
  }
  return false;
}

/** Diff imported routes against the live DOM and apply via placeSourceInTwist. */
export function applyRoutes(imported: Route[], mode: ImportMode): ApplySummary {
  const { byPair, byFeed } = senderIndex();
  const tw = twistIndex();
  const summary: ApplySummary = { added: 0, removed: 0, unmatched: [], rejected: [] };
  const touched = new Set<HTMLElement>();

  const current: Route[] = [];
  const currentKeys = new Set<string>();
  gatherLinks().cross.forEach((k) => {
    const [origin, feed, room, twist] = k.split(SEP) as [string, string, string, string];
    current.push({ room, twist, origin, feed }); currentKeys.add(rkey(room, twist, origin, feed));
  });
  const importedKeys = new Set(imported.map((r) => rkey(r.room, r.twist, r.origin, r.feed)));

  for (const r of imported) {
    if (currentKeys.has(rkey(r.room, r.twist, r.origin, r.feed))) continue;   // already routed
    const twistEl = tw.get(norm(r.room) + SEP + norm(r.twist));
    let node = r.origin ? byPair.get(norm(r.origin) + SEP + norm(r.feed)) : undefined;
    if (!node) { const arr = byFeed.get(norm(r.feed)); if (arr && arr.length === 1) node = arr[0]; }
    if (!twistEl || !node) { summary.unmatched.push(r); continue; }
    if (placeSourceInTwist(twistEl, node)) { summary.added++; touched.add(twistEl); } else summary.rejected.push(r);
  }

  if (mode === 'replace') {
    for (const t of current) {
      if (importedKeys.has(rkey(t.room, t.twist, t.origin, t.feed))) continue;
      const twistEl = tw.get(norm(t.room) + SEP + norm(t.twist));
      if (twistEl && removeRoute(twistEl, t.origin, t.feed)) { summary.removed++; touched.add(twistEl); }
    }
  }

  touched.forEach((el) => updateTwistVisuals(el));
  return summary;
}
