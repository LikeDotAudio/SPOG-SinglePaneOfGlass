// src/ui/console/scope — applyScope: the progressive-disclosure sweep (split from
// auth-panel.ts). Hides [data-cap] controls the current role can't operate and
// collapses now-empty containers (twist groups, program rows, super pools, media
// groups). Pure DOM pass driven by platform/auth's can().
import type { Capability } from '../../model/index.js';
import { can } from '../../platform/auth.js';

export function applyScope(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-cap]').forEach((el) => {
    const caps = (el.dataset.cap || '').split(/\s+/).filter(Boolean) as Capability[];
    if (caps.length === 0) return;
    el.style.display = caps.some((c) => can(c)) ? '' : 'none';
  });

  const isArranger = can('arrange') || can('admin');

  // Hide empty twist groups (destinations)
  root.querySelectorAll<HTMLElement>('details.twist-group').forEach((group) => {
    const twists = Array.from(group.querySelectorAll<HTMLElement>('.twist-container'));
    const hasVisibleChild = twists.some(c => c.style.display !== 'none');
    // If it has NO twists, only show it to arrangers. If it HAS twists, only show if at least one is visible.
    group.style.display = (twists.length === 0 && isArranger) || hasVisibleChild ? '' : 'none';
  });

  // Hide empty program rows (productions)
  root.querySelectorAll<HTMLElement>('.program-row').forEach((row) => {
    const twists = Array.from(row.querySelectorAll<HTMLElement>('.twist-container'));
    const hasVisibleChild = twists.some(c => c.style.display !== 'none');
    row.style.display = (twists.length === 0 && isArranger) || hasVisibleChild ? '' : 'none';
  });

  // Hide empty super pools (top-level source categories)
  root.querySelectorAll<HTMLElement>('.super-pool-container').forEach((pool) => {
    const inputs = Array.from(pool.querySelectorAll<HTMLElement>('.input-group'));
    const hasVisibleChild = inputs.some(c => c.style.display !== 'none');
    pool.style.display = (inputs.length === 0 && isArranger) || hasVisibleChild ? '' : 'none';
  });

  // Hide empty nested media groups
  const mediaGroups = Array.from(root.querySelectorAll<HTMLElement>('.media-group'));
  // Process deepest first so nested folders collapse correctly
  mediaGroups.reverse().forEach((group) => {
    const content = group.querySelector<HTMLElement>(':scope > .media-group-content');
    if (!content) return;
    const children = Array.from(content.children) as HTMLElement[];
    const hasVisibleChild = children.some(c => c.style.display !== 'none');
    group.style.display = (children.length === 0 && isArranger) || hasVisibleChild ? '' : 'none';
  });
}
