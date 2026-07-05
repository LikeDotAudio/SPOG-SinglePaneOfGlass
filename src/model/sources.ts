// src/model/sources — source shapes + the permissive Sources/** leaf union.
// The ingress panel infers a renderer from the SHAPE of each leaf (see
// inferPoolKind): a StageBox (video/audio), a playout (players[]), a production
// (outputs{}/boxes[]), or a stream set (streams[]). One permissive shape covers
// all of them so discovery can stay untyped-at-the-edge and narrow on read.
import type { Hex, Status, TipSpec } from './common.js';
import type { TwistConfig } from './destinations.js';

export interface StageBox {
  id: string;
  name: string;
  prefix: string;
  count: number;
  extraClass: string;
  color?: Hex;
  floor?: string;
  level?: number;
  items?: string[];        // audio: explicit channel labels
  status?: Status;
}

export interface Production {
  id: string;
  name: string;
  color?: Hex;
  parentName?: string;
  status?: Status;
  /** Room/floor-room/person-level hover tip — what this production expects of an op. */
  tip?: TipSpec;
  outputs?: { video?: string[]; audio?: string[]; intercom?: string[] };
  twists?: Array<string | TwistConfig>;
  // A Person's destination projection lives under `kit` (see PersonLeaf); the
  // destinations loader normalises `kit.twists` → `twists` on load.
  kit?: { twists?: Array<string | TwistConfig> };
}

/** A name-super / lower-third graphic tied to a person (drives the LOWER THIRD
    twist + the graphics-engine CG — authored once, on the person). */
export interface LowerThird {
  line1: string;
  line2?: string;
  style?: string;
}

/** One embedded video in a playout player: a video feed + its audio stack. */
export interface PlayoutVideo {
  id: string;
  name: string;
  stack?: { video?: string; audio?: string[] };
}
export interface PlayoutPlayer {
  id: string;
  name: string;
  videos?: PlayoutVideo[];
}

/** A production source box: a video feed with embedded audio + control feeds. */
export interface ProductionBox {
  name: string;
  video?: boolean;
  audio?: string[];
  control?: string[];
}

/** One YouTube/stream source: a URL carrying a picture + stereo L/R pair. */
export interface StreamDef {
  id: string;
  name: string;
  url?: string;
  left?: string;
  right?: string;
}

/** The permissive union every Sources/** leaf conforms to. */
export interface SourceLeaf {
  id: string;
  name: string;
  color?: Hex;
  status?: Status;
  type?: string;
  origin?: string;
  /** Person/source-box hover tip — authored in the Routes/People or Sources JSON. */
  tip?: TipSpec;
  // stage box (video/audio)
  prefix?: string;
  count?: number;
  extraClass?: string;
  items?: string[];               // audio feeds (mic/processed/return) for a person/audio leaf
  video?: string[];               // video feeds (camera) — kept SEPARATE from `items`, never nested
  kind?: 'video' | 'audio';       // explicit pool kind — overrides the shape heuristic
  title?: string;                 // name-super / lower-third title (a graphical element)
  role?: string;                  // talent type (host, co-host, correspondent, …)
  // person (SINGLE unified model — a person is both a source and a destination):
  // `source` is the source projection (feeds), `kit` the destination projection
  // (twists), `lowerThird`/`title` the shared identity. See Routes/People/**.
  source?: { audio?: string[]; video?: string[] };
  kit?: { twists?: Array<string | TwistConfig> };
  lowerThird?: LowerThird;
  // playout
  players?: PlayoutPlayer[];
  // production
  outputs?: { video?: string[]; audio?: string[]; intercom?: string[] };
  boxes?: ProductionBox[];
  // streams
  streams?: StreamDef[];
}
