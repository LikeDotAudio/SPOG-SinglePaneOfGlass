// src/ui/sources/panel — builds the whole SOURCES ingress panel by READING the
// filesystem (Routes/Sources/**), exactly like js/sources.js. index.json lists
// categories; each category folder becomes a super-pool; every *.json leaf is
// dispatched to a renderer by the SHAPE of its data (inferPoolKind). Adding a
// category/folder/file makes it appear with zero code edits.
import { listDirectory, fetchJSON, type Entry } from '../../platform/discovery.js';
import type { Hex, PoolKind, SourceLeaf } from '../../model/index.js';
import { AUDIO_POOL_COLORS, SOURCE_POOL_COLORS, paletteAt } from '../palette.js';
import { stripOrder, monoEmoji } from './format.js';
import { makeMediaGroup } from './media-group.js';
import { inferPoolKind, renderSourceLeaf } from './pools.js';
import { renderGang } from './gang.js';
import { applyScope } from '../console/auth-panel.js';
import { stampIcon } from '../icon-face.js';

/** Optional hook fired after a subtree renders (Phase 3 wires drag here). */
export type RenderedHook = () => void;

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
  const peopleContent = buildSuperPool(panel, 'Talent', paletteAt(SOURCE_POOL_COLORS, 0));
  const built = [{ content: peopleContent, url: 'Routes/Talent/' }];

  dirs.forEach((cat, i) => {
    const color = paletteAt(SOURCE_POOL_COLORS, i + 1);
    const content = buildSuperPool(panel, cat.name, color);
    built.push({ content, url: 'Routes/Sources/' + cat.href });
  });
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
