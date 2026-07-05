// src/ui/console/authoring-zoom — scale + pan the room canvas for the single-pane
// AUTHORING layer ("scale it, move it around"). Split out of authoring.ts to keep
// each module under the 200-line rule. The per-room `views` map is the ONE owner of
// that mutable state — nothing else duplicates it.

import { isEditing, canArrange } from './authoring-commit.js';

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
export function wireZoomPan(frame: HTMLElement, body: HTMLElement, url: string, pct: HTMLElement): ZoomHandle {
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
