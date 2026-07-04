// src/editors/audio-mixer/state — channel derivation for the console.
//
// The legacy editor SCRAPED routed audio out of the DOM (gatherGrouped / channelsFor).
// In the side build everything is resolved on the context, so we derive the channel
// list from ctx.sources, mirroring the legacy channelsFor fallback chain:
//   routed sources → config.inputs → prefix + N.

import type { EditorContext } from '../types.js';

/** One console channel strip's identity. */
export interface Channel {
  label: string;
  color: string;
  type?: string;
  /** Device lineage ("Floor — Room — Device") the feed came from. */
  origin?: string;
}

/** Channels per layer (legacy LAYER constant). */
export const LAYER = 8;

const FALLBACK_COLOR = '#4d94ff';

/** Persistent control values for one channel strip (0..1 normalized, like the widgets).
 *  Kept OUT of the DOM so moves survive a layer redraw and can be published/driven over
 *  MQTT without ever scraping the DOM (publish-spec: publish from the editor's own state). */
export interface StripState {
  gain: number;   // fader, 0..1 (0.7 ≈ unity)
  pan: number;    // pan, 0..1 (0.5 = centre)
  mute: boolean;
  solo: boolean;
  eqHi: number; eqMid: number; eqLo: number; // EQ trims, 0..1 (0.5 = flat)
  mm: number[];   // mix-minus sends 1..4, 0..1
  mon: number[];  // monitor sends 1..4, 0..1
}

/** Whole-console persistent state: per-strip values + master + selected layer. */
export interface MixerState {
  layer: number;
  strips: StripState[];
  master: { gain: number; bal: number };
}

function newStrip(): StripState {
  return {
    gain: 0.7, pan: 0.5, mute: false, solo: false,
    eqHi: 0.5, eqMid: 0.5, eqLo: 0.5,
    mm: [0.3, 0.3, 0.3, 0.3], mon: [0.3, 0.3, 0.3, 0.3],
  };
}

/** Seed console state with the same defaults the view used to hard-code per widget. */
export function buildState(channelCount: number): MixerState {
  return {
    layer: 0,
    strips: Array.from({ length: channelCount }, newStrip),
    master: { gain: 0.8, bal: 0.5 },
  };
}

/** Derive the console channels from resolved context (no DOM scraping). */
export function buildChannels(ctx: EditorContext): Channel[] {
  if (ctx.sources.length) {
    return ctx.sources.map((f: any) => ({ label: f.label, color: f.color, type: f.type, origin: f.origin }));
  }
  const inputs = ctx.twist.config?.inputs;
  if (inputs && inputs.length) {
    return inputs.map((label) => ({ label, color: FALLBACK_COLOR }));
  }
  return Array.from({ length: LAYER }, (_, i) => ({
    label: `CH ${i + 1}`,
    color: FALLBACK_COLOR,
  }));
}
