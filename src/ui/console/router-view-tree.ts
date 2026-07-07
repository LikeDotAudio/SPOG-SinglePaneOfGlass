// src/ui/console/router-view-tree — the multi-level grouping planner for the 1990s
// grid (Phase 2: three containment layers before the leaf). PURE + unit-testable: it
// takes a flat, ordered list of axis leaves (each carrying its container `segs` path +
// a crosspoint identity + an opaque ref) and a collapse set, and returns a render plan
// — the visible items and, per level, the header cells with their span. The grid maps
// `span` → rowspan (row axis) / colspan (col axis) and `cross` → the perpendicular.
// Fixed DEPTH=3: deeper paths merge their tail into the box level; shallower pad blank.

export const DEPTH = 3;

export interface PlanLeaf<R> { segs: string[]; leaf: string; id: [string, string]; ref: R; }
export interface PlanCell { level: number; label: string; key: string; start: number; span: number; collapsed: boolean }
export interface PlanItem<R> {
  agg: boolean; cut: number; leaf: string; ids: Array<[string, string]>; ref: R | null;
  /** trailing cell after the header columns: the feed (leaf) or the collapsed summary. */
  trailing: { summary: boolean; label: string; cross: number };
}
export interface AxisPlan<R> { depth: number; items: PlanItem<R>[]; headers: PlanCell[][] }

const SEP = '␟';

/** Normalize a container path to exactly DEPTH segments: merge a deep tail into the box
 *  level, pad a shallow path with '' (blank) cells. */
function fit(segs: string[]): string[] {
  const s = segs.filter((x) => x != null).map((x) => x.trim());
  if (s.length > DEPTH) return [s[0]!, s[1]!, s.slice(DEPTH - 1).join(' — ')];
  while (s.length < DEPTH) s.push('');
  return s;
}

export function buildAxisPlan<R>(leaves: Array<PlanLeaf<R>>, collapsed: Set<string>, kp: string): AxisPlan<R> {
  const key = (segs: string[], L: number): string => kp + segs.slice(0, L + 1).join(SEP);
  const items: PlanItem<R>[] = [];
  const itemSegs: string[][] = [];
  const aggAt = new Map<string, number>();
  for (const lf of leaves) {
    const segs = fit(lf.segs);
    let cut = DEPTH;                                   // no collapse → full leaf
    for (let L = 0; L < DEPTH; L++) { if (collapsed.has(key(segs, L))) { cut = L; break; } }
    if (cut >= DEPTH) {
      items.push({ agg: false, cut: DEPTH, leaf: lf.leaf, ids: [lf.id], ref: lf.ref, trailing: { summary: false, label: lf.leaf, cross: 1 } });
      itemSegs.push(segs);
    } else {
      const k = key(segs, cut), at = aggAt.get(k);
      if (at == null) {
        aggAt.set(k, items.length);
        items.push({ agg: true, cut, leaf: segs[cut] ?? '', ids: [lf.id], ref: null, trailing: { summary: true, label: '', cross: DEPTH - cut } });
        itemSegs.push(segs);
      } else items[at]!.ids.push(lf.id);
    }
  }
  // Finalize aggregate summary labels now that all their leaves are counted.
  items.forEach((it) => { if (it.agg) it.trailing.label = `▸ ${it.leaf} · ${it.ids.length}`; });

  // Header cells per level: consecutive items sharing the level-l prefix, skipping items
  // absorbed by a shallower collapse (agg with cut < l).
  const hasHeader = (i: number, l: number): boolean => items[i]!.agg ? l <= items[i]!.cut : true;
  const headers: PlanCell[][] = [];
  for (let l = 0; l < DEPTH; l++) {
    const cells: PlanCell[] = [];
    let i = 0;
    while (i < items.length) {
      if (!hasHeader(i, l)) { i++; continue; }
      const pref = key(itemSegs[i]!, l);
      let j = i + 1;
      while (j < items.length && hasHeader(j, l) && key(itemSegs[j]!, l) === pref) j++;
      cells.push({ level: l, label: itemSegs[i]![l] ?? '', key: pref, start: i, span: j - i, collapsed: items[i]!.agg && items[i]!.cut === l });
      i = j;
    }
    headers.push(cells);
  }
  return { depth: DEPTH, items, headers };
}
