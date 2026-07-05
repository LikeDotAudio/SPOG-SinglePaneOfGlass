// src/ui/console/authoring-commit — edit-mode state, authoring rights, and the
// reversible commit pipeline for the single-pane AUTHORING layer. Split out of
// authoring.ts to keep each module under the 200-line rule. These are the shared
// primitives the form / drag / zoom siblings all build on, so they live in ONE
// module and everyone imports them from here (no duplicated mutable state).

import { putDraft, hasDraft, clearDraft } from '../../platform/routes-store.js';
import { logAction } from './captains-log.js';
import { can } from '../../platform/auth.js';
import { patchPrefs } from '../../platform/prefs.js';
import type { Production } from '../../model/index.js';

// The two authoring rights (audit §5/§6, split per the User-Rights matrix):
//   build   → add / edit / delete rooms & containers
//   arrange → move / reorder / re-band / scale / pan
// A user may hold `arrange` WITHOUT `build`: reshape the layout, but not author it.
export const canBuild = (): boolean => can('build');
export const canArrange = (): boolean => can('arrange');
export const canEditLayout = (): boolean => canBuild() || canArrange();

// ---- Captain's Log for layout edits -----------------------------------------
// Every Edit-Layout change is snapshotted, applied, then narrated to the Captain's
// Log with an undo that restores the pre-edit Production and its draft state — so
// "Reverse Course" undoes a rename / add / delete / re-order just like a route.
const snapshot = (p: Production): Production => JSON.parse(JSON.stringify(p)) as Production;
function restore(p: Production, snap: Production): void {
  const rec = p as unknown as Record<string, unknown>;
  for (const k of Object.keys(p)) delete rec[k];
  Object.assign(p, snap);
}
/** Apply a layout mutation, persist it, re-render, and log a reversible entry. */
export function commit(pgm: Production, url: string, rerender: () => void, describe: () => string, mutate: () => void): void {
  const before = snapshot(pgm);
  const wasDraft = hasDraft(url);
  mutate();
  const text = describe();
  putDraft(url, pgm);
  rerender();
  logAction(`Layout · ${pgm.name} — ${text}`, () => {
    restore(pgm, before);
    if (wasDraft) putDraft(url, pgm); else clearDraft(url);
    rerender();
  });
}

// ---- edit-mode state --------------------------------------------------------
export function isEditing(): boolean { return document.body.classList.contains('authoring'); }
export function setEditing(on: boolean): void {
  document.body.classList.toggle('authoring', on);
  patchPrefs({ authoring: on });
  // Toggling doesn't re-render, so flip draggability on already-rendered containers
  // (only when the operator holds the `arrange` right).
  const drag = on && canArrange();
  document.querySelectorAll<HTMLElement>('.twist-container[data-twist-index]').forEach((c) => { c.draggable = drag; });
}
