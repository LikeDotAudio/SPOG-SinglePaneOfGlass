// src/ui/console/captains-log-timeline-nav — the Timeline minimap's interaction:
// pan (drag the body), ZOOM by mouse-wheel (around the cursor), and ZOOM by dragging
// the viewport box's left/right handles (widen the box = see more = zoom out). Split
// out of captains-log-timeline (200-line rule). The view owns state; this wires events
// against a small context (current content width, the px/min zoom, and a re-render).
export interface NavCtx {
  width(): number;          // last rendered content width (px)
  px(): number;             // current px-per-minute zoom
  setPx(v: number): void;   // set the zoom
  rerender(): void;         // re-render the grid (no scroll reset)
}

const ZMIN = 0.4, ZMAX = 80;   // px-per-minute bounds
const GUTTER = 220;
const clampZ = (v: number): number => Math.max(ZMIN, Math.min(ZMAX, v));

export function wireNav(body: HTMLElement, nav: HTMLElement, ctx: NavCtx): void {
  // Wheel = zoom the time axis, keeping the instant under the cursor stationary.
  const zoomAt = (factor: number, clientX: number): void => {
    const r = body.getBoundingClientRect();
    const ax = clientX - r.left + body.scrollLeft;                 // content-x under cursor
    const old = ctx.px(), np = clampZ(old * factor);
    if (np === old) return;
    const t = (ax - GUTTER) / old;                                 // minutes under cursor
    ctx.setPx(np); ctx.rerender();
    body.scrollLeft = GUTTER + t * np - (clientX - r.left);        // put that minute back under the cursor
  };
  body.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX); }, { passive: false });

  // Pan (drag the bar) + resize (drag a handle → zoom).
  const frac = (clientX: number): number => { const r = nav.getBoundingClientRect(); return Math.max(0, Math.min(1, (clientX - r.left) / r.width)); };
  let mode: '' | 'pan' | 'l' | 'r' = '';
  const panTo = (clientX: number): void => { body.scrollLeft = frac(clientX) * body.scrollWidth - body.clientWidth / 2; };
  const resizeTo = (edge: 'l' | 'r', clientX: number): void => {
    const cw = ctx.width() || 1, targetX = frac(clientX) * cw, cvw = body.clientWidth;
    const left = edge === 'l' ? targetX : body.scrollLeft;
    const right = edge === 'r' ? targetX : body.scrollLeft + cvw;
    const winPx = Math.max(80, right - left);
    const np = clampZ(ctx.px() * (cvw / winPx));                   // fit the chosen window into the viewport
    const anchorFrac = (edge === 'l' ? right : left) / cw;         // the OTHER edge stays put
    ctx.setPx(np); ctx.rerender();
    const ncw = ctx.width();
    body.scrollLeft = edge === 'l' ? anchorFrac * ncw - cvw : anchorFrac * ncw;
  };
  nav.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement;
    mode = t.classList.contains('tl-nav-h') ? (t.dataset['h'] as 'l' | 'r') : 'pan';
    nav.setPointerCapture(e.pointerId);
    if (mode === 'pan') panTo(e.clientX);
  });
  nav.addEventListener('pointermove', (e) => { if (mode === 'pan') panTo(e.clientX); else if (mode) resizeTo(mode, e.clientX); });
  nav.addEventListener('pointerup', () => { mode = ''; });
  nav.addEventListener('pointercancel', () => { mode = ''; });
}
