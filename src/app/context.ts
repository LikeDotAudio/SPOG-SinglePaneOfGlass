// src/app/context — resolve a twist into a typed EditorContext (M3).
//
// This is the inversion the strategy doc calls for: instead of handing an editor
// a live DOM node to scrape, the HOST resolves the routed feeds (and siblings,
// production, services, gating) into data and passes it. Editors become pure
// functions of data → UI.

import type { Production, TwistConfig, Hex } from '../model/index.js';
import type { EditorContext, EditorServices, Sibling } from '../editors/types.js';
import type { Feed } from '../domain/routing-core/index.js';
import { pluginFor } from '../editors/registry.js';
import { can } from '../platform/auth.js';
import type { Disposer } from '../ui/timers.js';

const twistName = (t: string | TwistConfig): string => (typeof t === 'string' ? t : t.name);
const twistConfig = (t: string | TwistConfig): TwistConfig | null => (typeof t === 'string' ? null : t);

/**
 * Resolve the feeds routed into a twist. The side build has no live crosspoint
 * matrix yet (P3 of the shell), so feeds are derived from the twist's configured
 * inputs — mirroring the legacy channelsFor() fallback chain: explicit inputs,
 * else a default slot count. When the real DnD matrix lands these come from the
 * routing-core graph instead, with zero editor changes.
 */
function resolveSources(config: TwistConfig | null, color: Hex): Feed[] {
  const inputs = config?.inputs;
  if (inputs && inputs.length) {
    return inputs.map((label, i) => ({ id: `${label}-${i}`, label, color }));
  }
  return [];
}

/** Feeds actually routed into a twist's crosspoints (DOM), so editors reflect the
 *  live trickle-down cascade. Groups expand to their children; each node's own
 *  colour is kept so the positioner/console bundle by source. */
function routedFeeds(twistEl: HTMLElement): Feed[] {
  const dz = twistEl.querySelector<HTMLElement>('.drop-zone');
  if (!dz) return [];
  const out: Feed[] = [];
  const push = (n: HTMLElement, i: number): void => {
    const label = (n.textContent ?? '').trim().split('\n')[0]?.trim() ?? '';
    if (!label) return;
    const color = (n.style.color || n.style.borderColor || getComputedStyle(n).color || '#4d94ff');
    const type = n.dataset.type;
    const media = n.classList.contains('audio') ? 'audio' as const
      : n.classList.contains('video') ? 'video' as const
      : n.classList.contains('control') || n.classList.contains('camera-control') ? 'control' as const
      : undefined;
    out.push({ id: n.id || `xp-${i}`, label, color, type, origin: n.dataset.origin, media });
  };
  dz.querySelectorAll<HTMLElement>(':scope > .signal-node').forEach((n, i) => {
    if (n.classList.contains('dropped-group')) {
      n.querySelectorAll<HTMLElement>('.dropped-group-children .signal-node').forEach((c, j) => push(c, i * 100 + j));
    } else push(n, i);
  });
  return out;
}

/** The same-kind siblings of a twist (those dispatching to the same editor). */
function resolveSiblings(prod: Production, selfName: string, color: Hex): Sibling[] {
  const selfPlugin = pluginFor(selfName);
  if (!selfPlugin) return [];
  const out: Sibling[] = [];
  for (const t of prod.twists ?? []) {
    const name = twistName(t);
    if (pluginFor(name)?.id !== selfPlugin.id) continue;
    const config = twistConfig(t);
    out.push({ name, config, sources: resolveSources(config, color) });
  }
  return out;
}

/** Same-kind siblings read from the rendered program row. The click path rebuilds
 *  the Production from the twist element's data attributes, which do NOT carry the
 *  room's twist list — so `resolveSiblings` comes up empty and every grid-of-
 *  siblings editor (IFB, intercom, audio monitor…) rendered nothing/one panel.
 *  The row's `.twist-container`s ARE the twist list; each carries its config and
 *  its live routed feeds. */
function domSiblings(twistEl: HTMLElement, selfName: string): Sibling[] {
  const selfPlugin = pluginFor(selfName);
  const row = twistEl.closest('.program-row');
  if (!selfPlugin || !row) return [];
  const out: Sibling[] = [];
  row.querySelectorAll<HTMLElement>('.twist-container').forEach((el) => {
    let name = (el.querySelector('.twist-title')?.textContent ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
    let config: TwistConfig | null = null;
    if (el.dataset.config) {
      try { config = JSON.parse(el.dataset.config) as TwistConfig; } catch { /* title-derived name */ }
    }
    if (config?.name) name = config.name;
    if (pluginFor(name)?.id !== selfPlugin.id) return;
    out.push({ name, config, sources: routedFeeds(el) });
  });
  return out;
}

export function buildContext(
  prod: Production,
  twist: string | TwistConfig,
  dispose: Disposer,
  services: EditorServices,
  twistEl?: HTMLElement,
): EditorContext {
  const name = twistName(twist);
  const config = twistConfig(twist);
  const color = (prod.color ?? '#646DCC') as Hex;
  // Prefer live routed crosspoints (the cascade); fall back to configured inputs.
  const routed = twistEl ? routedFeeds(twistEl) : [];
  // Declared twists first; else read same-kind siblings out of the rendered row.
  const declared = resolveSiblings(prod, name, color);
  const siblings = declared.length ? declared : twistEl ? domSiblings(twistEl, name) : [];
  return {
    twist: { name, config },
    sources: routed.length ? routed : resolveSources(config, color),
    // `tip`/`floor` are the JSON-authored hover tips (room/person-level tip and the
    // floor/category this room sits under) — resolved by the host, surfaced by ui/tip.
    production: { name: prod.name, color, tip: prod.tip, floor: prod.parentName },
    siblings,
    can,
    services,
    dispose,
  };
}
