// src/editors/ifb — Audio IFB (Interruptible Foldback) editor. Tied to the
// intercom: the talent's earpiece receives a MIX-MINUS (program minus their own
// mic) and an IFB INTERRUPT (the director's talk). A Ducker drops the program by
// the Interrupt Depth while a Talk key is held. Talk keys follow the interrupt
// hierarchy P1 Director · P2 Technical Director · P3 Production Assistant.
//
// Legacy renderGridOfSiblings → ui/grid `gridCells` + EditorContext.siblings,
// one full IFB strip per same-kind sibling twist (no DOM scraping).

import { VOICE_COMMANDS } from './VOICE.js';
import type { EditorPlugin } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { gridCells } from '../../ui/grid.js';
import { injectIfbStyles } from './styles.js';
import { buildOne } from './view.js';
import { stripPrefix, TALK_VALUES, ROUTE_VALUES } from './state.js';

const plugin: EditorPlugin = {
  id: 'ifb',
  title: 'IFB · INTERRUPTIBLE FOLDBACK',
  order: 8,
  match: (n) => /\bifb\b|foldback/i.test(n),
  requiredCaps: ['comms'],
  voiceCommands: VOICE_COMMANDS,
  render(host, ctx) {
    injectIfbStyles();
    // ctx.siblings includes self; fall back to this twist if the host left it
    // empty (same guard as audio-monitor) so the editor never renders blank.
    const panels = ctx.siblings.length
      ? [...ctx.siblings]
      : [{ name: ctx.twist.name, config: ctx.twist.config, sources: ctx.sources }];
    const cells = gridCells(host, panels.length);
    // Advertise EVERY strip's driveable controls in ONE call — the twist's
    // `…/config` is retained and replaced, so per-strip advertises would clobber
    // each other. Each talent strip exposes the three encoders + the interrupt
    // (talk) state, flat-indexed `t<N>_…` (audit §4.5).
    ctx.services.advertiseParams?.(panels.flatMap((_, i): ParamSpec[] => {
      const pfx = stripPrefix(i);
      return [
        { name: `${pfx}prog_gain`, type: 'number', unit: '%', min: 0, max: 1, writable: true },
        { name: `${pfx}int_gain`, type: 'number', unit: '%', min: 0, max: 1, writable: true },
        { name: `${pfx}threshold`, type: 'number', unit: '%', min: 0, max: 1, writable: true },
        { name: `${pfx}talk`, type: 'enum', values: [...TALK_VALUES], writable: true },
        { name: `${pfx}route`, type: 'enum', values: [...ROUTE_VALUES], writable: true },
      ];
    }));
    panels.forEach((sib, i) => {
      const cell = cells[i];
      if (cell) buildOne(cell, sib, ctx.dispose, ctx.services, i);
    });
  },
};

export default plugin;
