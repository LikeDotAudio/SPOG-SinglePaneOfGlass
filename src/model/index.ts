// src/model — the typed domain shapes the app reads.
//
// These are the real-TS form of the contracts that the legacy app kept only in
// comments (see docs/TYPESCRIPT-WASM-REPORT.md §A.2). Every layer above depends
// on these and nothing else for "what the data looks like".

export type Hex = `#${string}`;

/** A source/device is faulted when status is set and isn't "OK". */
export type Status = 'OK' | (string & {});

/**
 * A hover tip ("tool tick") authored in the Routes JSON — on a production/room,
 * a floor room, a person, a source box, or an individual twist. The bare-string
 * form is the whole tip; the object form adds the same ✓ good / ✕ bad guidance the
 * Meter Input scopes use. Surfaced by `ui/tip.ts` alongside the context-derived
 * "what the production expects" tip. See docs/Audit /LCARS-Hover-Tooltips-*.
 */
export type TipSpec = string | { title?: string; lead: string; good?: string; bad?: string };

// ---- Sources (Routes/Sources/**) -------------------------------------------

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

// ---- Source leaves (the *.json under Routes/Sources/**) ----------------------
// The ingress panel infers a renderer from the SHAPE of each leaf (see
// inferPoolKind): a StageBox (video/audio), a playout (players[]), a production
// (outputs{}/boxes[]), or a stream set (streams[]). One permissive shape covers
// all of them so discovery can stay untyped-at-the-edge and narrow on read.

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

// ---- Destinations & twists (Routes/Destinations/**) -------------------------

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

// ---- Vision mixer / production switcher (deployment plan §4) ----------------
// Data types for the per-production switcher definition. These describe JSON
// (Routes/**), so they live in the model; the editor owns behaviour + defaults.

export type KeyerType = 'luma' | 'chroma' | 'linear' | 'split' | 'pattern';
export type TransitionKind = 'CUT' | 'MIX' | 'FAM' | 'NAM' | 'DIP' | 'WIPE' | 'DVE' | 'L-WIPE' | 'BOX' | 'IRIS' | 'BARN DOORS' | 'CURTAINS' | 'MATRIX' | 'CLOCK' | 'ROTARY' | 'STAR WIPE' | 'DVE PUSH' | 'STINGER' | string;
export type BusLayout = 'shift12' | 'wide24' | 'stack12';

export interface SwitcherInput {
  label: string;
  /** Signal category → semantic tint (--sig-*) + shape cue. Default 'video'. */
  category?: 'video' | 'audio' | 'program';
  color?: Hex;
}

/** One DVE keyframe — a 3D pose for the flown picture (audit §6). */
export interface DVEKeyframe {
  x: number; y: number;          // -100..100 (% of frame off-centre)
  z: number;                     // 0..100 push-back (0 = front)
  scale: number;                 // 5..200 %
  rotX: number; rotY: number; rotZ: number;   // degrees
}

/** A named A→B transform move; recall tweens A→B over `ms`. */
export interface DVEPreset { id: string; name: string; a: DVEKeyframe; b: DVEKeyframe; ms: number; }

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
  dvePresets: DVEPreset[];
  mePresets: MEPreset[];
  scenes: SceneDef[];
  /** Presentation DEFAULTS only — the operator's device pref overrides (plan D9). */
  layout?: BusLayout;
  handedness?: 'fixed' | 'follow-chirality';
}

/** A folder manifest (index.json): entries ending "/" are directories. */
export type Manifest = string[];

export type PoolKind = 'video' | 'audio' | 'playout' | 'productions' | 'streams' | 'person';

// ---- Access / capabilities (legacy js/auth.js) ------------------------------

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
