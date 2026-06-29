// src/editors/types — the ONE contract every editor implements (M2 + M3 + M6).
//
// Editors are pure plugins: they receive a typed EditorContext (already-resolved
// data — NO DOM scraping, unlike the legacy render(body, twist, config)) and a
// host element to render into. They declare their own dispatch match, title, and
// required capabilities. No editor imports another; cross-editor needs (e.g.
// openStageBox) arrive as typed services on the context, never as window globals.

import type { Capability, Hex, TwistConfig } from '../model/index.js';
import type { Feed } from '../domain/routing-core/index.js';

/** Everything an editor needs, as data — resolved by the host, not scraped. */
export interface EditorContext {
  /** Feeds routed into this twist (groups already expanded). */
  sources: Feed[];
  config: TwistConfig | null;
  production: { name: string; color: Hex };
  /** Role gate — true if the current operator holds the capability. */
  can(cap: Capability): boolean;
  /** Typed cross-editor service (replaces window.openStageBox). */
  services: EditorServices;
}

export interface EditorServices {
  openStageBox(name: string, color: Hex, channels: string[]): void;
}

export type EditorRender = (host: HTMLElement, ctx: EditorContext) => void;

/** A self-contained editor package's manifest — its single export. */
export interface EditorPlugin {
  id: string;
  /** Does this editor handle a twist with the given name? */
  match(twistName: string): boolean;
  title: string;
  /** Editor-level gating; the host hides the editor if unmet. */
  requiredCaps?: Capability[];
  render: EditorRender;
}
