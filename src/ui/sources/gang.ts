// src/ui/sources/gang — ganged stage boxes (square numbered cells). A "gang" is a
// run of sibling source leaves that share a leading word (e.g. STAGE 01, STAGE 02);
// they render as a compact grid of numbered cells that expand in place. Extracted
// from panel.ts so the SOURCES ingress panel stays under the 200-line rule.
import { addStyles } from '../dom.js';
import { isFaultStatus } from '../../domain/routing-core/index.js';
import type { PoolKind, SourceLeaf } from '../../model/index.js';
import { slugId, styleSignalNode } from './format.js';
import { fillVideoCameras } from './pools.js';

const GANG_CSS = `
.gang-cap{font-size:10px;font-weight:bold;letter-spacing:2px;color:#9fb6cc;margin:2px 0 4px 4px;text-transform:uppercase;}
.gang-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:4px;margin:0 0 10px;align-items:start;}
.signal-node.gang-cell{border-radius:3px;padding:0;cursor:grab;display:flex;align-items:center;
    justify-content:center;min-height:34px;background:rgba(0,0,0,.55);}
.signal-node.gang-cell .multiplex-header{font-size:13px;font-weight:bold;letter-spacing:1px;padding:9px 2px;width:100%;text-align:center;}
.signal-node.gang-cell .multiplex-children{display:none;flex-direction:column;gap:2px;padding:2px;}
.signal-node.gang-cell.fault{outline:2px solid #ff3344;}
.signal-node.gang-cell.expanded{grid-column:1 / -1;flex-direction:column;align-items:stretch;justify-content:flex-start;}
.signal-node.gang-cell.expanded > .multiplex-children{display:flex;flex-direction:row;flex-wrap:wrap;gap:4px;}
.signal-node.gang-cell.expanded .gang-cam-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;width:100%;}
.signal-node.gang-cell.expanded > .multiplex-children > .sub-stream{flex:1 1 auto;min-width:60px;}
.signal-node.gang-cell .multiplex-children > .signal-node.control{flex-basis:100%;width:100%;order:99;min-height:30px;}
.signal-node.gang-cell.expanded{cursor:pointer;}
.signal-node.gang-cell.expanded .gang-cam-grid > .signal-node.multiplex{
    background:rgba(46,86,128,.32);border:1px solid #4f86b8;border-radius:6px;box-shadow:0 2px 7px rgba(0,0,0,.45);}
.signal-node.gang-cell.expanded > .multiplex-header{background:rgba(0,0,0,.35);border-radius:4px;margin-bottom:4px;}`;

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildGangCell(data: SourceLeaf, suffix: string, color: string, kind: PoolKind): HTMLElement {
  const node = document.createElement('div');
  const cellColor = data.color || color;
  node.className = `signal-node ${kind === 'video' ? 'video' : 'audio'} multiplex gang-cell`;
  node.id = 'pool-' + (data.id || slugId(data.name));
  node.draggable = true;
  node.dataset.origin = data.origin || data.name;
  node.dataset.status = data.status || 'OK';

  const kids = document.createElement('div');
  kids.className = 'multiplex-children';
  kids.style.display = 'none';
  if (kind === 'video') {
    const grid = document.createElement('div');
    grid.className = 'input-grid-video gang-cam-grid';
    fillVideoCameras(grid, data.prefix ?? '', data.count ?? 0, data.extraClass ?? '', cellColor, data.status);
    grid.querySelectorAll<HTMLElement>('.signal-node').forEach((n) => { n.dataset.origin = data.origin || data.name; });
    kids.appendChild(grid);
  } else {
    const labels = data.items && data.items.length
      ? data.items
      : Array.from({ length: data.count ?? 0 }, (_, i) => `${data.prefix ?? ''}${String(i + 1).padStart(2, '0')}`);
    labels.forEach((l) => {
      const sub = document.createElement('div');
      sub.className = `signal-node audio ${data.extraClass || 'audio-studio'} sub-stream`;
      sub.draggable = true;
      sub.id = `pool-${node.id}-${slugId(l)}`;
      sub.dataset.origin = data.origin || data.name;
      if (data.type) sub.dataset.type = data.type;
      sub.textContent = l;
      kids.appendChild(sub);
    });
    const ctrl = document.createElement('div');
    ctrl.className = 'signal-node control sub-stream';
    ctrl.draggable = true;
    ctrl.id = `pool-${node.id}-preamp`;
    ctrl.dataset.origin = data.origin || data.name;
    ctrl.textContent = '‹ ⌁ PREAMP CTRL ⌁ ›';
    kids.appendChild(ctrl);
  }

  // If this audio node has NO children (e.g., a wireless mic without a sub-items array),
  // make the cell itself the draggable signal node.
  if (kind === 'audio' && kids.children.length === 1) { // 1 because of PREAMP CTRL
    node.draggable = true;
    node.classList.add('signal-node', 'audio');
    // No sub-streams → this cell IS the feed. Drop the multiplex class, or the
    // destination drop handler expands it looking for .sub-stream children,
    // finds none, and the drop routes nothing.
    node.classList.remove('multiplex');
    if (data.type) node.dataset.type = data.type;
    node.dataset.origin = data.origin || data.name;
    // Remove the kids container and preamp ctrl since the node itself is the feed
    kids.remove();
    node.textContent = suffix;
    styleSignalNode(node, cellColor);
    if (isFaultStatus(data.status)) {
      node.classList.add('fault');
    }
    return node;
  }

  const header = document.createElement('div');
  header.className = 'multiplex-header';
  header.textContent = suffix;
  header.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = kids.style.display === 'none';
    if (opening) {
      const grid = node.closest('.gang-grid');
      if (grid) grid.querySelectorAll<HTMLElement>(':scope > .gang-cell.expanded').forEach((c) => {
        if (c === node) return;
        c.classList.remove('expanded');
        const ck = c.querySelector<HTMLElement>(':scope > .multiplex-children');
        if (ck) ck.style.display = 'none';
      });
    }
    kids.style.display = opening ? 'flex' : 'none';
    node.classList.toggle('expanded', opening);
  });
  node.appendChild(header);
  node.appendChild(kids);
  styleSignalNode(node, cellColor);
  if (isFaultStatus(data.status)) {
    node.classList.add('fault');
    node.querySelectorAll<HTMLElement>('.sub-stream').forEach((x) => x.classList.add('fault'));
  }
  return node;
}

export function renderGang(container: HTMLElement, word: string, leaves: SourceLeaf[], color: string, kind: PoolKind): void {
  addStyles('source-gang-styles', GANG_CSS);
  const group = document.createElement('div');
  group.className = 'input-group gang-group';
  const cap = document.createElement('div');
  cap.className = 'gang-cap'; cap.textContent = word; cap.style.color = color;
  group.appendChild(cap);
  const grid = document.createElement('div');
  grid.className = 'gang-grid';
  group.appendChild(grid);
  const re = new RegExp('^' + escapeRe(word) + '\\s*', 'i');
  leaves.forEach((d) => {
    const suffix = ((d.name || '').replace(re, '').trim()) || d.name;
    grid.appendChild(buildGangCell(d, suffix, color, kind));
  });

  const CAP_MAP: Record<PoolKind, string> = {
    audio: 'audio comms switch route arrange',
    video: 'switch route shade gfx arrange',
    person: 'audio comms switch route shade arrange',
    playout: 'switch route arrange',
    productions: 'switch route arrange',
    streams: 'switch route view arrange',
  };
  const caps = CAP_MAP[kind];
  if (caps) group.dataset.cap = caps;

  container.appendChild(group);
}
