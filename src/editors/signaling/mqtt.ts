// src/editors/signaling/mqtt — MQTT param wiring for the SIGNALING surface,
// extracted from view.ts. Advertises the operator-driven signals as writable
// params and honours inbound writes from the bus / other consoles (repaint
// WITHOUT republishing). Triggers subscribe per-button in view.ts's addTrig.

import type { EditorContext } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { DEFAULT_TRIGS, type Cam, type SignalingState } from './state.js';

export function wireSignalingParams(
  ctx: EditorContext,
  ui: SignalingState,
  cams: Cam[],
  modeBtns: HTMLElement[],
  paint: () => void,
  trigParam: (label: string) => string,
): void {
  // Advertise every operator-driven signal as a writable param (audit CR.6): the
  // studio mode, the per-cam tally bools (PGM/PVW/ISO), and each default GPI/SCTE
  // trigger. Called once — dynamically added custom triggers still publish on fire.
  const params: ParamSpec[] = [
    { name: 'mode', type: 'enum', values: ['live', 'reh'], writable: true },
    ...cams.flatMap((_cam, i): ParamSpec[] => [
      { name: `ch${i + 1}_pgm`, type: 'bool', writable: true },
      { name: `ch${i + 1}_pvw`, type: 'bool', writable: true },
      { name: `ch${i + 1}_iso`, type: 'bool', writable: true },
    ]),
    ...DEFAULT_TRIGS.map((t): ParamSpec => ({ name: trigParam(t.l), type: 'bool', writable: true })),
  ];
  ctx.services.advertiseParams?.(params);

  // Honour writes from the bus / other consoles: apply to state + repaint WITHOUT
  // republishing (avoid an echo loop). Triggers subscribe per-button in addTrig.
  ctx.services.onParam?.('mode', (v) => {
    if (v === 'live' || v === 'reh') {
      ui.mode = v;
      modeBtns.forEach((x) => x.classList.toggle('sel', x.dataset['mode'] === v));
      paint();
    }
  });
  cams.forEach((_cam, i) => {
    ctx.services.onParam?.(`ch${i + 1}_pgm`, (v) => { if (v) { ui.pgm = i; paint(); } });
    ctx.services.onParam?.(`ch${i + 1}_pvw`, (v) => { if (v) { ui.pvw = i; paint(); } });
    ctx.services.onParam?.(`ch${i + 1}_iso`, (v) => { if (v) ui.iso.add(i); else ui.iso.delete(i); paint(); });
  });
}
