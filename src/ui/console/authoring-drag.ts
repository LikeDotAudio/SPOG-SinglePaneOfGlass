// src/ui/console/authoring-drag — container-move drag (reorder + re-band) for the
// single-pane AUTHORING layer (audit §4D). Split out of authoring.ts to keep each
// module under the 200-line rule.

import { isEditing, canArrange, commit } from './authoring-commit.js';
import type { Production, TwistConfig } from '../../model/index.js';

// ---- drag a container to a new position / band (audit §4D) ------------------
/**
 * Wire container-move drag on one room pane. A container carries an EMPTY text/plain
 * payload, so the matrix's own drop handler (which needs feed ids) bails — the two
 * drag kinds never collide. Dropping onto another container reorders `twists[]` and
 * makes the moved container ADOPT that container's row (band), so a drop is both a
 * reorder and a re-band. Dropping on empty space appends. `dragIdx` is per-pane
 * closure state (one drag at a time, within a pane).
 */
export function wireContainerDrag(pane: HTMLElement, pgm: Production, url: string, rerender: () => void): void {
  if (!Array.isArray(pgm.twists)) return;
  const row = pane.querySelector<HTMLElement>('.program-row');
  if (!row) return;
  let dragIdx: number | null = null;
  const containers = (): HTMLElement[] => [...pane.querySelectorAll<HTMLElement>('.twist-container[data-twist-index]')];
  const clearMarks = (): void => containers().forEach((c) => c.classList.remove('twist-drop-before', 'twist-drop-after', 'twist-dragging'));

  containers().forEach((c) => {
    c.draggable = isEditing();
    c.addEventListener('dragstart', (e) => {
      if (!isEditing() || !canArrange()) return;
      // Don't hijack a crosspoint/source drag starting inside the drop-zone.
      if ((e.target as HTMLElement).closest('.signal-node')) return;
      dragIdx = Number(c.dataset.twistIndex);
      c.classList.add('twist-dragging');
      if (e.dataTransfer) { e.dataTransfer.setData('text/plain', ''); e.dataTransfer.effectAllowed = 'move'; }
    });
    c.addEventListener('dragend', () => { dragIdx = null; clearMarks(); });
  });

  const targetUnder = (e: DragEvent): { el: HTMLElement; before: boolean } | null => {
    const el = (e.target as HTMLElement)?.closest<HTMLElement>('.twist-container[data-twist-index]');
    if (!el || el.classList.contains('twist-dragging')) return null;
    const r = el.getBoundingClientRect();
    return { el, before: e.clientX < r.left + r.width / 2 };
  };

  row.addEventListener('dragover', (e) => {
    if (dragIdx === null) return;                 // not a container drag
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const t = targetUnder(e);
    containers().forEach((c) => c.classList.remove('twist-drop-before', 'twist-drop-after'));
    if (t) t.el.classList.add(t.before ? 'twist-drop-before' : 'twist-drop-after');
  });

  row.addEventListener('drop', (e) => {
    if (dragIdx === null || !pgm.twists) return;
    e.preventDefault(); e.stopPropagation();
    const arr = pgm.twists.slice();
    const i = dragIdx;
    const [moved] = arr.splice(i, 1);
    if (!moved) { clearMarks(); dragIdx = null; return; }
    const t = targetUnder(e);
    if (t) {
      const j = Number(t.el.dataset.twistIndex);
      let insertAt = t.before ? j : j + 1;
      if (i < j) insertAt -= 1;                    // removal shifted the target left
      arr.splice(insertAt, 0, moved);
      // Adopt the band we were dropped into (a drop is also a re-band).
      const targetRow = ((): string | undefined => {
        const tt = pgm.twists[j];
        return typeof tt === 'object' ? tt.row : undefined;
      })();
      const movedObj: TwistConfig = typeof moved === 'string' ? { name: moved } : { ...moved };
      movedObj.row = targetRow;
      arr[insertAt] = movedObj;                    // moved now sits at insertAt
    } else {
      arr.push(moved);                             // dropped on empty space → end
    }
    dragIdx = null;
    const movedName = typeof moved === 'string' ? moved : moved.name;
    commit(pgm, url, rerender, () => `moved container "${movedName}"`, () => { pgm.twists = arr; });
  });
}
