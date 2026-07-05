// src/ui/sources/pools — the per-leaf source pool renderers, ported from
// js/pool{Video,Audio,Playout,Streams}.js + productions.js. The renderer for a
// leaf is chosen from its SHAPE (inferPoolKind), not its folder — so dropping a
// new file into Routes/Sources/** makes it appear with zero code edits.
//
// Ported faithfully (same class names, ids, data-origin, DOM) because the LCARS
// CSS is SHARED with the live app. The one behavioural change: the legacy inline
// onclick="togglePool(this)" (a window global) is replaced by an addEventListener
// — no window.* globals in the TS build.
//
// This file is the slim orchestrator: it dispatches on shape (inferPoolKind →
// renderSourceLeaf) and RE-EXPORTS every renderer that used to live here, so all
// external importers of './pools.js' stay byte-identical. The renderers now live
// in flat pools-*.ts siblings (see docs/Audit §5.2).
import type { Hex, PoolKind, SourceLeaf } from '../../model/index.js';
import { CAP_MAP } from './pools-caps.js';
import { renderVideoPool } from './pools-video.js';
import { renderAudioPool, renderPersonPool } from './pools-audio.js';
import { renderPlayoutPool, renderStreamsPool } from './pools-playout.js';
import { renderProductionInputs } from './pools-productions.js';

// ---- re-exports (keep every external importer of './pools.js' byte-identical) --
export { togglePool } from './pools-fold.js';
export { fillVideoCameras, renderVideoPool } from './pools-video.js';
export { renderAudioPool, renderPersonPool } from './pools-audio.js';
export { renderPlayoutPool, renderStreamsPool } from './pools-playout.js';
export { renderProductionInputs } from './pools-productions.js';

// ---- shape → renderer dispatch ---------------------------------------------
export function inferPoolKind(data: SourceLeaf | null | undefined): PoolKind {
  if (!data || typeof data !== 'object') return 'video';
  if (Array.isArray(data.players)) return 'playout';
  if (data.type === 'wireless-mic' || data.type === 'wireless-controller') return 'audio';
  if ((data.outputs && typeof data.outputs === 'object') || Array.isArray(data.boxes)) return 'productions';
  if (Array.isArray(data.streams)) return 'streams';
  const ec = (data.extraClass || '').toLowerCase();
  // A Person leaf carries BOTH audio (items) and video (camera) feeds, kept
  // separate — its own renderer emits them as flat, independent nodes. Detect it
  // by the person extraClass, or by carrying both a video[] AND an audio items[]
  // (a video-ONLY leaf like a teleprompter engine is NOT a person → see below).
  if (data.source && typeof data.source === 'object') return 'person';   // unified person model
  if (ec.includes('person') || (Array.isArray(data.video) && Array.isArray(data.items))) return 'person';
  // Explicit video wins over the items→audio default: a source can declare its
  // named VIDEO feeds (e.g. a teleprompter engine's prompt-head / confidence /
  // clean-program outputs) in `video[]` via kind:"video" or a "…video…" extraClass.
  if (data.kind === 'video' || ec.includes('video') || Array.isArray(data.video)) return 'video';
  if (ec.includes('audio') || Array.isArray(data.items)) return 'audio';
  return 'video';
}

export function renderSourceLeaf(data: SourceLeaf, container: HTMLElement, kind: PoolKind, color: Hex): void {
  const countBefore = container.children.length;
  if (kind === 'playout') renderPlayoutPool(data, container);
  else if (kind === 'productions') renderProductionInputs(data, container);
  else if (kind === 'streams') renderStreamsPool(data, container);
  else if (kind === 'person') renderPersonPool(data, container, color);
  else if (kind === 'audio') renderAudioPool(data, container, color);
  else renderVideoPool(data, container);

  for (let i = countBefore; i < container.children.length; i++) {
    const el = container.children[i] as HTMLElement;
    const caps = CAP_MAP[kind];
    if (caps) el.dataset.cap = caps;
  }
}
