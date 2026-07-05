// src/ui/console/authoring — the single-pane AUTHORING layer over the destinations
// console (audit: docs/Audit /Routes-Editor-Single-Pane-Audit.md).
//
// The console renders rooms/productions read-only from JSON. This module turns that
// same rendered surface into an EDITOR: a body-level EDIT LAYOUT toggle reveals
// affordances that are always present in the DOM (so flipping the mode needs no
// re-render), and each gesture mutates the in-memory Production and saves a draft
// via routes-store — which fetchJSON reads back, so edits persist and re-render.
//
// What this slice ships (audit §3 grab-bag, §5 declaration, §6 backup, §7 persist):
//   • edit a ROOM's declaration        — name / colour / status
//   • edit a TWIST (container)          — name / accepts / row / caps / inputs / backup
//   • DELETE a container
//   • ADD a container from the grab-bag — the editor roster as droppable tools
//   • EXPORT drafts (L2) / REVERT all
// Drag-to-reorder, tree editing and the FS/server sink are later slices (§4D, §7 L3).
//
// This file is the slim orchestrator: decorateRoom + initAuthoring live here, and the
// heavy lifting is split into flat siblings (authoring-styles / -commit / -forms /
// -drag / -zoom) to hold every module under the 200-line rule. It re-exports the
// edit-mode/draft primitives so the public API (./authoring.js) stays byte-identical.

import { el } from '../dom.js';
import { draftCount, hasDraft, clearDraft, clearAllDrafts, exportDrafts, onDraftsChange } from '../../platform/routes-store.js';
import { onRoleChange } from '../../platform/auth.js';
import { getPrefs } from '../../platform/prefs.js';
import type { Production } from '../../model/index.js';
import { ensureStyles } from './authoring-styles.js';
import { commit, isEditing, setEditing, canBuild, canArrange, canEditLayout } from './authoring-commit.js';
import { editRoom, editTwist, addContainer } from './authoring-forms.js';
import { wireContainerDrag } from './authoring-drag.js';
import { wireZoomPan } from './authoring-zoom.js';

// ---- edit-mode state --------------------------------------------------------
function persistedOn(): boolean {
  return getPrefs().authoring === true;
}

// ---- decorate a rendered room pane (called by renderPrograms) ---------------
/**
 * Add authoring affordances to a freshly-rendered room pane. Idempotent per render
 * because renderPrograms rebuilds innerHTML each call; `rerender` re-invokes it with
 * the (mutated) same Production. `url` is the file the edits draft against.
 */
export function decorateRoom(pane: HTMLElement, pgm: Production, url: string | undefined, rerender: () => void): void {
  if (!url) return;
  ensureStyles();
  const title = pane.querySelector<HTMLElement>('.program-title');
  const row = pane.querySelector<HTMLElement>('.program-row');
  if (!title || !row) return;

  // Remember how to re-decorate this pane so a live role change re-applies rights.
  paneRerender.set(pane, rerender);

  // Room bar, just under the title.
  const bar = el('div', { class: 'auth-roombar auth-only' });
  // BUILD right — add / edit the room declaration & its containers.
  if (canBuild()) {
    const bEdit = el('button', { class: 'auth-btn' }, ['✎ Room']);
    const bAdd = el('button', { class: 'auth-btn add' }, ['＋ Add Container']);
    bEdit.onclick = (): void => editRoom(pgm, url, rerender);
    bAdd.onclick = (): void => addContainer(pgm, url, rerender);
    bar.append(bEdit, bAdd);
  }
  if (hasDraft(url)) bar.append(el('span', { class: 'auth-dirty' }, ['● edited']));

  // Scale / pan controls — ARRANGE right (Ctrl+wheel to zoom, drag empty canvas to pan).
  const body = pane.querySelector<HTMLElement>('.program-body');
  if (body && canArrange()) {
    const pct = el('span', { class: 'pct' }, ['100%']);
    const bOut = el('button', { title: 'Zoom out' }, ['−']);
    const bIn = el('button', { title: 'Zoom in' }, ['＋']);
    const bFit = el('button', { title: 'Reset zoom / position' }, ['⟲']);
    const zoom = wireZoomPan(row, body, url, pct);
    bOut.onclick = (): void => zoom.step(1 / 1.2);
    bIn.onclick = (): void => zoom.step(1.2);
    bFit.onclick = (): void => zoom.reset();
    bar.append(el('div', { class: 'auth-zoom' }, [bOut, pct, bIn, bFit]));
  }
  title.after(bar);

  // Per-container affordances (only where twists[] backs the DOM). BUILD gets the
  // edit / delete handles; ARRANGE gets draggability + the reorder/re-band wiring.
  if (Array.isArray(pgm.twists)) {
    const build = canBuild(), arrange = canArrange();
    pane.querySelectorAll<HTMLElement>('.twist-container[data-twist-index]').forEach((c) => {
      const idx = Number(c.dataset.twistIndex);
      if (!Number.isFinite(idx)) return;
      c.draggable = isEditing() && arrange;
      if (!build) return;
      const handle = el('div', { class: 'auth-handle auth-only' });
      const edit = el('div', { class: 'h edit', title: 'Edit container' }, ['✎']);
      const del = el('div', { class: 'h del', title: 'Delete container' }, ['✕']);
      edit.onclick = (e): void => { e.stopPropagation(); editTwist(pgm, idx, url, rerender); };
      del.onclick = (e): void => {
        e.stopPropagation();
        if (!pgm.twists) return;
        const t = pgm.twists[idx];
        const nm = typeof t === 'string' ? t : (t?.name ?? 'container');
        commit(pgm, url, rerender, () => `deleted container "${nm}"`, () => {
          pgm.twists = pgm.twists!.filter((_, i) => i !== idx);
        });
      };
      handle.append(edit, del);
      c.append(handle);
    });
    if (arrange) wireContainerDrag(pane, pgm, url, rerender);
  }
}

// ---- boot: the toggle chip + export/revert tools ----------------------------
// Per-pane rerender hooks, so a live role change re-applies the new rights to every
// already-rendered room (re-runs decorateRoom with the fresh can() results).
const paneRerender = new WeakMap<HTMLElement, () => void>();
function reapplyRightsToRenderedRooms(): void {
  document.querySelectorAll<HTMLElement>('.tab-content').forEach((pane) => {
    paneRerender.get(pane)?.();
  });
}

function downloadText(filename: string, text: string): void {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: filename });
  document.body.append(a); a.click(); a.remove();
}

/** Wire the EDIT LAYOUT toggle + drafts count + export/revert (call once at boot). */
export function initAuthoring(): void {
  ensureStyles();
  setEditing(persistedOn());

  const cnt = el('span', { class: 'cnt' }, [String(draftCount())]);
  const toggle = el('button', { class: 'authoring-toggle', title: 'Toggle single-pane layout editing' }, ['✎ Edit Layout', cnt]);
  toggle.onclick = (): void => setEditing(!isEditing());

  const bExport = el('button', {}, ['Export']);
  const bRevert = el('button', { class: 'revert' }, ['Revert All']);
  bExport.onclick = (): void => {
    if (!draftCount()) { alert('No edits to export yet.'); return; }
    downloadText('twist-routes-drafts.json', exportDrafts());
  };
  bRevert.onclick = (): void => {
    if (!draftCount()) return;
    if (confirm(`Discard all ${draftCount()} edited file(s) and reload from disk?`)) {
      clearAllDrafts();
      location.reload();
    }
  };
  const tools = el('div', { class: 'auth-tools auth-only' }, [bExport, bRevert]);

  // Seat the control at the production frame's top OUTER corner (the elbow spine
  // side). The frame is the positioning context; a chirality flip mirrors the dock
  // to the opposite corner via CSS, so it always tracks the production elbow.
  const dock = el('div', { class: 'auth-dock' }, [toggle, tools]);
  const frame = document.querySelector('.dest-frame');
  (frame ?? document.getElementById('production-content') ?? document.body).append(dock);
  // The dock is seated on the title rail, but the rail lives inside the
  // #production-content SCROLLER while the dock sits on the frame — ride the
  // scroll so the segment stays butted to the elbow instead of floating over
  // whatever scrolls underneath (the frame's overflow:hidden clips it away).
  const scroller = document.getElementById('production-content');
  scroller?.addEventListener('scroll', () => {
    dock.style.transform = `translateY(${-scroller.scrollTop}px)`;
  }, { passive: true });
  onDraftsChange(() => { cnt.textContent = String(draftCount()); });

  // Rights gate: the dock only shows if the operator can build OR arrange. On a
  // live role change, re-evaluate — hide it (and drop out of edit mode) for a role
  // with neither right, and re-apply per-room affordances for the new rights.
  const applyRights = (): void => {
    const allowed = canEditLayout();
    dock.style.display = allowed ? '' : 'none';
    if (!allowed && isEditing()) setEditing(false);
    reapplyRightsToRenderedRooms();
  };
  applyRights();
  onRoleChange(applyRights);
}

// re-export the edit-mode + draft primitives so the public API (./authoring.js) stays
// byte-identical for consumers that import them from here (future tree UI, etc.).
export { isEditing, setEditing } from './authoring-commit.js';
export { clearDraft };
