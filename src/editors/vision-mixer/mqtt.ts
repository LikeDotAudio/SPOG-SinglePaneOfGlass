// src/editors/vision-mixer/mqtt — the SPOG param surface (deployment plan §6).
//
// The schema is DERIVED from the resolved SwitcherDef — one source of truth — as a
// registry of { spec, apply } entries. wire() advertises every spec and subscribes
// every apply; appliers update state + DOM WITHOUT re-publishing (no echo loop),
// exactly the house pattern. Dotted names namespace the tree
// (me.2.key.3.on → …/params/me.2.key.3.on); the six legacy params (pgm/pvw/
// transition/tbar/dsk1/dsk2) remain, aliased to M/E 1, so existing controllers
// keep working.

import type { EditorContext } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';

export interface ParamEntry {
  spec: ParamSpec;
  /** Apply an inbound write to state+DOM (never re-publish). */
  apply?(v: unknown): void;
}

export type ParamRegistry = Map<string, ParamEntry>;

/** Shorthand spec builders (all writable params gate on the switch capability). */
export const P = {
  enum: (name: string, values: string[]): ParamSpec => ({ name, type: 'enum', values, writable: true, cap: 'switch' }),
  num: (name: string, min: number, max: number, unit?: string): ParamSpec =>
    ({ name, type: 'number', min, max, writable: true, cap: 'switch', ...(unit ? { unit } : {}) }),
  bool: (name: string): ParamSpec => ({ name, type: 'bool', writable: true, cap: 'switch' }),
  str: (name: string): ParamSpec => ({ name, type: 'string', writable: true, cap: 'switch' }),
  ro: (name: string, type: ParamSpec['type'] = 'string'): ParamSpec => ({ name, type }),
};

/** Advertise the whole registry and subscribe every writable entry. */
export function wire(ctx: EditorContext, reg: ParamRegistry): void {
  ctx.services.advertiseParams?.([...reg.values()].map((e) => e.spec));
  for (const [name, e] of reg) {
    if (e.apply) ctx.services.onParam?.(name, e.apply);
  }
}

/** Publish helper — discrete presses default to unthrottled. */
export function publisher(ctx: EditorContext) {
  return (name: string, value: unknown, throttle = false): void =>
    ctx.services.publishParam?.(name, value, { throttle });
}
