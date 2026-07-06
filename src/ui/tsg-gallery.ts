// src/ui/tsg-gallery — the shared Test Signal Generator PICKER.
//
// A gallery of every registered TSG pattern, grouped SDR / HDR, each tile a live
// canvas preview that SELECTS the pattern on click. Every tile carries the pattern's
// spec explanation as a hover TOOLTIP (title=) and a corner ⓘ that LINKS to the
// governing SMPTE / EBU / ITU / VESA document (opens in a new tab) — verbatim from
// the pattern catalogue. Reused by the TSG editor and the meter-input test tools so
// both share one selector, one look, one source of truth.

import { el, addStyles } from './dom.js';
import type { Disposer } from './timers.js';
import { byGroup, drawTsg, type TsgPattern } from '../domain/tsg/index.js';

const CSS = `
.tsg-gal{display:flex;flex-direction:column;gap:10px;}
.tsg-grp-h{font:700 11px/1 var(--lcars-font,'Antonio',sans-serif);letter-spacing:2px;
  color:#8fa9c8;margin:4px 2px 0;text-transform:uppercase;}
.tsg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;}
.tsg-tile{position:relative;border:2px solid #223047;border-radius:8px;overflow:hidden;
  background:#05070c;cursor:pointer;transition:border-color .12s,transform .12s;}
.tsg-tile:hover{transform:translateY(-1px);border-color:#3f628f;}
.tsg-tile.sel{border-color:var(--lcars-color,#ff9640);box-shadow:0 0 0 1px var(--lcars-color,#ff9640) inset;}
.tsg-tile canvas{display:block;width:100%;aspect-ratio:16/9;background:#000;}
.tsg-cap{font:600 10px/1.2 var(--lcars-font,'Antonio',sans-serif);letter-spacing:.4px;
  color:#dbe7f5;padding:5px 7px;background:rgba(6,12,22,.85);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.tsg-doc{position:absolute;top:5px;right:5px;width:18px;height:18px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font:700 11px/1 sans-serif;
  color:#cfe0f5;background:rgba(6,12,22,.72);text-decoration:none;border:1px solid #34517a;}
.tsg-doc:hover{background:var(--lcars-color,#ff9640);color:#05070c;}
`;

export interface TsgGallery {
  root: HTMLElement;
  /** Reflect an externally-changed selection (highlight the matching tile). */
  select(id: string): void;
}

export interface GalleryOpts {
  /** Currently-selected pattern id (highlights that tile). */
  selected?: string;
  /** Called when the operator clicks a tile to choose a pattern. */
  onPick: (p: TsgPattern) => void;
  /** Host lifecycle bag — the shared preview rAF ticker registers here. */
  dispose: Disposer;
}

/** Build the picker gallery. One shared rAF paints every visible preview canvas. */
export function buildTsgGallery(opts: GalleryOpts): TsgGallery {
  addStyles('tsg-gallery', CSS);
  const root = el('div', { class: 'tsg-gal' });
  const tiles: Array<{ id: string; tile: HTMLElement; cvs: HTMLCanvasElement }> = [];
  let current = opts.selected ?? '';

  for (const [grp, pats] of byGroup()) {
    if (!pats.length) continue;
    root.append(el('div', { class: 'tsg-grp-h' }, [grp === 'HDR' ? 'HDR · Rec. 2100' : 'SDR · Rec. 709']));
    const grid = el('div', { class: 'tsg-grid' });
    for (const p of pats) grid.append(makeTile(p));
    root.append(grid);
  }

  function makeTile(p: TsgPattern): HTMLElement {
    const cvs = el('canvas', { class: 'tsg-cvs' });
    // ⓘ links to the governing document; click it WITHOUT selecting the tile.
    const doc = el('a', {
      class: 'tsg-doc', href: p.href, title: p.title, target: '_blank', rel: 'noopener noreferrer',
    }, ['ⓘ']);
    doc.addEventListener('click', (e) => e.stopPropagation());
    const tile = el('div', {
      class: `tsg-tile${p.id === current ? ' sel' : ''}`, title: p.title, dataset: { id: p.id },
    }, [cvs, doc, el('div', { class: 'tsg-cap' }, [p.name])]);
    tile.addEventListener('click', () => { setSel(p.id); opts.onPick(p); });
    tiles.push({ id: p.id, tile, cvs });
    return tile;
  }

  function setSel(id: string): void {
    current = id;
    for (const t of tiles) t.tile.classList.toggle('sel', t.id === id);
  }

  // One ticker for the whole gallery; prune previews that leave the DOM.
  opts.dispose.raf(() => {
    const t = performance.now();
    for (const { id, cvs } of tiles) { if (cvs.isConnected) drawTsg(cvs, id, t); }
  });

  return { root, select: setSel };
}
