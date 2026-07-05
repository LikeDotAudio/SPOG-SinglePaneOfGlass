// src/model/destinations — twist (destination tool) shapes (Routes/Destinations/**).
import type { TipSpec } from './common.js';
import type { SwitcherDef } from './switcher.js';

export type Accepts = 'video' | 'audio' | 'both' | 'camera';

export interface TwistConfig {
  name: string;
  accepts?: Accepts;
  inputs?: string[];
  monitor?: boolean;
  row?: string;
  maxVideo?: number;
  maxAudio?: number;
  cameraInput?: boolean;   // "CAM N" twists fed into a destination
  /** Failover feeds used when the primary crosspoint(s) go to a fault status
      (audit §6). `hot` auto-cuts, `warm` arms for one-click, `manual` records
      intent; `twist` fails over to another named twist instead of feeds. */
  backup?: { inputs?: string[]; mode?: 'hot' | 'warm' | 'manual'; twist?: string };
  /** Per-twist (per-tool) hover tip — what this specific tool expects, authored
      inline on the twist in the room/person JSON. Rides through data-config. */
  tip?: TipSpec;
  /** Vision-mixer definition (docs/Production-Video-Switcher-Deployment-Plan.md §4).
      Absent ⇒ the editor's DEFAULT_SWITCHER; present fields override the default,
      so a production only authors what differs (usually just input labels). */
  switcher?: Partial<SwitcherDef>;
}
