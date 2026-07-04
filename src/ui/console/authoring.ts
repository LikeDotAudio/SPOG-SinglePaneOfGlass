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

import { addStyles, el } from '../dom.js';
import { draftCount, putDraft, hasDraft, clearDraft, clearAllDrafts, exportDrafts, onDraftsChange } from '../../platform/routes-store.js';
import { logAction } from './captains-log.js';
import { can, onRoleChange } from '../../platform/auth.js';
import type { Production, TwistConfig, Accepts } from '../../model/index.js';

// The two authoring rights (audit §5/§6, split per the User-Rights matrix):
//   build   → add / edit / delete rooms & containers
//   arrange → move / reorder / re-band / scale / pan
// A user may hold `arrange` WITHOUT `build`: reshape the layout, but not author it.
const canBuild = (): boolean => can('build');
const canArrange = (): boolean => can('arrange');
const canEditLayout = (): boolean => canBuild() || canArrange();

const STYLE_ID = 'tr-authoring';
const ON_KEY = 'twist:authoring:on';

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
function commit(pgm: Production, url: string, rerender: () => void, describe: () => string, mutate: () => void): void {
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

// ---- CSS: affordances live in the DOM always, revealed only in authoring mode ---
const CSS = `
.auth-only{display:none !important;}
body.authoring .auth-only{display:flex !important;}

/* Seated at the production frame's top OUTER corner — the side the elbow spine sits
   on. The frame is the positioning context; the dock is absolute so it rides that
   corner and mirrors to the opposite edge on a chirality flip, tracking the elbow
   (spine is RIGHT in left-handed mode, LEFT in right-handed mode). */
.dest-frame{position:relative;}
/* The dock IS a segment of the production rail's elbow corner — not a pill floating
   over it. It seats exactly on the title rail band (frame padding 20px + content
   padding-top 24px → top:44px; rail height 35px), butt-joins the bar through a 4px
   black notch on the joining side, and its outer top corner carries the rail's 30px
   cap radius (Corner Law: round the terminating end, square the joining edges). */
.auth-dock{position:absolute;top:44px;right:26px;left:auto;height:35px;z-index:30;
  display:flex;align-items:stretch;gap:5px;flex-direction:row-reverse;padding:0;}
/* No destination loaded → no rail to seat on → the dock hides entirely. */
.dest-frame:not(:has(.program-row)) .auth-dock{display:none;}
.authoring-toggle{display:inline-flex;align-items:center;gap:8px;box-sizing:border-box;
  font:900 12px/1 Arial;letter-spacing:2px;text-transform:uppercase;color:#000;background:transparent;
  border:none;border-left:4px solid var(--bg-color,#050a15);
  padding:0 20px 0 14px;cursor:pointer;box-shadow:none;}
.authoring-toggle:hover{background:rgba(0,0,0,.16);}
.authoring-toggle .cnt{background:#03060f;color:#e0f0ff;border-radius:8px;padding:2px 6px;font-size:10px;min-width:8px;text-align:center;}
/* Authoring ON: the segment inverts — black fill, green text — so state is
   unmistakable while still reading as part of the bar. */
body.authoring .authoring-toggle{background:#03060f;color:#39D353;box-shadow:none;}
body.authoring .authoring-toggle .cnt{color:#39D353;}
.auth-tools{display:flex;gap:5px;align-items:center;}
/* Right-handed console: the elbow spine (and this dock) sit on the LEFT edge; the
   frame keeps 20px padding there to clear the pulse strip, so the rail starts x=20. */
html[data-chirality="right"] .auth-dock{right:auto;left:20px;flex-direction:row;}
html[data-chirality="right"] .authoring-toggle{padding:0 14px 0 20px;
  border-left:none;border-right:4px solid var(--bg-color,#050a15);}
.auth-tools button{font:900 10px/1 Arial;letter-spacing:1px;text-transform:uppercase;color:#000;
  border:none;border-radius:4px;padding:8px 12px;cursor:pointer;background:#C2B74B;}
.auth-tools .revert{background:#B46757;color:#fff;}

.auth-roombar{gap:6px;margin:6px 0 8px;flex-wrap:wrap;align-items:center;}
.auth-btn{font:900 10px/1 Arial;letter-spacing:1px;text-transform:uppercase;color:#000;background:#C2B74B;
  border:none;border-radius:4px;padding:7px 11px;cursor:pointer;}
.auth-btn.add{background:#39D353;}
.auth-dirty{font:900 9px/1 Arial;letter-spacing:1px;text-transform:uppercase;color:#39D353;padding-left:4px;}

.twist-container .auth-handle{position:absolute;top:2px;right:2px;z-index:6;gap:3px;}
.twist-container .auth-handle .h{width:19px;height:19px;border-radius:4px;display:flex;align-items:center;
  justify-content:center;font:900 12px/1 Arial;color:#000;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.5);}
.twist-container .auth-handle .edit{background:#C2B74B;}
.twist-container .auth-handle .del{background:#B46757;color:#fff;}

.auth-modal-bg{position:fixed;inset:0;z-index:2600;background:rgba(3,6,15,.72);display:flex;
  align-items:center;justify-content:center;font-family:Arial;}
.auth-modal{background:#0d1730;border:2px solid #C678C6;border-radius:12px;min-width:320px;
  max-width:min(94vw,540px);max-height:88vh;overflow:auto;padding:16px 18px;color:#e0f0ff;}
.auth-modal h3{margin:0 0 12px;color:#C678C6;font-size:13px;letter-spacing:2px;text-transform:uppercase;}
.auth-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;}
.auth-field label{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8fb4d8;}
.auth-field input,.auth-field select,.auth-field textarea{background:#03060f;border:1px solid #35507a;
  border-radius:5px;color:#e0f0ff;padding:7px 9px;font:13px Arial;width:100%;box-sizing:border-box;}
.auth-hint{font-size:10px;color:#6f8db0;margin:-4px 0 10px;}
.auth-modal .rowbtn{display:flex;gap:8px;justify-content:flex-end;margin-top:6px;}
.auth-modal .rowbtn button{font:900 11px/1 Arial;letter-spacing:1px;text-transform:uppercase;border:none;
  border-radius:5px;padding:9px 16px;cursor:pointer;}
.auth-modal .ok{background:#39D353;color:#000;}
.auth-modal .cancel{background:#35507a;color:#e0f0ff;}
.auth-palette{display:flex;flex-wrap:wrap;gap:6px;}
.auth-palette .tool{background:#1a2b4a;border:1px solid #35507a;border-radius:6px;padding:9px 11px;
  cursor:pointer;font-size:12px;color:#cfe6ff;}
.auth-palette .tool:hover{background:#25406e;border-color:#C678C6;}

/* scale + pan the room canvas (Ctrl/⌘+wheel to zoom, drag empty space to pan). */
.auth-zoom{display:flex;align-items:center;gap:3px;margin-left:auto;}
.auth-zoom button{font:900 12px/1 Arial;color:#000;background:#8fb4d8;border:none;border-radius:4px;
  width:26px;height:26px;cursor:pointer;}
.auth-zoom .pct{font:900 10px/1 Arial;color:#8fb4d8;min-width:38px;text-align:center;}
body.authoring .program-body{will-change:transform;transform-origin:0 0;}
body.authoring .program-row{cursor:default;}
body.authoring .program-row.panning{cursor:grabbing;}

/* drag-to-move a container (audit §4D). Reveal a grab cursor + drop targets. */
body.authoring .twist-container{cursor:grab;}
body.authoring .twist-container.twist-dragging{opacity:.35;cursor:grabbing;}
body.authoring .twist-container.twist-drop-before{box-shadow:-4px 0 0 0 #C678C6, 0 0 10px rgba(198,120,198,.6) !important;}
body.authoring .twist-container.twist-drop-after{box-shadow:4px 0 0 0 #C678C6, 0 0 10px rgba(198,120,198,.6) !important;}
`;

// ---- edit-mode state --------------------------------------------------------
function persistedOn(): boolean {
  try { return localStorage.getItem(ON_KEY) === '1'; } catch { return false; }
}
export function isEditing(): boolean { return document.body.classList.contains('authoring'); }
export function setEditing(on: boolean): void {
  document.body.classList.toggle('authoring', on);
  try { localStorage.setItem(ON_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  // Toggling doesn't re-render, so flip draggability on already-rendered containers
  // (only when the operator holds the `arrange` right).
  const drag = on && canArrange();
  document.querySelectorAll<HTMLElement>('.twist-container[data-twist-index]').forEach((c) => { c.draggable = drag; });
}

// ---- the grab-bag: the editor roster as container factories (audit §3A) ------
// Each tool emits a TwistConfig whose `name` an editor's match() will claim, so a
// dropped tool and a hand-typed twist are the same thing. `n` disambiguates repeats.
interface Tool { label: string; make: (n: number) => TwistConfig }
const TOOLS: Tool[] = [
  { label: 'Camera', make: (n) => ({ name: `CAM ${n}`, accepts: 'camera', maxVideo: 1, row: 'cameras', cameraInput: true }) },
  { label: 'Remote', make: (n) => ({ name: `REMOTE ${n}`, accepts: 'camera', maxVideo: 1, row: 'remotes', cameraInput: true }) },
  { label: 'Monitor', make: (n) => ({ name: `Monitor ${n}`, accepts: 'video', maxVideo: 1, monitor: true }) },
  { label: 'Vision Mixer', make: () => ({ name: 'Video Mixer', accepts: 'video', inputs: ['SW 1', 'SW 2', 'SW 3', 'SW 4'] }) },
  { label: 'Multi-Viewer', make: (n) => ({ name: `Multi Viewer ${n}`, accepts: 'both', inputs: ['MV 1', 'MV 2', 'MV 3', 'MV 4'] }) },
  { label: 'ISO Recorder', make: (n) => ({ name: `ISO ${n}`, accepts: 'both', maxVideo: 1, maxAudio: 16, row: 'iso', inputs: ['TRK 1', 'TRK 2'] }) },
  { label: 'Audio Mixer', make: () => ({ name: 'MONITOR CONSOLE', accepts: 'audio', inputs: ['CH 1', 'CH 2', 'CH 3', 'CH 4'] }) },
  { label: 'Audio Positioner', make: () => ({ name: 'AUDIO POSITIONER', accepts: 'audio', inputs: ['CH 1', 'CH 2', 'CH 3', 'CH 4'] }) },
  { label: 'Audio Monitor', make: (n) => ({ name: `Audio Monitor ${n}`, accepts: 'audio', maxAudio: 1, row: 'audiomon' }) },
  { label: 'Intercom', make: () => ({ name: 'Intercom', accepts: 'audio', inputs: ['ICOM 1', 'ICOM 2', 'ICOM 3', 'ICOM 4'] }) },
  { label: 'IFB', make: (n) => ({ name: `IFB ${n}`, accepts: 'audio', maxAudio: 1, row: 'ifb' }) },
  { label: 'Graphics', make: () => ({ name: 'GRAPHICS', accepts: 'both', row: 'graphics', inputs: ['LOWER THIRD', 'NAME SUPER', 'FULL-SCREEN TITLE', 'TICKER'] }) },
  { label: 'Lighting', make: () => ({ name: 'Lighting', accepts: 'both', row: 'lighting' }) },
  { label: 'Signaling', make: () => ({ name: 'Tally', accepts: 'both', row: 'signaling' }) },
  { label: 'Encoder', make: () => ({ name: 'Encoder', accepts: 'both' }) },
];

// ---- tiny LCARS form modal --------------------------------------------------
type FieldKind = 'text' | 'color' | 'number' | 'select' | 'list';
interface Field { key: string; label: string; kind: FieldKind; value: string; options?: string[]; hint?: string }

function openForm(title: string, fields: Field[], onSave: (v: Record<string, string>) => void): void {
  const inputs: Record<string, HTMLInputElement | HTMLSelectElement> = {};
  const body = el('div', { class: 'auth-modal' }, [el('h3', {}, [title])]);
  for (const f of fields) {
    let input: HTMLInputElement | HTMLSelectElement;
    if (f.kind === 'select') {
      input = el('select', {}, (f.options ?? []).map((o) => {
        const opt = el('option', { value: o }, [o || '(none)']);
        if (o === f.value) opt.selected = true;
        return opt;
      }));
    } else {
      input = el('input', {
        type: f.kind === 'color' ? 'color' : f.kind === 'number' ? 'number' : 'text',
        value: f.value,
      });
    }
    inputs[f.key] = input;
    const field = el('div', { class: 'auth-field' }, [el('label', {}, [f.label]), input]);
    body.append(field);
    if (f.hint) body.append(el('div', { class: 'auth-hint' }, [f.hint]));
  }
  const bg = el('div', { class: 'auth-modal-bg' }, [body]);
  const cancel = el('button', { class: 'cancel' }, ['Cancel']);
  const ok = el('button', { class: 'ok' }, ['Save']);
  body.append(el('div', { class: 'rowbtn' }, [cancel, ok]));
  const closeModal = (): void => bg.remove();
  cancel.onclick = closeModal;
  bg.onclick = (e): void => { if (e.target === bg) closeModal(); };
  ok.onclick = (): void => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(inputs)) out[k] = inputs[k]!.value;
    closeModal();
    onSave(out);
  };
  document.body.append(bg);
}

// comma-list <-> string[] helpers
const toList = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
const fromList = (a?: string[]): string => (a ?? []).join(', ');
const numOrUndef = (s: string): number | undefined => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : undefined; };

// ---- the room-level forms ---------------------------------------------------
function editRoom(pgm: Production, url: string, rerender: () => void): void {
  openForm('Edit Room / Production', [
    { key: 'name', label: 'Name', kind: 'text', value: pgm.name ?? '' },
    { key: 'color', label: 'Colour', kind: 'color', value: pgm.color ?? '#ffaa00' },
    { key: 'status', label: 'Status', kind: 'select', value: pgm.status ?? 'OK', options: ['OK', 'FAULT', 'OFFLINE', 'STANDBY'] },
  ], (v) => {
    commit(pgm, url, rerender, () => `room set to "${pgm.name}" · ${pgm.status}`, () => {
      pgm.name = v.name ?? pgm.name;
      pgm.color = (v.color as Production['color']) ?? pgm.color;
      pgm.status = v.status || 'OK';
    });
  });
}

function editTwist(pgm: Production, idx: number, url: string, rerender: () => void): void {
  if (!pgm.twists || !pgm.twists[idx]) return;
  const cur = pgm.twists[idx];
  const cfg: TwistConfig = typeof cur === 'string' ? { name: cur } : { ...cur };
  openForm(`Edit Container — ${cfg.name}`, [
    { key: 'name', label: 'Name', kind: 'text', value: cfg.name ?? '', hint: 'The name decides which editor (tool) opens on click.' },
    { key: 'accepts', label: 'Accepts', kind: 'select', value: cfg.accepts ?? '', options: ['', 'video', 'audio', 'both', 'camera'] },
    { key: 'row', label: 'Row / band', kind: 'select', value: cfg.row ?? '', options: ['', 'cameras', 'remotes', 'monitors', 'iso', 'graphics', 'speaker', 'audiomon', 'ifb', 'lighting', 'signaling'] },
    { key: 'maxVideo', label: 'Max video', kind: 'number', value: cfg.maxVideo != null ? String(cfg.maxVideo) : '' },
    { key: 'maxAudio', label: 'Max audio', kind: 'number', value: cfg.maxAudio != null ? String(cfg.maxAudio) : '' },
    { key: 'inputs', label: 'Inputs (comma-separated)', kind: 'list', value: fromList(cfg.inputs) },
    { key: 'backup', label: 'Backup / secondary feeds (comma-separated)', kind: 'list', value: fromList(cfg.backup?.inputs), hint: 'Failover sources used when the primary faults (audit §6).' },
    { key: 'backupMode', label: 'Backup mode', kind: 'select', value: cfg.backup?.mode ?? 'warm', options: ['hot', 'warm', 'manual'] },
  ], (v) => {
    commit(pgm, url, rerender, () => `container "${v.name || cfg.name}" edited`, () => {
      const next: TwistConfig = { ...cfg, name: v.name || cfg.name };
      next.accepts = (v.accepts || undefined) as Accepts | undefined;
      next.row = v.row || undefined;
      next.maxVideo = numOrUndef(v.maxVideo ?? '');
      next.maxAudio = numOrUndef(v.maxAudio ?? '');
      const inputs = toList(v.inputs ?? '');
      next.inputs = inputs.length ? inputs : undefined;
      const backup = toList(v.backup ?? '');
      next.backup = backup.length ? { inputs: backup, mode: (v.backupMode as 'hot' | 'warm' | 'manual') } : undefined;
      pgm.twists![idx] = next;
    });
  });
}

/** The grab-bag: pick a tool → append a container to the room (audit §3A / §8). */
function addContainer(pgm: Production, url: string, rerender: () => void): void {
  const body = el('div', { class: 'auth-modal' }, [el('h3', {}, ['Add Container — Grab Bag'])]);
  const bg = el('div', { class: 'auth-modal-bg' }, [body]);
  const palette = el('div', { class: 'auth-palette' });
  const nextN = (base: string): number => {
    const stem = base.replace(/\s*\d+$/, '');
    const used = (pgm.twists ?? []).map((t) => (typeof t === 'string' ? t : t.name))
      .filter((nm) => nm.replace(/\s*\d+$/, '') === stem).length;
    return used + 1;
  };
  for (const tool of TOOLS) {
    const chip = el('div', { class: 'tool' }, [tool.label]);
    chip.onclick = (): void => {
      const cfg = tool.make(nextN(tool.make(1).name));
      bg.remove();
      commit(pgm, url, rerender, () => `added container "${cfg.name}"`, () => {
        pgm.twists = [...(pgm.twists ?? []), cfg];
      });
    };
    palette.append(chip);
  }
  body.append(palette);
  const cancel = el('button', { class: 'cancel' }, ['Close']);
  body.append(el('div', { class: 'rowbtn' }, [cancel]));
  cancel.onclick = (): void => bg.remove();
  bg.onclick = (e): void => { if (e.target === bg) bg.remove(); };
  document.body.append(bg);
}

// ---- drag a container to a new position / band (audit §4D) ------------------
/**
 * Wire container-move drag on one room pane. A container carries an EMPTY text/plain
 * payload, so the matrix's own drop handler (which needs feed ids) bails — the two
 * drag kinds never collide. Dropping onto another container reorders `twists[]` and
 * makes the moved container ADOPT that container's row (band), so a drop is both a
 * reorder and a re-band. Dropping on empty space appends. `dragIdx` is per-pane
 * closure state (one drag at a time, within a pane).
 */
function wireContainerDrag(pane: HTMLElement, pgm: Production, url: string, rerender: () => void): void {
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

// ---- scale + pan the room canvas ("scale it, move it around") ---------------
// A per-room view transform (zoom + offset) applied to `.program-body`, so the
// title and edit bar stay fixed while the containers scale/pan. Kept in memory and
// re-applied after each rerender, so an edit doesn't reset your zoom. Reorder drag
// still works under transform (drop math is all screen-space getBoundingClientRect).
interface View { s: number; x: number; y: number }
const views = new Map<string, View>();
const getView = (url: string): View => { let v = views.get(url); if (!v) { v = { s: 1, x: 0, y: 0 }; views.set(url, v); } return v; };
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
function applyView(body: HTMLElement, v: View): void {
  body.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
}

interface ZoomHandle { step: (factor: number) => void; reset: () => void }

/** Wire Ctrl/⌘+wheel zoom (about the pointer), background-drag pan, and return a
 *  handle for the zoom buttons. `frame` (the .program-row) is the coordinate
 *  reference; `body` (the .program-body) is what scales/translates. */
function wireZoomPan(frame: HTMLElement, body: HTMLElement, url: string, pct: HTMLElement): ZoomHandle {
  const v = getView(url);
  const paint = (): void => { applyView(body, v); pct.textContent = Math.round(v.s * 100) + '%'; };
  paint();

  const zoomAbout = (factor: number, px: number, py: number): void => {
    const ns = clamp(v.s * factor, 0.2, 3);
    const wx = (px - v.x) / v.s, wy = (py - v.y) / v.s;   // world point under the anchor
    v.x = px - wx * ns; v.y = py - wy * ns; v.s = ns;     // keep that point pinned
    paint();
  };
  pct.dataset.zoomBound = '1';

  frame.addEventListener('wheel', (e) => {
    if (!isEditing() || !canArrange() || !(e.ctrlKey || e.metaKey)) return;   // plain wheel still scrolls the console
    e.preventDefault();
    const r = frame.getBoundingClientRect();
    zoomAbout(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // Background-drag pan: only when the press lands on empty canvas (not a container,
  // control, or feed), so it never fights container-move drag or clicks.
  let panning = false; let sx = 0, sy = 0, ox = 0, oy = 0;
  frame.addEventListener('pointerdown', (e) => {
    if (!isEditing() || !canArrange() || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.twist-container, button, .auth-handle, .signal-node, .twist-lip, .twist-foldbar, .auth-roombar')) return;
    panning = true; sx = e.clientX; sy = e.clientY; ox = v.x; oy = v.y;
    frame.classList.add('panning');
    frame.setPointerCapture(e.pointerId);
  });
  frame.addEventListener('pointermove', (e) => {
    if (!panning) return;
    v.x = ox + (e.clientX - sx); v.y = oy + (e.clientY - sy);
    applyView(body, v);
  });
  const endPan = (): void => { panning = false; frame.classList.remove('panning'); };
  frame.addEventListener('pointerup', endPan);
  frame.addEventListener('pointercancel', endPan);

  return {
    step: (factor): void => { const r = frame.getBoundingClientRect(); zoomAbout(factor, r.width / 2, r.height / 2); },
    reset: (): void => { v.s = 1; v.x = 0; v.y = 0; paint(); },
  };
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
function ensureStyles(): void { addStyles(STYLE_ID, CSS); }

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

// re-export so callers can revert a single file if needed (future tree UI)
export { clearDraft };
