// src/editors/vision-mixer/tips — Kind-B tooltip copy for every switcher control
// (deployment plan §8). One place to edit the operator-facing language; index.ts
// attaches these via ui/tip. Written for an operator who has never touched a
// broadcast switcher — each tip says what the control DOES, in production terms.

import type { TipSpec } from '../../model/index.js';

export const TIPS: Record<string, TipSpec> = {
  pgmMon: { title: 'PROGRAM', lead: 'The on-air output of the delegated M/E — what the audience sees right now.', bad: 'Nothing here is a rehearsal: changes to PROGRAM are live.' },
  pvwMon: { title: 'PREVIEW', lead: 'The look-ahead of the NEXT take — background and armed keys — before you commit it.', good: 'Confirm the next shot here, then TAKE.' },
  tbar: { title: 'T-BAR / FADER', lead: 'Manually run the armed transition from PVW to PGM.', good: 'Push fully to complete the take; hold part-way for a partial dissolve.', bad: 'Not a volume fader — it is transition position, 0–100%.' },
  busPgm: { title: 'PROGRAM BUS', lead: 'Put a source directly on air on this M/E.', bad: 'This cuts live — use PREVIEW + TAKE for a prepared switch.' },
  busPvw: { title: 'PREVIEW BUS', lead: 'Arm a source as the next shot on this M/E.', good: 'Green = safe: nothing changes on air until you TAKE.' },
  shift: { title: 'SHIFT', lead: 'Show inputs 13–24 on the same twelve buttons — a second bank, like a keyboard shift.' },
  cut: { title: 'CUT', lead: 'Instant single-frame switch — the invisible workhorse of live TV.' },
  mix: { title: 'MIX', lead: 'Timed cross-fade from PGM to PVW at the set rate.' },
  wipe: { title: 'WIPE', lead: 'A moving pattern boundary reveals the next picture.', good: 'Pick the pattern in the M/E editor.' },
  dveTrans: { title: 'DVE TRANSITION', lead: 'Fly the next picture on with a 3D move (push, squeeze, tumble) from the DVE library.' },
  rate: { title: 'RATE', lead: 'Auto-transition duration in frames (24 ≈ 0.8 s at 30fps).' },
  take: { title: 'TAKE / AUTO', lead: 'Execute the armed transition: PVW and PGM swap (flip-flop), ready to come back.' },
  keyer: { title: 'KEYER', lead: 'A compositing layer over this M/E’s background — cuts a hole (key) and fills it (graphic, PIP).', good: 'Click to cut the key on/off air; ⚙ to set its type, source, and DVE.' },
  keyerCfg: { title: 'KEYER SETUP', lead: 'Choose the key type (luma/chroma/linear/split/pattern), its source, and an optional DVE move.' },
  dsk: { title: 'DOWNSTREAM KEYER', lead: 'The last key layer, above every M/E — bugs, captions, emergency supers ride here untouched by M/E transitions.' },
  meTab: { title: 'M/E DELEGATE', lead: 'Point the panel at this Mix/Effects bank — its buses, transition, and keyers.', good: 'M/E outputs are selectable as sources on other banks (re-entry) to stack composites.' },
  reentry: { title: 'RE-ENTRY', lead: 'This source is the OUTPUT of another M/E — select it to stack that bank’s whole composite here.', bad: 'A bank cannot re-enter itself; loops are ignored by tally.' },
  meEditor: { title: 'M/E EDITOR', lead: 'Save this bank’s whole composite (background + keys + transition) as a named look, and recall looks in one press.' },
  dveEditor: { title: 'DVE EDITOR', lead: 'The digital-optics bench: fly a picture in 3D (position, push-back, pitch/yaw/roll), keyframe A→B, save as a preset.' },
  scene: { title: 'SCENE RECALL', lead: 'A register holding the ENTIRE switcher — every M/E and DSK — recalled in one press.', good: 'Build your show beats (OPEN, INTERVIEW, BREAK…) as scenes.' },
  sceneStore: { title: 'STORE SCENE', lead: 'Capture the current state of the whole switcher into a named register.' },
  layout: { title: 'BUS LAYOUT', lead: 'Your choice of input layout: 12+shift, one wide row, or all 24 stacked. Saved on this device — the production only sets the default.' },
};
