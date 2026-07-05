// src/ui/sources/pools-caps — the pool-kind → capability tag map (extracted from
// renderSourceLeaf in pools.ts). No behaviour change.
import type { PoolKind } from '../../model/index.js';

export const CAP_MAP: Record<PoolKind, string> = {
  audio: 'audio comms switch route arrange',
  video: 'switch route shade gfx arrange',
  person: 'audio comms switch route shade arrange',
  playout: 'switch route arrange',
  productions: 'switch route arrange',
  streams: 'switch route view arrange',
};
