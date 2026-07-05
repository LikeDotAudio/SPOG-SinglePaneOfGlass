// src/editors/vision-mixer/surface — the shared render context.
//
// The switcher's `render()` builds one long-lived closure over a pile of mutable
// state (delegate bank, bus buttons, keyer drawers, DVE flights, preset/scene
// libraries). To split the builders into importable siblings without duplicating
// that state, we hand each factory this single `Surface` object. Reassignable
// scalars are exposed as accessor properties that proxy straight back to the
// render closure's own `let`s, so index.ts keeps reading/writing them directly
// while extracted modules mutate the very same bindings by reference.

import type { EditorContext } from '../types.js';
import type { DVEPreset, MEPreset, SceneDef, SwitcherDef } from '../../model/index.js';
import type { MEState } from './me.js';
import type { SwitcherState } from './scenes.js';
import type { MacroRecorder } from './macros.js';

/** A keyer's live DVE flight: the preset in motion and when it was triggered. */
export interface Flight { preset: DVEPreset; t0: number; }

export interface Surface {
  readonly ctx: EditorContext;
  readonly def: SwitcherDef;
  readonly state: SwitcherState;
  readonly allLabels: string[];
  readonly flights: Map<string, Flight>;
  readonly dvePresets: DVEPreset[];
  readonly mePresets: MEPreset[];
  readonly scenes: SceneDef[];
  readonly macroRecorder: MacroRecorder;

  publish(topic: string, payload: unknown, throttle?: boolean): void;
  rawPublish(topic: string, payload: unknown, throttle?: boolean): void;

  me(): MEState;
  sync(): void;
  rebuild(): void;
  rebuildKeyers(): void;
  rebuildScenes(): void;
  rebuildSceneEditorSel(): void;
  doTake(bank: number): void;

  // Reassignable render-closure scalars, proxied via getter/setter.
  delegate: number;
  shift: boolean;
  dveTargetKeyer: number;
  activeKeyerParam: number | null;
  busBtns: { pgm: HTMLElement[]; pvw: HTMLElement[] };
}
