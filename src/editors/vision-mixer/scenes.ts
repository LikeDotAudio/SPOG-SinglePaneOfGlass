// src/editors/vision-mixer/scenes — register memory (audit §8 "scene recall").
//
// A scene is a whole-switcher snapshot: every M/E bank's composite + the DSK
// states, recalled in one press. Seeded from the production's SwitcherDef.scenes,
// extended by operator-saved registers persisted per twist (localStorage — same
// no-backend pattern as the clock bench's saved layouts).

import type { SceneDef, SwitcherDef } from '../../model/index.js';
import { applyPreset, capturePreset, type MEState } from './me.js';

export interface SwitcherState {
  mes: MEState[];
  dsks: boolean[];
  auxes: number[];
  /** Per-DSK source override (the graphics PRE-ROUTE): which input feeds each
   *  downstream keyer. Absent → each DSK uses its hard-wired `def.dsks[i].source`. */
  dskSrc?: number[];
}

const LS_KEY = (twist: string): string => `twist.vm.scenes.${twist}`;

export function loadUserScenes(twist: string): SceneDef[] {
  try {
    return (JSON.parse(localStorage.getItem(LS_KEY(twist)) || '[]') as SceneDef[]) || [];
  } catch { return []; }
}

export function saveUserScenes(twist: string, scenes: SceneDef[]): void {
  try { localStorage.setItem(LS_KEY(twist), JSON.stringify(scenes)); } catch { /* ignore */ }
}

/** Capture the full switcher into a named scene register. */
export function captureScene(state: SwitcherState, id: string, name: string): SceneDef {
  return {
    id, name,
    mes: state.mes.map((me, i) => capturePreset(me, `${id}-me${i + 1}`, `ME${i + 1}`)),
    dsks: [...state.dsks],
    auxes: [...state.auxes],
  };
}

/** Recall a scene onto the live switcher. A seeded scene with no M/E payload
 *  (the starter library ships beat-name placeholders) applies only its DSKs. */
export function recallScene(state: SwitcherState, scene: SceneDef, def: SwitcherDef): void {
  scene.mes.forEach((p, i) => { if (state.mes[i]) applyPreset(state.mes[i]!, p, def); });
  scene.dsks.forEach((on, i) => { if (i < state.dsks.length) state.dsks[i] = on; });
  if (scene.auxes) scene.auxes.forEach((src, i) => { if (i < state.auxes.length) state.auxes[i] = src; });
}
