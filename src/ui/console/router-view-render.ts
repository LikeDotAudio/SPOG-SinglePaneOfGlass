// src/ui/console/router-view-render — HTML for the 3-layer crosspoint grid (Phase 2).
// Turns the pure AxisPlan (router-view-tree) into the <thead> (column headers, whose
// collapsed summaries rowspan down — placed via a small occupancy matrix) and the
// per-row header cells (whose container cells rowspan down — emitted as start-cells,
// the browser fills the covered columns). Kept separate so router-view-grid stays lean.
import { DEPTH, type AxisPlan, type PlanItem } from './router-view-tree.js';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fold = (collapsed: boolean): string => (collapsed ? '▸' : '▾');

interface MCell { html: string; rs: number; cs: number }

/** Build the column-header <thead> (DEPTH container rows + 1 twist row), with the
 *  corner spanning the DEPTH+1 row-header columns. */
export function theadHtml(col: AxisPlan<HTMLElement | null>): string {
  const rows = DEPTH + 1, cols = col.items.length;
  const grid: Array<Array<MCell | 'x' | null>> = Array.from({ length: rows }, () => Array(cols).fill(null));
  const put = (r: number, c: number, cell: MCell): void => {
    grid[r]![c] = cell;
    for (let dr = 0; dr < cell.rs; dr++) for (let dc = 0; dc < cell.cs; dc++) if (dr || dc) grid[r + dr]![c + dc] = 'x';
  };
  // container header levels
  for (let l = 0; l < DEPTH; l++) for (const cell of col.headers[l]!) {
    put(l, cell.start, { html: `<th class="rv-chead lv${l}${cell.collapsed ? ' grp' : ''}" colspan="${cell.span}" data-collapse="${esc(cell.key)}">${fold(cell.collapsed)} ${esc(cell.label)}</th>`, rs: 1, cs: cell.span });
  }
  // trailing: a twist header per leaf, or a collapsed summary rowspanning to the base
  col.items.forEach((it, c) => {
    if (it.agg) put(it.cut + 1, c, { html: `<th class="rv-twisthead grp" rowspan="${it.trailing.cross}">${esc(it.trailing.label)}</th>`, rs: it.trailing.cross, cs: 1 });
    else put(DEPTH, c, { html: `<th class="rv-twisthead">${esc(it.leaf)}</th>`, rs: 1, cs: 1 });
  });

  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    if (r === 0) html += `<th class="rv-corner" rowspan="${rows}" colspan="${DEPTH + 1}">SRC \\ DST</th>`;
    for (let c = 0; c < cols; c++) { const g = grid[r]![c]; if (g && g !== 'x') html += g.html; }
    html += '</tr>';
  }
  return html;
}

/** The row-header <td>s for one row item: only the cells that START at this item
 *  (container cells the browser rowspans down) + the trailing feed/summary cell. */
export function rowHeaderHtml(item: PlanItem<HTMLElement | null>, i: number, row: AxisPlan<HTMLElement | null>): string {
  let html = '';
  for (let l = 0; l < DEPTH; l++) {
    const cell = row.headers[l]!.find((x) => x.start === i);
    if (cell) html += `<td class="rv-rhead lv${l}${cell.collapsed ? ' grp' : ''}" rowspan="${cell.span}" data-collapse="${esc(cell.key)}">${fold(cell.collapsed)} ${esc(cell.label)}</td>`;
  }
  html += item.agg
    ? `<td class="rv-feedhead grp" colspan="${item.trailing.cross}">${esc(item.trailing.label)}</td>`
    : `<td class="rv-feedhead">${esc(item.leaf)}</td>`;
  return html;
}
