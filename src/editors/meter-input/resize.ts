// src/editors/meter-input/resize — wheel-to-resize for the scope cards. Split from
// index.ts: the mouse WHEEL over a scope grows/shrinks its BOX (snapping the card
// WIDTH to 1/2 · 1/3 · 1/4 · 1/6 · 1/8 of the grid width, height tracking width to
// keep aspect) and redraws the backing crisp — it does NOT scale the image.
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export interface ResizeCanvases {
  parade: HTMLElement; chroma: HTMLElement; vec: HTMLElement; gonio: HTMLElement; rgba: HTMLElement;
  stack: HTMLElement; cie: HTMLElement; diamond: HTMLElement; hsl: HTMLElement; wave: HTMLElement;
}

export function wireWheelResize(cv: ResizeCanvases, cardVideo: HTMLElement): void {
  const SIZE_FRACS = [1 / 8, 1 / 6, 1 / 4, 1 / 3, 1 / 2];
  const syncBacking = (host: HTMLElement): void => {
    host.querySelectorAll<HTMLCanvasElement>('.mi-scope canvas').forEach((c) => {
      const r = c.getBoundingClientRect();
      if (r.width >= 1 && r.height >= 1) { c.width = Math.round(r.width); c.height = Math.round(r.height); }
    });
  };
  const wheelResize = (cv: HTMLElement, target?: HTMLElement): void => {
    const card = target ?? cv.closest<HTMLElement>('.mi-card, .mi-vidcard');
    if (!card) return;
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const gw = card.closest<HTMLElement>('.mi-grid')?.clientWidth || card.offsetWidth || 1;
      const curFrac = card.offsetWidth / gw;
      let idx = 0, best = Infinity;
      SIZE_FRACS.forEach((f, i) => { const d = Math.abs(f - curFrac); if (d < best) { best = d; idx = i; } });
      idx = clamp(idx + (e.deltaY < 0 ? 1 : -1), 0, SIZE_FRACS.length - 1);
      const frac = SIZE_FRACS[idx] ?? 0.25;
      const aspect = card.offsetHeight / Math.max(1, card.offsetWidth);
      const w = Math.round(frac * gw);
      card.style.width = `${w}px`;
      card.style.height = `${Math.round(w * aspect)}px`;
      syncBacking(card);   // redraw crisp at the new size, don't stretch the backing
    }, { passive: false });
  };
  wheelResize(cv.parade); wheelResize(cv.chroma); wheelResize(cv.vec); wheelResize(cv.gonio);
  wheelResize(cv.rgba); wheelResize(cv.stack); wheelResize(cv.cie); wheelResize(cv.diamond); wheelResize(cv.hsl);
  wheelResize(cv.wave, cardVideo);   // the luma waveform's width is frame-locked to the video card → resize the pair
}
