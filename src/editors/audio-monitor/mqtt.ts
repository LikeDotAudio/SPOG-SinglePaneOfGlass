// src/editors/audio-monitor/mqtt — advertise every operator-driven control,
// publish an initial retained snapshot, and honour inbound writes from the bus /
// other consoles (audit §4.5). Only the SELF panel wires this; sibling panels
// render bus-less and never call it.

import type { EditorServices } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { FORMATS, type MasterState } from './state.js';
import type { ChEl, Block } from './types.js';

/** DOM/state handles the wiring needs to reflect inbound writes onto the panel. */
interface MonitorRefs {
  chanAll: ChEl[];
  blocks: Block[];
  vol: HTMLInputElement;
  setVolLbl: () => void;
  masterKeys: Record<string, HTMLElement>;
}

export function wireMonitorParams(services: EditorServices, ui: MasterState, refs: MonitorRefs): void {
  const { chanAll, blocks, vol, setVolLbl, masterKeys } = refs;

  const params: ParamSpec[] = [
    { name: 'volume', type: 'number', min: 0, max: 1, writable: true },
    { name: 'mute', type: 'bool', writable: true },
    { name: 'dim', type: 'bool', writable: true },
    { name: 'downmix', type: 'bool', writable: true },
  ];
  chanAll.forEach((_, i) => {
    params.push({ name: `ch${i + 1}_cue`, type: 'bool', writable: true });
    params.push({ name: `ch${i + 1}_mute`, type: 'bool', writable: true });
  });
  blocks.forEach((_, b) => params.push({ name: `group${b + 1}_format`, type: 'enum', values: [...FORMATS], writable: true }));
  services.advertiseParams?.(params);

  // Initial retained snapshot of current state.
  services.publishParam?.('volume', ui.master);
  services.publishParam?.('mute', ui.mute);
  services.publishParam?.('dim', ui.dim);
  services.publishParam?.('downmix', ui.downmix);
  chanAll.forEach((c, i) => {
    services.publishParam?.(`ch${i + 1}_cue`, c.ch.cue);
    services.publishParam?.(`ch${i + 1}_mute`, c.ch.mute);
  });
  blocks.forEach((blk, b) => services.publishParam?.(`group${b + 1}_format`, FORMATS[blk.fmt.idx]));

  // Inbound writes: apply to state + DOM WITHOUT re-publishing (no echo loop).
  services.onParam?.('volume', (v) => {
    if (typeof v === 'number') { ui.master = Math.max(0, Math.min(1, v)); vol.value = String(ui.master); setVolLbl(); }
  });
  services.onParam?.('mute', (v) => { ui.mute = !!v; masterKeys.mute?.classList.toggle('on', ui.mute); });
  services.onParam?.('dim', (v) => { ui.dim = !!v; masterKeys.dim?.classList.toggle('on', ui.dim); });
  services.onParam?.('downmix', (v) => { ui.downmix = !!v; masterKeys.downmix?.classList.toggle('on', ui.downmix); });
  chanAll.forEach((c, i) => {
    services.onParam?.(`ch${i + 1}_cue`, (v) => { c.ch.cue = !!v; c.cueEl.classList.toggle('on', !!v); });
    services.onParam?.(`ch${i + 1}_mute`, (v) => { c.ch.mute = !!v; c.muteEl.classList.toggle('on', !!v); });
  });
  blocks.forEach((blk, b) => {
    services.onParam?.(`group${b + 1}_format`, (v) => {
      const idx = FORMATS.indexOf(v as (typeof FORMATS)[number]);
      if (idx >= 0) { blk.fmt.idx = idx; blk.fmtEl.textContent = FORMATS[idx]!; }
    });
  });
}
