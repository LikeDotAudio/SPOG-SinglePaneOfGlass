// src/editors/vision-mixer/schema — the canonical switcher definition + resolver.
//
// Deployment plan §4: every production is guaranteed a COMPLETE definition — the
// editor ships DEFAULT_SWITCHER (24 inputs · 3 M/Es · 4 keyers/M/E · 2 DSKs · a
// starter DVE/M-E/scene preset library) and a production's `switcher` block (or its
// legacy `inputs[]`) overrides only the fields it authors. Nothing in the editor
// hardcodes a count: the surface renders whatever this definition says, which is
// what makes the switcher user-scalable (a 12-in/2-M/E or 48-in/5-M/E production is
// data, not a code change).

import type {
  SwitcherDef, SwitcherInput, DVEPreset, DVEKeyframe, MEPreset, SceneDef, KeyerDef, TransitionKind
} from '../../model/index.js';
import type { EditorContext } from '../types.js';

export const FULL: DVEKeyframe = { x: 0, y: 0, z: 0, scale: 100, rotX: 0, rotY: 0, rotZ: 0 };
const KF = (p: Partial<DVEKeyframe>): DVEKeyframe => ({ ...FULL, ...p });

/** Starter DVE library (audit §6): corner PIPs, over-the-shoulders, moves. */
export const DVE_PRESETS: DVEPreset[] = [
  { id: 'full', name: 'FULL', a: FULL, b: FULL, ms: 0 },
  { id: 'pip-tr', name: 'PIP · TOP-R', a: KF({ x: 110, y: -60, scale: 30 }), b: KF({ x: 55, y: -55, scale: 30 }), ms: 400 },
  { id: 'pip-tl', name: 'PIP · TOP-L', a: KF({ x: -110, y: -60, scale: 30 }), b: KF({ x: -55, y: -55, scale: 30 }), ms: 400 },
  { id: 'pip-br', name: 'PIP · BOT-R', a: KF({ x: 110, y: 60, scale: 30 }), b: KF({ x: 55, y: 55, scale: 30 }), ms: 400 },
  { id: 'pip-bl', name: 'PIP · BOT-L', a: KF({ x: -110, y: 60, scale: 30 }), b: KF({ x: -55, y: 55, scale: 30 }), ms: 400 },
  { id: 'ots-r', name: 'OTS · RIGHT', a: KF({ x: 46, y: -34, scale: 38, rotY: -12 }), b: KF({ x: 46, y: -34, scale: 38, rotY: -12 }), ms: 0 },
  { id: 'ots-l', name: 'OTS · LEFT', a: KF({ x: -46, y: -34, scale: 38, rotY: 12 }), b: KF({ x: -46, y: -34, scale: 38, rotY: 12 }), ms: 0 },
  { id: 'squeeze', name: 'SQUEEZE-BACK', a: FULL, b: KF({ x: -28, y: -22, scale: 55 }), ms: 700 },
  { id: 'tumble', name: 'TUMBLE-IN', a: KF({ x: -160, z: 80, scale: 20, rotY: 80, rotZ: -30 }), b: FULL, ms: 800 },
  { id: 'flip-3d', name: 'FLIP · 3D', a: KF({ rotY: -180, z: 40, scale: 70 }), b: FULL, ms: 650 },
];

const key = (p: Partial<KeyerDef> = {}): KeyerDef => ({ on: false, type: 'linear', source: 0, ...p });

/** Starter M/E composite looks (plan §7). Keyer arrays are sized on resolve. */
export const ME_PRESETS: MEPreset[] = [
  { id: 'clean', name: 'CLEAN', pgm: 0, pvw: 1, trans: 'MIX', rate: 24, keyers: [] },
  { id: 'lower-third', name: 'LOWER-THIRD', pgm: 0, pvw: 1, trans: 'MIX', rate: 24, keyers: [key({ on: true, type: 'linear', source: 20 })] },
  { id: 'two-box', name: 'TWO-BOX', pgm: 0, pvw: 1, trans: 'MIX', rate: 24, keyers: [key({ on: true, source: 1, dve: 'pip-tl' }), key({ on: true, source: 2, dve: 'pip-tr' })] },
  { id: 'interview', name: 'INTERVIEW', pgm: 0, pvw: 1, trans: 'MIX', rate: 24, keyers: [key({ on: true, source: 1, dve: 'ots-r' }), key({ on: true, type: 'linear', source: 20 })] },
  { id: 'quad', name: 'QUAD SPLIT', pgm: 0, pvw: 1, trans: 'MIX', rate: 24, keyers: [key({ on: true, source: 0, dve: 'pip-tl' }), key({ on: true, source: 1, dve: 'pip-tr' }), key({ on: true, source: 2, dve: 'pip-bl' }), key({ on: true, source: 3, dve: 'pip-br' })] },
  { id: 'fullscreen-gfx', name: 'FULLSCREEN GFX', pgm: 21, pvw: 0, trans: 'MIX', rate: 24, keyers: [] },
];

/** Starter whole-switcher scenes (plan §7): common show beats. */
export const SCENES: SceneDef[] = [
  { id: 'open', name: 'OPEN', mes: [], dsks: [false, false, false, false, false, false] },
  { id: 'interview', name: 'INTERVIEW', mes: [], dsks: [true, false, false, false, false, false] },
  { id: 'highlight', name: 'HIGHLIGHT', mes: [], dsks: [false, true, false, false, false, false] },
  { id: 'break', name: 'BREAK', mes: [], dsks: [false, false, false, false, false, false] },
  { id: 'close', name: 'CLOSE', mes: [], dsks: [true, true, false, false, false, false] },
];

/** The canonical complete definition (plan §4). Every field present. */
export const DEFAULT_SWITCHER: SwitcherDef = {
  inputs: Array.from({ length: 24 }, (_, i): SwitcherInput => ({
    label: `SW ${i + 1}`,
    // A realistic default spread: 1-12 cameras/video, 13-18 playout, 19-24 graphics.
    category: i < 12 ? 'video' : i < 18 ? 'program' : 'audio',
  })),
  mes: 3,
  keyersPerMe: 4,
  dsks: [
    { name: 'DSK 1 · GRAPHICS 1', type: 'linear', source: 18 },
    { name: 'DSK 2 · GRAPHICS 2', type: 'linear', source: 19 },
    { name: 'DSK 3 · GRAPHICS 3', type: 'linear', source: 20 },
    { name: 'DSK 4 · GRAPHICS 4', type: 'linear', source: 21 },
    { name: 'DSK 5 · GRAPHICS 5', type: 'linear', source: 22 },
    { name: 'DSK 6 · GRAPHICS 6', type: 'linear', source: 23 },
  ],
  stills: 2,
  clips: 2,
  auxes: 4,
  macros: [],
  transitions: [
    'CUT', 'MIX', 'FAM', 'NAM', 'DIP', 
    'L-WIPE', 'BOX', 'IRIS', 'BARN DOORS', 
    'CURTAINS', 'MATRIX', 'CLOCK', 'ROTARY', 'STAR WIPE',
    'DVE PUSH', 'STINGER'
  ] as TransitionKind[],
  wipePatterns: ['L→R', 'R→L', 'T→B', 'BOX', 'CIRCLE', 'DIAG'],
  dvePresets: DVE_PRESETS,
  mePresets: ME_PRESETS,
  scenes: SCENES,
  layout: 'shift12',
  handedness: 'fixed',
};

/** Resolve the effective definition: default ⊕ legacy inputs[] ⊕ authored switcher. */
export function resolveDef(ctx: EditorContext): SwitcherDef {
  const cfg = ctx.twist.config;
  const authored = cfg?.switcher;
  // Legacy bridge: a production that only lists `inputs[]` (today's JSON) gets
  // those labels on the first buttons, padded to the default 24.
  let inputs = DEFAULT_SWITCHER.inputs;
  if (authored?.inputs?.length) {
    inputs = authored.inputs;
  } else if (cfg?.inputs?.length) {
    inputs = DEFAULT_SWITCHER.inputs.map((d, i) =>
      cfg.inputs![i] ? { ...d, label: cfg.inputs![i]! } : d);
  }

  const out = {
    ...DEFAULT_SWITCHER,
    ...authored,
  };
  
  // Append internal stills and clips to the input pool
  const stills = out.stills ?? DEFAULT_SWITCHER.stills ?? 2;
  const clips = out.clips ?? DEFAULT_SWITCHER.clips ?? 2;
  const internalInputs: SwitcherInput[] = [];
  for (let i = 1; i <= stills; i++) internalInputs.push({ label: `STILL ${i}`, category: 'video' });
  for (let i = 1; i <= clips; i++) internalInputs.push({ label: `CLIP ${i}`, category: 'video' });

  return {
    ...out,
    inputs: [...inputs, ...internalInputs],
    // Preset libraries MERGE (authored extend the starters) rather than replace,
    // so a production adds looks without losing the standard kit.
    dvePresets: mergeById(DEFAULT_SWITCHER.dvePresets, authored?.dvePresets),
    mePresets: mergeById(DEFAULT_SWITCHER.mePresets, authored?.mePresets),
    scenes: mergeById(DEFAULT_SWITCHER.scenes, authored?.scenes),
  };
}

function mergeById<T extends { id: string }>(base: T[], extra?: T[]): T[] {
  if (!extra?.length) return base;
  const out = [...base];
  for (const e of extra) {
    const i = out.findIndex((b) => b.id === e.id);
    if (i >= 0) out[i] = e; else out.push(e);
  }
  return out;
}
