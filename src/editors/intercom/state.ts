// src/editors/intercom/state — the talk-group model the legacy render() kept as
// closure locals (`groups`, `selecting`, `picked`). Pure data; the view owns DOM.

import type { EditorContext } from '../types.js';

/** A talk group gangs several key panels under one big TALK button. */
export interface TalkGroup {
  name: string;
  /** Indices into the key list. */
  members: number[];
  on: boolean;
}

export interface IntercomState {
  /** Key-panel labels (resolved from ctx.sources / config / defaults). */
  keys: string[];
  groups: TalkGroup[];
  selecting: boolean;
  picked: Set<number>;
  /** Per-key operator state (indexed to `keys`) — the driveable/MQTT-published
      values: TALK latch, LISTEN latch, and the channel level fader (0..100). */
  talk: boolean[];
  listen: boolean[];
  level: number[];
}

/** Legacy fallback key set when no sources are routed (verbatim). */
export const DEFAULT_KEYS: readonly string[] = [
  'DIRECTOR',
  'TD / SWITCH',
  'A1 AUDIO',
  'FLOOR MGR',
  'CAM 1',
  'CAM 2',
  'CAM 3',
  'VTR / REPLAY',
  'GRAPHICS',
  'LIGHTING',
  'PRODUCER',
  'TECH',
];

export function resolveKeys(ctx: EditorContext): string[] {
  // Legacy gatherSources(twist) → ctx.sources; then config.inputs; then defaults.
  const fromSources = ctx.sources.map((s) => s.label);
  if (fromSources.length) return fromSources;
  const inputs = ctx.twist.config?.inputs;
  if (inputs && inputs.length) return [...inputs];
  return [...DEFAULT_KEYS];
}

export function createIntercomState(keys: string[]): IntercomState {
  return {
    keys,
    groups: [],
    selecting: false,
    picked: new Set<number>(),
    talk: keys.map(() => false),
    listen: keys.map(() => false),
    // Legacy default fader spread (verbatim from the view's initial slider value).
    level: keys.map((_, i) => 60 + ((i * 7) % 35)),
  };
}
