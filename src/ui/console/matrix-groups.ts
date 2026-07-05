// src/ui/console/matrix-groups — twist config parsing, cap enforcement, and the
// collapsible "dropped group" chip that bundles same-origin feeds. Split out of
// matrix.ts (audit §5.3); imported by matrix.ts, matrix-place.ts, matrix-cascade.ts.
import type { TwistConfig } from '../../model/index.js';

export function parseConfig(twist: HTMLElement): TwistConfig | null {
  if (twist.dataset.config) { try { return JSON.parse(twist.dataset.config) as TwistConfig; } catch { /* ignore */ } }
  return null;
}

export function enforceTwistLimits(dropZone: HTMLElement, config: TwistConfig | null, child: HTMLElement): void {
  if (!config) return;
  const isVideo = child.classList.contains('video');
  const isAudio = child.classList.contains('audio');
  if (config.maxVideo && isVideo) {
    const ex = dropZone.querySelectorAll<HTMLElement>('.signal-node.video');
    for (let k = 0; k < ex.length - (config.maxVideo - 1); k++) ex[k]?.remove();
  }
  if (config.maxAudio && isAudio) {
    const ex = dropZone.querySelectorAll<HTMLElement>('.signal-node.audio');
    for (let k = 0; k < ex.length - (config.maxAudio - 1); k++) ex[k]?.remove();
  }
  if (Array.isArray(config.inputs) && config.inputs.length) {
    const cap = config.inputs.length;
    const ex = dropZone.querySelectorAll<HTMLElement>(':scope > .signal-node');
    for (let k = 0; k < ex.length - (cap - 1); k++) ex[k]?.remove();
  }
}

let grpSeq = 0;
/** Unique-ish id suffix for cloned crosspoints/groups (single owner; shared via export). */
export const rid = (): string => (grpSeq++).toString(36) + '-' + (Date.now() % 1e6).toString(36);

export function buildDroppedGroup(groupName: string, groupColor: string, sourceNodes: HTMLElement[], parentLabel: string): HTMLElement {
  const group = document.createElement('div');
  group.className = 'signal-node dropped-group';
  group.style.borderColor = groupColor;
  group.style.color = groupColor;
  group.id = 'grp-' + rid();
  group.draggable = true;
  const head = document.createElement('div');
  head.className = 'dropped-group-header';
  if (parentLabel) {
    const cap = document.createElement('span');
    cap.className = 'dg-parent';
    cap.textContent = parentLabel;
    head.appendChild(cap);
    head.appendChild(document.createTextNode(`${groupName} ×${sourceNodes.length}`));
  } else {
    head.innerText = `${groupName} ×${sourceNodes.length}`;
  }
  const kids = document.createElement('div');
  kids.className = 'dropped-group-children';
  kids.style.display = 'none';
  sourceNodes.forEach((src) => {
    const c = src.cloneNode(true) as HTMLElement;
    c.id = src.id + '-' + rid();
    c.classList.remove('sub-stream', 'selected');
    c.style.opacity = '1';
    c.draggable = true;
    kids.appendChild(c);
  });
  group.appendChild(head);
  group.appendChild(kids);
  group.addEventListener('click', (e) => {
    e.stopPropagation();
    kids.style.display = kids.style.display === 'none' ? 'flex' : 'none';
  });
  return group;
}

export const acceptsFor = (config: TwistConfig | null) => (el: HTMLElement): boolean => {
  if (!config || !config.accepts) return true;
  if (config.accepts === 'video') return el.classList.contains('video');
  if (config.accepts === 'audio') return el.classList.contains('audio') || el.classList.contains('control');
  if (config.accepts === 'camera') return el.classList.contains('video') || el.classList.contains('camera-control');
  return true;
};

export function ensureDropZone(twist: HTMLElement): HTMLElement {
  let dz = twist.querySelector<HTMLElement>('.drop-zone');
  if (!dz) {
    dz = document.createElement('div');
    dz.className = 'drop-zone';
    dz.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;width:100%;justify-content:center;';
    twist.appendChild(dz);
  }
  return dz;
}
