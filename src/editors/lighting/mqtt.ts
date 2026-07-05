// src/editors/lighting/mqtt — the DMX console's R/W param wiring (bus, no DOM).
//
// Extracted from view.ts: advertises every driveable control as a read/write
// MQTT param (audit CR.6 full R/W) and honours inbound writes from the bus /
// other consoles by reflecting them back onto state + the sliders (apply, no
// echo). view.ts builds the DOM + closures and hands them here to wire.

import type { EditorContext } from '../types.js';
import type { Fixture } from './state.js';
import { SCENES, CUES, tempK } from './state.js';

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
/** Invert tempK() — map a Kelvin value back onto the 0..1 colour-temp slider. */
const kToTemp = (k: number): number => clamp((k - 3200) / 2400, 0, 1);

/** The render-side context the param wiring closes over. */
export interface LightingWiring {
  st: Fixture[];
  ctx: EditorContext;
  intInputs: HTMLInputElement[];
  ctInputs: HTMLInputElement[];
  paint: () => void;
  applyScene: (nm: string, set: readonly number[]) => void;
  flashCue: (l: string) => void;
}

/** Advertise + honour the DMX console's read/write params on the bus. */
export function wireLightingParams(w: LightingWiring): void {
  const { st, ctx, intInputs, ctInputs, paint, applyScene, flashCue } = w;

  // Advertise every driveable control as a read/write param (audit CR.6 full R/W).
  // Intensity in % (0..100), colour temp in Kelvin (3200..5600 via tempK()).
  const params = st.flatMap((f, i) => [
    { name: `fix${i + 1}_intensity`, type: 'number' as const, unit: '%', min: 0, max: 100, writable: true, cap: 'shade' as const },
    { name: `fix${i + 1}_temp`, type: 'number' as const, unit: 'K', min: 3200, max: 5600, writable: true, cap: 'shade' as const },
  ]);
  ctx.services.advertiseParams?.([
    ...params,
    { name: 'scene', type: 'enum', values: SCENES.map(([nm]) => nm), writable: true, cap: 'shade' },
    { name: 'cue', type: 'enum', values: [...CUES], writable: true, cap: 'shade' },
  ]);

  // External control: honour writes from the bus / other consoles (apply, no echo).
  st.forEach((f, i) => {
    ctx.services.onParam?.(`fix${i + 1}_intensity`, (v) => {
      if (typeof v !== 'number') return;
      f.intensity = clamp(v / 100, 0, 1);
      const inp = intInputs[i];
      if (inp) inp.value = String(f.intensity);
      paint();
    });
    ctx.services.onParam?.(`fix${i + 1}_temp`, (v) => {
      if (typeof v !== 'number') return;
      f.temp = kToTemp(v);
      const inp = ctInputs[i];
      if (inp) inp.value = String(f.temp);
      paint();
    });
  });
  ctx.services.onParam?.('scene', (v) => {
    const hit = SCENES.find(([nm]) => nm === v);
    if (hit) applyScene(hit[0], hit[1]);
  });
  ctx.services.onParam?.('cue', (v) => {
    if (typeof v === 'string') flashCue(v);
  });
}
