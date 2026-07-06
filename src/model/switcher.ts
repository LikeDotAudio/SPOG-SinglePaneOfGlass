// src/model/switcher — the per-production vision-mixer definition
// (docs/Production-Video-Switcher-Deployment-Plan.md §4). These describe JSON
// (Routes/**), so they live in the model; the editor owns behaviour + defaults.
import type { Hex } from './common.js';

export type KeyerType = 'luma' | 'chroma' | 'linear' | 'split' | 'pattern';
export type TransitionKind = 'CUT' | 'MIX' | 'FAM' | 'NAM' | 'DIP' | 'WIPE' | 'DVE' | 'L-WIPE' | 'BOX' | 'IRIS' | 'BARN DOORS' | 'CURTAINS' | 'MATRIX' | 'CLOCK' | 'ROTARY' | 'STAR WIPE' | 'DVE PUSH' | 'STINGER' | string;
export type BusLayout = 'shift12' | 'wide24' | 'stack12';

export interface SwitcherInput {
  label: string;
  /** Signal category → semantic tint (--sig-*) + shape cue. Default 'video'. */
  category?: 'video' | 'audio' | 'program';
  color?: Hex;
}

export interface DVECrop { l: number; r: number; t: number; b: number; } // 0..100 % trimmed per edge

/** One DVE keyframe — a 3D pose for the flown picture (audit §6). */
export interface DVEKeyframe {
  x: number; y: number;          // -100..100 (% of frame off-centre)
  z: number;                     // 0..100 push-back (0 = front)
  scale: number;                 // 5..200 %
  rotX: number; rotY: number; rotZ: number;   // degrees
  crop?: DVECrop;                // optional source-crop rectangle
}

/** A named 3D pose for the flown picture (Snapshot). Recall auto-tweens to it. */
export interface DVESnapshot { id: string; name: string; pose: DVEKeyframe; ms?: number; }

export interface KeyerDef {
  on?: boolean;
  type?: KeyerType;              // default 'linear'
  source?: number;               // input index for the key/fill
  dve?: string;                  // DVEPreset id applied to this key
}

/** A named full-bank composite look (background + keyer stack + transition). */
export interface MEPreset {
  id: string; name: string;
  pgm: number; pvw: number;
  trans: TransitionKind; rate: number;
  keyers: KeyerDef[];
  split?: boolean;
}

/** A whole-switcher register (audit §8 "scene recall"): every bank + DSKs. */
export interface SceneDef { id: string; name: string; mes: MEPreset[]; dsks: boolean[]; auxes?: number[]; }

export interface DSKDef { name: string; type?: KeyerType; source?: number; }

export interface MacroDef { id: string; name: string; actions: { topic: string; payload: unknown }[]; }

export interface SwitcherDef {
  inputs: SwitcherInput[];       // the source pool (plan: 24)
  mes: number;                   // M/E bank count (plan: 3)
  keyersPerMe: number;           // keyers per bank (plan: 4)
  dsks: DSKDef[];                // downstream keyers, above every M/E
  stills?: number;               // Internal still store channels (default 2)
  clips?: number;                // Internal clip store channels (default 2)
  auxes?: number;                // Aux bus count (default 6)
  macros?: MacroDef[];           // Recorded MQTT sequences
  transitions: TransitionKind[];
  wipePatterns: string[];
  dveSnapshots: DVESnapshot[];
  mePresets: MEPreset[];
  scenes: SceneDef[];
  /** Presentation DEFAULTS only — the operator's device pref overrides (plan D9). */
  layout?: BusLayout;
  handedness?: 'fixed' | 'follow-chirality';
}
