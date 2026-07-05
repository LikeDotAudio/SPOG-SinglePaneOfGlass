// src/ui/console/matrix-crosspoints — number each routed feed 1..N, drag-to-reorder
// within a drop-zone (blinking insertion caret), and drag-out-to-un-route. Split out
// of matrix.ts (audit §5.3). Owns the drag state (draggingXp/xpCaret).
import { updateTwistVisuals } from './helix.js';
import { addStyles } from '../dom.js';
import { logAction } from './captains-log.js';
import { publishCrosspoints } from './matrix-place.js';

// ---- crosspoints: number each routed feed 1..N (add order) + drag-to-reorder ---
const XP_CSS = `
.drop-zone{position:relative;}
.drop-zone > .signal-node{position:relative;}
.drop-zone > .signal-node::before{content:attr(data-xp);position:absolute;top:-7px;left:-7px;min-width:15px;height:15px;
    box-sizing:border-box;border-radius:8px;background:#6FC8F0;color:#04121f;font:bold 9px sans-serif;
    display:flex;align-items:center;justify-content:center;padding:0 3px;z-index:4;box-shadow:0 1px 3px rgba(0,0,0,.55);pointer-events:none;}
.drop-zone > .signal-node[draggable=true]{cursor:grab;}
.drop-zone > .signal-node.xp-drag{opacity:.4;}
/* Dragging a crosspoint OUT of its drop-zone removes the route — tint it red
   while the pointer is outside so the "drop here to un-route" intent is clear. */
.drop-zone > .signal-node.xp-remove{opacity:.55;outline:2px dashed #ff5a5a;outline-offset:1px;filter:saturate(1.5) brightness(1.05);}
.drop-zone.xp-eject{outline:2px dashed rgba(255,90,90,.35);outline-offset:2px;}
/* Word-processor insertion caret: a blinking vertical bar marking where the
   dragged feed will land between the existing crosspoints. */
.drop-zone > .xp-caret{flex:0 0 auto;width:3px;align-self:stretch;min-height:22px;margin:0 -1px;border-radius:2px;
    background:#6FC8F0;box-shadow:0 0 7px #6FC8F0;pointer-events:none;animation:xp-caret-blink 1s steps(2,start) infinite;}
@keyframes xp-caret-blink{50%{opacity:.2;}}
`;
let draggingXp: HTMLElement | null = null;
let xpCaret: HTMLElement | null = null;

/** The shared blinking caret element (created once, re-parented as it moves). */
function ensureCaret(): HTMLElement {
  if (!xpCaret) { xpCaret = document.createElement('div'); xpCaret.className = 'xp-caret'; }
  return xpCaret;
}
function removeCaret(): void { xpCaret?.remove(); }

/** Number every crosspoint (drop-zone child) 1..N in add (DOM) order. */
export function renumberCrosspoints(dz: HTMLElement): void {
  dz.querySelectorAll<HTMLElement>(':scope > .signal-node').forEach((n, i) => { n.dataset.xp = String(i + 1); });
}

/** Which sibling the dragged crosspoint should be inserted before (flex-wrap aware). */
function xpInsertBefore(dz: HTMLElement, x: number, y: number): HTMLElement | null {
  const els = [...dz.querySelectorAll<HTMLElement>(':scope > .signal-node')].filter((e) => e !== draggingXp && e !== xpCaret);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (y < r.top + r.height / 2) return el;                       // pointer above this row
    if (y < r.bottom && x < r.left + r.width / 2) return el;       // same row, left of centre
  }
  return null;
}

/** True when a pointer position falls outside a drop-zone's box (with a small
 *  slack so a feed nudged just past the edge isn't accidentally ejected). */
function outsideZone(dz: HTMLElement, x: number, y: number): boolean {
  if (x === 0 && y === 0) return false;   // some browsers report (0,0) on cancel
  const r = dz.getBoundingClientRect();
  const pad = 6;
  return x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad;
}

/** Un-route a crosspoint: remove it, renumber/republish, and log with undo. */
function removeCrosspoint(node: HTMLElement, dz: HTMLElement): void {
  const twist = dz.closest<HTMLElement>('.twist-container');
  const label = (node.textContent ?? '').trim().split('\n')[0] ?? 'feed';
  const twistName = (twist?.querySelector('.twist-title')?.textContent ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const next = node.nextElementSibling;                 // remember slot for undo
  node.classList.remove('xp-drag', 'xp-remove');
  node.remove();
  renumberCrosspoints(dz);
  if (twist) { updateTwistVisuals(twist); publishCrosspoints(twist); }
  logAction(`Route removed: ${label}${twistName ? ` from ${twistName}` : ''}`, () => {
    if (next && next.parentElement === dz) dz.insertBefore(node, next); else dz.appendChild(node);
    makeCrosspointDraggable(node);
    renumberCrosspoints(dz);
    if (twist) { updateTwistVisuals(twist); publishCrosspoints(twist); }
  });
}

function makeCrosspointDraggable(node: HTMLElement): void {
  node.draggable = true;
  if (node.dataset.xpWired) return;
  node.dataset.xpWired = '1';
  let startDz: HTMLElement | null = null;
  node.addEventListener('dragstart', (e) => {
    draggingXp = node; startDz = node.parentElement as HTMLElement | null;
    node.classList.add('xp-drag'); e.stopPropagation();
    if (e.dataTransfer) { e.dataTransfer.setData('text/plain', ''); e.dataTransfer.effectAllowed = 'move'; }
  });
  // Live feedback: tint the feed (and its zone) red while the pointer is outside.
  node.addEventListener('drag', (e) => {
    if (!startDz) return;
    const out = outsideZone(startDz, e.clientX, e.clientY);
    node.classList.toggle('xp-remove', out);
    startDz.classList.toggle('xp-eject', out);
  });
  node.addEventListener('dragend', (e) => {
    const dz = startDz; startDz = null; draggingXp = null;
    removeCaret();
    node.classList.remove('xp-drag');
    dz?.classList.remove('xp-eject');
    if (dz && outsideZone(dz, e.clientX, e.clientY)) { removeCrosspoint(node, dz); return; }
    node.classList.remove('xp-remove');
    if (dz) renumberCrosspoints(dz);
  });
}

/** Wire a drop-zone to reorder its own crosspoints (idempotent). External source
 *  drops (draggingXp === null) fall through untouched to the twist's drop handler. */
function wireDropZoneReorder(dz: HTMLElement): void {
  if (dz.dataset.reorderWired) return;
  dz.dataset.reorderWired = '1';
  // The dragged feed stays put (dimmed); a blinking caret previews the drop point.
  dz.addEventListener('dragover', (e) => {
    if (!draggingXp || draggingXp.parentElement !== dz) return;
    e.preventDefault(); e.stopPropagation();
    const caret = ensureCaret();
    const before = xpInsertBefore(dz, e.clientX, e.clientY);
    if (before) dz.insertBefore(caret, before); else dz.appendChild(caret);
  });
  dz.addEventListener('dragleave', (e) => {
    // Only drop the caret when the pointer actually leaves the zone (not on hops
    // between child crosspoints), so it doesn't flicker mid-drag.
    if (draggingXp && !dz.contains(e.relatedTarget as Node | null)) removeCaret();
  });
  dz.addEventListener('drop', (e) => {
    if (!draggingXp || draggingXp.parentElement !== dz) return;
    e.preventDefault(); e.stopPropagation();
    if (xpCaret && xpCaret.parentElement === dz) dz.insertBefore(draggingXp, xpCaret);
    removeCaret();
    renumberCrosspoints(dz);
    const twist = dz.closest<HTMLElement>('.twist-container');
    if (twist) { updateTwistVisuals(twist); publishCrosspoints(twist); }
  });
}

/** Finalise a drop-zone after routing: style, number, and make crosspoints reorderable. */
export function refreshCrosspoints(dz: HTMLElement): void {
  addStyles('crosspoint-styles', XP_CSS);
  dz.querySelectorAll<HTMLElement>(':scope > .signal-node').forEach(makeCrosspointDraggable);
  wireDropZoneReorder(dz);
  renumberCrosspoints(dz);
}
