// src/editors/audio-monitor/types — per-panel DOM/meter binding shapes shared by
// buildOne (view.ts), the MQTT wiring (mqtt.ts) and the animation loop.

import type { ChState } from './state.js';

export interface ChEl {
  ch: ChState;
  meter: HTMLElement;
  mask: HTMLElement;
  pk: HTMLElement;
  cueEl: HTMLElement;
  muteEl: HTMLElement;
}

export interface Block {
  group: ChState[];
  chEls: ChEl[];
  liss: HTMLCanvasElement;
  ind: HTMLElement;
  corr: number;
  fmt: { idx: number };
  fmtEl: HTMLElement;
}
