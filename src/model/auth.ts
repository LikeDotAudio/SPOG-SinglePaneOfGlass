// src/model/auth — access / capabilities (legacy js/auth.js).
import type { Hex } from './common.js';

export type Capability =
  | 'admin' | 'switch' | 'route' | 'signal' | 'shade'
  | 'gfx' | 'comms' | 'audio' | 'book' | 'view'
  // Layout-authoring rights (single-pane editor). Split so an operator can be
  // allowed to MOVE/resize the layout without being allowed to ADD or edit it:
  | 'build'      // add / edit / delete rooms & containers (declaration authoring)
  | 'arrange';   // move / reorder / re-band / scale / pan the layout

export interface Role {
  id: string;
  name: string;
  sub?: string;
  tier: string;
  color: Hex;
  task: string;
  caps: Partial<Record<Capability, 1>>;
}
