// src/ui/console/matrix-place — programmatic crosspoint placement + the retained
// MQTT crosspoints projection. Split out of matrix.ts (audit §5.3); placeSourceInTwist
// is the entry point the 1990s router-view uses to make a crosspoint.
import { getBus } from '../../platform/mqtt/index.js';
import { twistTopic } from '../../platform/mqtt/topics.js';
import { parseConfig, enforceTwistLimits, ensureDropZone, rid } from './matrix-groups.js';
import { refreshCrosspoints } from './matrix-crosspoints.js';

/** Project a twist's current routed set onto its retained crosspoints topic (audit §4). */
export function publishCrosspoints(twist: HTMLElement): void {
  const bus = getBus();
  if (!bus.status().enabled) return;
  const prod = twist.dataset.prodName ?? '';
  const name = (twist.querySelector('.twist-title')?.textContent ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  if (!prod || !name) return;
  const dz = twist.querySelector('.drop-zone');
  const sources = dz
    ? [...dz.querySelectorAll<HTMLElement>(':scope > .signal-node')].map((n) => (n.textContent ?? '').trim().split('\n')[0] ?? '').filter(Boolean)
    : [];
  bus.publishValue(`${twistTopic(prod, name)}/crosspoints`, sources);
}

/** Place a clone of one source node into a twist's drop-zone (accepts/limits honoured).
 *  Returns true if placed. Used by the 1990s router-view to make a crosspoint. */
export function placeSourceInTwist(twist: HTMLElement, node: HTMLElement): boolean {
  if (!twist || !node) return false;
  const config = parseConfig(twist);
  const isVideo = node.classList.contains('video');
  const isAudio = node.classList.contains('audio');
  if (config && config.accepts === 'video' && !isVideo) return false;
  if (config && config.accepts === 'audio' && !isAudio) return false;
  const dropZone = ensureDropZone(twist);
  const clone = node.cloneNode(true) as HTMLElement;
  clone.id = node.id + '-' + rid();
  clone.classList.remove('selected');
  clone.style.opacity = '1';
  clone.draggable = false;
  enforceTwistLimits(dropZone, config, clone);
  dropZone.appendChild(clone);
  refreshCrosspoints(dropZone);   // number 1..N + make reorderable
  publishCrosspoints(twist);
  return true;
}
