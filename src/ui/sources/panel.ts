// src/ui/sources/panel — builds the whole SOURCES ingress panel by READING the
// filesystem (Routes/Sources/**), exactly like js/sources.js. index.json lists
// categories; each category folder becomes a super-pool; every *.json leaf is
// dispatched to a renderer by the SHAPE of its data (inferPoolKind). Adding a
// category/folder/file makes it appear with zero code edits.
import { listDirectory, fetchJSON, type Entry } from '../../platform/discovery.js';
import { addStyles } from '../dom.js';
import { isFaultStatus } from '../../domain/routing-core/index.js';
import type { Hex, PoolKind, SourceLeaf } from '../../model/index.js';
import { AUDIO_POOL_COLORS, SOURCE_POOL_COLORS, paletteAt } from '../palette.js';
import { slugId, stripOrder, monoEmoji, styleSignalNode } from './format.js';
import { makeMediaGroup } from './media-group.js';
import { inferPoolKind, renderSourceLeaf, fillVideoCameras } from './pools.js';
import { applyScope } from '../console/auth-panel.js';
import { stampIcon } from '../icon-face.js';

/** Optional hook fired after a subtree renders (Phase 3 wires drag here). */
export type RenderedHook = () => void;

// ---- ganged stage boxes (square numbered cells) -----------------------------
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

function renderGang(container: HTMLElement, word: string, leaves: SourceLeaf[], color: string, kind: PoolKind): void {
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

// ---- recursive category tree ------------------------------------------------
type GangGroup = { word: string; kind: PoolKind; leaves: SourceLeaf[] };
type OrderEntry = { single: SourceLeaf; kind: PoolKind } | { group: GangGroup };

export async function renderSourceTree(
  baseUrl: string, container: HTMLElement, depth: number,
  inheritColor: Hex | null, parentLabel: string | null, onRendered?: RenderedHook,
): Promise<void> {
  const { dirs, files } = await listDirectory(baseUrl);

  const datas = await Promise.all(files.map((f) => fetchJSON<SourceLeaf>(baseUrl + f.href)));
  const valid = datas.filter((d): d is SourceLeaf => Boolean(d));
  valid.forEach((d) => { d.origin = parentLabel ? `${parentLabel} — ${d.name}` : d.name; });

  const order: OrderEntry[] = [];
  const byWord = new Map<string, GangGroup>();
  valid.forEach((d) => {
    const kind = inferPoolKind(d);
    const word = (d.name || '').replace(/\s*\d.*$/, '').trim();
    if ((kind === 'audio' || kind === 'video') && word) {
      let g = byWord.get(word);
      if (!g) { g = { word, kind, leaves: [] }; byWord.set(word, g); order.push({ group: g }); }
      g.leaves.push(d);
    } else order.push({ single: d, kind });
  });

  let ci = 0;
  order.forEach((entry) => {
    const color = inheritColor ?? paletteAt(AUDIO_POOL_COLORS, ci++);
    if ('single' in entry) renderSourceLeaf(entry.single, container, entry.kind, color);
    else if (entry.group.leaves.length >= 2) renderGang(container, entry.group.word, entry.group.leaves, color, entry.group.kind);
    else if (entry.group.leaves[0]) renderSourceLeaf(entry.group.leaves[0], container, entry.group.kind, color);
  });

  dirs.forEach((d: Entry, idx: number) => {
    const groupColor = inheritColor ?? paletteAt(AUDIO_POOL_COLORS, idx);
    const content = makeMediaGroup(container, stripOrder(d.name), groupColor, depth);
    const header = content.previousElementSibling as HTMLElement | null;
    let loaded = false;
    const load = async (): Promise<void> => {
      if (loaded) return;
      loaded = true;
      const childParent = parentLabel ? `${parentLabel} — ${stripOrder(d.name)}` : stripOrder(d.name);
      await renderSourceTree(baseUrl + d.href, content, depth + 1, groupColor, childParent, onRendered);
      onRendered?.();
    };
    if (header) header.addEventListener('click', () => { void load(); });
  });

  applyScope(container);
}

// ---- super-pool shell + panel entry point -----------------------------------
export function toggleSuperPool(event: Event, container: HTMLElement): void {
  const target = event.target as HTMLElement;
  const title = target.closest('.super-pool-title');
  const onOwnTitle = !!title && title.closest('.super-pool-container') === container;
  const onOwnSpine = target === container;
  if (!onOwnTitle && !onOwnSpine) return;
  event.stopPropagation();
  const content = container.querySelector<HTMLElement>(':scope > .super-pool-content');
  if (!content) return;
  const icon = container.querySelector<HTMLElement>(':scope > .super-pool-title .fold-icon');
  const isOpening = content.style.display === 'none';
  if (isOpening) {
    const parent = container.parentElement;
    if (parent) parent.querySelectorAll<HTMLElement>(':scope > .super-pool-container').forEach((sib) => {
      if (sib === container) return;
      const c = sib.querySelector<HTMLElement>(':scope > .super-pool-content');
      if (c) c.style.display = 'none';
      sib.classList.add('folded');
      const ic = sib.querySelector<HTMLElement>(':scope > .super-pool-title .fold-icon');
      if (ic) ic.style.transform = 'rotate(-90deg)';
    });
    content.style.display = '';
    container.classList.remove('folded');
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    content.style.display = 'none';
    container.classList.add('folded');
    if (icon) icon.style.transform = 'rotate(-90deg)';
  }
}

export function buildSuperPool(panel: HTMLElement, name: string, color: Hex): HTMLElement {
  const container = document.createElement('div');
  container.className = 'super-pool-container folded'; // starts collapsed (content hidden)
  container.style.setProperty('--lcars-color', color);
  container.innerHTML = `
    <div class="super-pool-emoji">${monoEmoji(name).trim()}</div>
    <div class="super-pool-title foldable-header">
      <span>${stripOrder(name).toUpperCase()}</span><span class="fold-icon" style="transform:rotate(-90deg);display:inline-block;transition:transform .2s;">▼</span>
    </div>
    <div class="super-pool-content" style="display:none;"></div>`;
  container.addEventListener('click', (e) => toggleSuperPool(e, container));
  // ICON face: the pool renders as its source tile (inert in LCARS face; only
  // activates if Routes/Sources/.icon/<slug>.svg exists).
  stampIcon(container, 'src', stripOrder(name));
  panel.appendChild(container);
  return container.querySelector<HTMLElement>(':scope > .super-pool-content') as HTMLElement;
}

/** Read Routes/Sources/index.json and build a super-pool per category, in order. */
export async function renderSourcesPanel(panel: HTMLElement, onRendered?: RenderedHook): Promise<void> {
  if (!panel) return;
  const { dirs: allDirs } = await listDirectory('Routes/Sources/');
  // `icons/` holds the ICON-face tiles, not a source category (deploy.py keeps it
  // out of the manifests too — this guard covers a stale/hand-built index.json).
  const dirs = allDirs.filter((d) => !/^\.?icons?\/?$/i.test(stripOrder(d.name)));
  const built = dirs.map((cat, i) => {
    const color = paletteAt(SOURCE_POOL_COLORS, i);
    const content = buildSuperPool(panel, cat.name, color);
    return { content, url: 'Routes/Sources/' + cat.href };
  });
  // People are ONE unified model (source + destination in a single file); the
  // sources panel projects the `source{}` feeds from the canonical Routes/People
  // tree. The destinations console projects `kit{}` from the SAME files.
  const peopleContent = buildSuperPool(panel, 'People', paletteAt(SOURCE_POOL_COLORS, built.length));
  built.push({ content: peopleContent, url: 'Routes/People/' });
  const first = built[0];
  if (first) {
    first.content.style.display = '';
    first.content.parentElement?.classList.remove('folded');
    const ic = first.content.parentElement?.querySelector<HTMLElement>(':scope > .super-pool-title .fold-icon');
    if (ic) ic.style.transform = 'rotate(0deg)';
  }
  await Promise.all(built.map((b) => renderSourceTree(b.url, b.content, 0, null, null, onRendered)));
  applyScope(panel);
}
