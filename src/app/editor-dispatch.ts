// src/app/editor-dispatch.ts — twist → editor dispatch + deep-link routing.
//
// Split out of main.ts (composition root): the cross-editor services, the
// content-aware `openEditorForTwist` dispatch, the standing per-room fixture
// editors, and the #/<prod>/<twist> hash opener. main.ts wires these into the
// shell; nothing here imports the shell (keeps the dependency graph acyclic).

import { pluginFor } from '../editors/registry.js';
import { openOverlay, slug } from '../platform/overlay.js';
import { buildContext } from './context.js';
import type { EditorServices } from '../editors/types.js';
import type { Production, TwistConfig, TipSpec, Hex } from '../model/index.js';
import { el } from '../ui/dom.js';
import { expectationTip } from '../ui/tip.js';
import { loadAllDestinations } from '../ui/console/footer.js';
import { applyScope } from '../ui/console/auth-panel.js';
import { getBus } from '../platform/mqtt/index.js';
import { twistTopic, slug as topicSlug } from '../platform/mqtt/topics.js';
import { BLURBS } from './blurbs.js';

/** Cross-editor services (M1): replaces the legacy window.openStageBox global. */
const services: EditorServices = {
  openStageBox(name, color, channels) {
    // The real stagebox-input editor (preamp bench), not a bare channel list —
    // same pattern as openWirelessMic below. Channels ride in via config.inputs.
    const plugin = pluginFor('Stage Box');
    if (!plugin) return;
    openOverlay({ title: plugin.title, color, prodName: 'System', twistName: name, voiceCommands: plugin.voiceCommands }, (body, dispose) => {
      const ctx: any = {
        twist: { name, config: { name, inputs: channels } },
        sources: [],
        production: { name: 'System', color },
        siblings: [],
        can: () => true,
        services: twistServices('System', name),
        dispose,
      };
      plugin.render(body, ctx);
    });
  },
  openWirelessMic(name, color) {
    const plugin = pluginFor('wireless');
    if (!plugin) return;
    openOverlay({ title: plugin.title, color, prodName: 'System', twistName: name, voiceCommands: plugin.voiceCommands }, (body, dispose) => {
      const ctx: any = {
        twist: { name, config: { type: 'wireless-mic' } },
        sources: [],
        production: { name: 'System', color },
        siblings: [],
        can: () => true,
        services: twistServices('System', name),
        dispose
      };
      plugin.render(body, ctx);
    });
  },
};

/** Services scoped to one twist: the base services + a MQTT param bridge (audit §4.5)
 *  bound to THIS twist's topic (rooms/<prod>/twists/<twist>/params/<param>). */
function twistServices(prodDisplayName: string, twistName: string): EditorServices {
  const base = twistTopic(prodDisplayName, twistName);   // rooms/<prod>/twists/<twist>
  const bus = getBus();
  const paramTopic = (p: string): string => `${base}/params/${topicSlug(p)}`;
  return {
    ...services,
    advertiseParams(params) { bus.publishConfig(`${base}/config`, { kind: 'twist', name: twistName, params }); },
    publishParam(pname, value, opts) { bus.publishValue(paramTopic(pname), value, { throttle: opts?.throttle ?? true }); },
    onParam(pname, cb) { return bus.subscribe(paramTopic(pname), (_t, p) => cb((p as { value?: unknown } | null)?.value ?? p)); },
  };
}

/** A twist element in the console was clicked → open its dispatched editor. */
export function openEditorForTwist(twistEl: HTMLElement): void {
  let name = (twistEl.querySelector('.twist-title')?.textContent ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  let twist: string | TwistConfig = name;
  if (twistEl.dataset.config) {
    try {
      const c = JSON.parse(twistEl.dataset.config) as TwistConfig;
      twist = c;
      if (c.name) name = c.name;
    } catch { /* keep the title-derived name */ }
  }
  // Content-aware dispatch: a prompter feed routed onto ANY twist (e.g. a plain
  // MONITOR) opens the PROMPTER engine editor so the op can drive the script —
  // the twist's own name-editor is overridden by what's plugged into it.
  // Likewise a CLOCK feed (WORLD CLOCKS source) routed onto any twist opens the
  // clock/time-generator face rather than the twist's own name-editor.
  const hasPrompter = twistEl.querySelector('.signal-node.prompter-source');
  const hasClock = twistEl.querySelector('.signal-node.clock-source');
  const hasChronos = twistEl.querySelector('.signal-node.chronos-source');
  const hasTimer = twistEl.querySelector('.signal-node.timer-source');
  // A WEATHER feed is just another dataset for the Graphics Engine: routing one
  // onto any twist opens the CG engine, which selects its WEATHER template from
  // the routed source label (see graphics-engine/view railEntries).
  const hasWeather = twistEl.querySelector('.signal-node.weather-source');
  // A TEST SIGNAL GENERATOR feed routed onto any twist/MONITOR opens the TSG editor,
  // so the op can choose which standardised pattern the generator outputs.
  const hasTsg = twistEl.querySelector('.signal-node.tsg-source');
  const plugin = hasPrompter
    ? (pluginFor('PROMPTER') ?? pluginFor(name))
    : hasTimer
      ? (pluginFor('TIMER') ?? pluginFor(name))
      : hasChronos
        ? (pluginFor('CHRONOS') ?? pluginFor(name))
        : hasClock
          ? (pluginFor('CLOCK') ?? pluginFor(name))
          : hasWeather
            ? (pluginFor('GRAPHIC EDITOR') ?? pluginFor(name))
            : hasTsg
              ? (pluginFor('TSG') ?? pluginFor(name))
              : pluginFor(name);
  if (!plugin) return;
  const prodName = twistEl.dataset.prodName ?? '';
  const color = (twistEl.style.getPropertyValue('--lcars-color').trim() || '#646DCC') as Hex;
  // Room/floor/person-level hover tip authored in the Routes JSON, threaded here as
  // data attributes by destinations.renderPrograms (see ui/tip expectationTip).
  let prodTip: TipSpec | undefined;
  if (twistEl.dataset.prodTip) { try { prodTip = JSON.parse(twistEl.dataset.prodTip) as TipSpec; } catch { /* ignore */ } }
  const prod: Production = {
    id: twistEl.dataset.prodId ?? 'prod', name: prodName, color,
    parentName: twistEl.dataset.prodFloor || undefined, tip: prodTip,
  };
  const twistSvc = twistServices(prodName, name);
  openOverlay(
    { title: prodName ? `${prodName} · ${plugin.title}` : plugin.title, color, prodName, twistName: name, voiceCommands: plugin.voiceCommands },
    (body, dispose) => {
      const ctx = buildContext(prod, twist, dispose, twistSvc, twistEl);
      // "What the production expects of this window" — a hover tip on the title rail,
      // derived from the context + any JSON-authored room/tool tip. Attached even on
      // ACCESS DENIED so an op can see what the tool is and which role it needs.
      const titleEl = body.parentElement?.querySelector<HTMLElement>('.ed-title');
      if (titleEl) expectationTip(titleEl, ctx, { requiredCaps: plugin.requiredCaps, blurb: plugin.blurb ?? BLURBS[plugin.id] });
      const blocked = (plugin.requiredCaps ?? []).find((c) => !ctx.can(c));
      if (blocked) { body.innerHTML = `<div class="ed-h">ACCESS DENIED — requires "${blocked}"</div>`; return; }
      plugin.render(body, ctx);
      applyScope(body);   // progressive disclosure: hide [data-cap] the role lacks
    },
  );
}

/** The clean twist name a twist element resolves to (matches overlay's deep-link hash). */
function twistCleanName(twistEl: HTMLElement): string {
  let name = (twistEl.querySelector('.twist-title')?.textContent ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  if (twistEl.dataset.config) {
    try { const c = JSON.parse(twistEl.dataset.config) as TwistConfig; if (c.name) name = c.name; } catch { /* keep title-derived */ }
  }
  return name;
}

/** The standing per-destination fixtures (clock, dual-count timer) are NOT twists
 *  in the room JSON, so a #/<room>/clock deep link has no `.twist-container` to
 *  match. Map those slugs to the editor to open for the room instead. */
const FIXTURE_EDITOR: Record<string, string> = { clock: 'Clock', timer: 'Timer', counter: 'Timer' };

/** A detached twist element carrying a production's identity (copied off any of its
 *  real twists), so openEditorForTwist can open a fixture editor for that room. */
function synthTwistFor(rep: HTMLElement, name: string): HTMLElement {
  const t = document.createElement('div');
  t.className = 'twist-container';
  for (const k of ['prodId', 'prodName', 'prodFloor', 'prodTip'] as const) {
    if (rep.dataset[k]) t.dataset[k] = rep.dataset[k];
  }
  const color = rep.style.getPropertyValue('--lcars-color');
  if (color) t.style.setProperty('--lcars-color', color);
  const title = el('div', { class: 'twist-title' }, [name]);
  t.append(title);
  return t;
}

/** Open the editor named by a #/<prod>/<twist> deep link (lazy-loads destinations if needed). */
export function openFromHash(): void {
  if (document.querySelector('.ed-overlay.open')) return;   // already open
  const m = (location.hash || '').match(/^#\/([^/]+)\/([^/]+)$/);
  const prodSlug = m?.[1], twistSlug = m?.[2];
  if (!prodSlug || !twistSlug) return;
  const tryOpen = (): boolean => {
    const containers = [...document.querySelectorAll<HTMLElement>('.twist-container')];
    const tw = containers.find(
      (t) => slug(t.dataset.prodName ?? '') === prodSlug && slug(twistCleanName(t)) === twistSlug);
    if (tw) { openEditorForTwist(tw); return true; }
    // Fixture editors (clock / dual-count) aren't twists — open them for the room.
    const fixture = FIXTURE_EDITOR[twistSlug];
    if (fixture) {
      const rep = containers.find((t) => slug(t.dataset.prodName ?? '') === prodSlug);
      if (rep) { openEditorForTwist(synthTwistFor(rep, fixture)); return true; }
    }
    return false;
  };
  if (tryOpen()) return;
  loadAllDestinations();               // twists are lazy — render every tab, then retry
  setTimeout(tryOpen, 700);
}
