// src/ui/sources/pools-audio — the AUDIO pool + PERSON pool renderers
// (extracted from pools.ts). No behaviour change.
import type { SourceLeaf } from '../../model/index.js';
import { isFaultStatus } from '../../domain/routing-core/index.js';
import { slugId, faultTag, monoEmoji, styleSignalNode } from './format.js';
import { wireFold, tagOrigin } from './pools-fold.js';

// ---- AUDIO pool -------------------------------------------------------------
export function renderAudioPool(data: SourceLeaf, container: HTMLElement, color?: string): void {
  const poolColor = color || data.color || '#00ffff';
  const faulted = isFaultStatus(data.status);
  const group = document.createElement('div');
  group.className = 'input-group';
  group.innerHTML = `
    <div class="foldable-header${faulted ? ' fault' : ''}" title="${data.status || 'OK'}" style="--lcars-color: ${poolColor}; background-color: ${poolColor}; font-size: 11px; margin-bottom: 4px;">
      <span>${monoEmoji(data.name)}${data.name}${faultTag(data.status)}</span>
      <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
    </div>
    <div class="input-grid-audio pool-content" id="${data.id}" style="display: none;"></div>`;
  container.appendChild(group);
  wireFold(group);
  const grid = group.querySelector<HTMLElement>('.pool-content');
  if (!grid) return;
  const mk = (label: string, id: string): void => {
    const node = document.createElement('div');
    node.className = `signal-node audio ${data.extraClass ?? ''}`;
    node.innerText = label;
    node.id = id;
    node.draggable = true;
    styleSignalNode(node, poolColor);
    node.dataset.status = data.status || 'OK';
    if (data.type) node.dataset.type = data.type;
    if (faulted) node.classList.add('fault');
    grid.appendChild(node);
  };
  if (data.items && data.items.length > 0) {
    data.items.forEach((item) => mk(item, `pool-${data.id}-${slugId(item)}`));
  } else if (data.count) {
    for (let i = 1; i <= data.count; i++) {
      const num = i.toString().padStart(2, '0');
      mk(`${data.prefix ?? ''}${num}`, `pool-${data.prefix ?? ''}${num}`);
    }
  } else if (data.type) {
    // A typed leaf with no sub-items (wireless controller / single mic) IS the feed.
    mk(data.name, `pool-${data.id || slugId(data.name)}`);
  }
  tagOrigin(grid, data.origin || data.name);
}

// ---- PERSON pool ------------------------------------------------------------
// A declared Person, once processed, is a routable SOURCE. Its audio (mic /
// processed / IFB return) and video (camera) feeds are rendered as FLAT, sibling
// signal-nodes — never a multiplex where video "contains" audio — so audio routes
// to audio destinations and video to video destinations independently. An ISO
// recorder (accepts:"both") is the one place both of a person's feeds can co-land.
export function renderPersonPool(data: SourceLeaf, container: HTMLElement, color?: string): void {
  const poolColor = color || data.color || '#F2B74B';
  const faulted = isFaultStatus(data.status);
  const origin = data.origin || data.name;
  const group = document.createElement('div');
  group.className = 'input-group';
  group.innerHTML = `
    <div class="foldable-header${faulted ? ' fault' : ''}" title="${data.status || 'OK'}" style="--lcars-color: ${poolColor}; background-color: ${poolColor}; font-size: 11px; margin-bottom: 4px;">
      <span>${monoEmoji(data.name)}${data.name}${faultTag(data.status)}</span>
      <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
    </div>
    <div class="input-grid-audio pool-content" id="${data.id}" style="display: none;"></div>`;
  container.appendChild(group);
  wireFold(group);
  const grid = group.querySelector<HTMLElement>('.pool-content');
  if (!grid) return;
  const mk = (label: string, kind: 'audio' | 'video', extra: string): void => {
    const node = document.createElement('div');
    node.className = `signal-node ${kind} ${extra}`;
    node.innerText = label;
    node.id = `pool-${data.id}-${slugId(label)}`;
    node.draggable = true;
    node.dataset.origin = origin;
    styleSignalNode(node, poolColor);
    node.dataset.status = data.status || 'OK';
    if (faulted) node.classList.add('fault');
    grid.appendChild(node);
  };
  // Video (camera) feeds first, then audio — separate, flat siblings. Feeds come
  // from the unified `source{audio,video}` projection (falling back to the legacy
  // flat items[]/video[]). Every person has a camera: default to one CAM if none
  // declared, so the person is routable to video destinations independent of mic.
  const audioFeeds = data.source?.audio ?? data.items ?? [];
  const declaredVideo = (data.source?.video && data.source.video.length ? data.source.video : data.video) ?? [];
  const videos = declaredVideo.length ? declaredVideo : ['CAM'];
  videos.forEach((label) => mk(label, 'video', data.extraClass?.includes('video') ? data.extraClass : 'video-person'));
  audioFeeds.forEach((label) => mk(label, 'audio', 'audio-person'));
}
