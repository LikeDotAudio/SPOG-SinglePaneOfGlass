// src/editors/iso-recorder/channels — drawable channel list + resolver.

import type { EditorContext } from '../types.js';

/** A drawable channel: the data each ISO/angle control is built from. */
export interface Chan {
  label: string;
  color: string;
}

/** Resolve channels the data-in way (ctx.sources → config.inputs → CAM N). */
export function channelsFor(ctx: EditorContext, fallbackPrefix: string, fallbackCount: number): Chan[] {
  if (ctx.sources.length) {
    return ctx.sources.map((f) => ({ label: f.label, color: f.color }));
  }
  const inputs = ctx.twist.config?.inputs;
  if (inputs && inputs.length) {
    return inputs.map((i) => ({ label: i, color: '#4d94ff' }));
  }
  return Array.from({ length: fallbackCount }, (_unused, i) => ({
    label: `${fallbackPrefix} ${i + 1}`,
    color: '#4d94ff',
  }));
}
