// src/app/main.ts — boot + composition root of the A.8 side build.
//
// Builds the LCARS routing console: the SOURCES ingress panel (left), the
// destination program content (centre), and the destinations tab FOOTER (bottom).
// Sources drag into destination twists (the crosspoint); clicking a twist opens
// its dispatched editor with a fully-resolved, typed EditorContext (data-in, M3).
// Composition root — the only layer allowed to wire ui + editors + platform.

import { pluginFor } from '../editors/registry.js';
import { openOverlay, slug } from '../platform/overlay.js';
import { buildContext } from './context.js';
import type { EditorServices } from '../editors/types.js';
import type { Production, TwistConfig, TipSpec, Hex } from '../model/index.js';
import { el } from '../ui/dom.js';
import { expectationTip } from '../ui/tip.js';
import { renderSourcesPanel } from '../ui/sources/panel.js';
import { wireSourceNodes } from '../ui/sources/interact.js';
import { Footer, loadAllDestinations, restoreFooterState } from '../ui/console/footer.js';
import { buildDestinations } from '../ui/console/destinations.js';
import { initClock } from '../ui/console/clock.js';
import { showSchedule } from '../ui/console/schedule.js';
import { initAuthPanel, applyScope } from '../ui/console/auth-panel.js';
import { initRouterView } from '../ui/console/router-view.js';
import { initAcademy } from '../ui/console/academy.js';
import { initUserMenu } from '../ui/console/user-menu.js';
import { initChatDock } from '../ui/console/chat-dock.js';
import { initChromeIcons } from '../ui/console/chrome-icons.js';
import { initCaptainsLog } from '../ui/console/captains-log.js';
import { initSourceFilter } from '../ui/console/source-filter.js';
import { initPortals } from '../ui/console/portals.js';
import { initMission } from '../ui/console/mission.js';
import { initLcarsPulse } from '../ui/console/lcars-pulse.js';
import { initChirality, applyStoredChirality, getChirality } from '../ui/console/chirality.js';
import { getPrefs, patchPrefs } from '../platform/prefs.js';
import { initColourScheme, applyStoredColourScheme } from '../ui/console/colour-scheme.js';
import { initAuthoring } from '../ui/console/authoring.js';
import { getBus, advertiseAll, startLogBridge } from '../platform/mqtt/index.js';
import { initSeatSync } from '../platform/seat-sync.js';
import { initBuildWatch } from '../ui/console/build-watch.js';
import { initMqttTree } from '../ui/console/mqtt-tree.js';
import { twistTopic, slug as topicSlug } from '../platform/mqtt/topics.js';
import { onRoleChange } from '../platform/auth.js';

// Real build stamp shown beside the credit byline — injected by Vite's `define`
// at build time (see vite.config.ts `buildId`), so it changes on every deploy.
// `.short` shows on the badge; `.full` (with git commit) is the hover title.
declare const __BUILD_ID__: { short: string; full: string; ts?: number };
const BUILD = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : { short: 'dev', full: 'dev build' };

/** "What this window does" — the one-line lead of each editor's context-derived
 *  expectation tip (Kind A). Keyed by plugin.id; an editor may override via its
 *  own `plugin.blurb`. Sourced from the README editor catalogue. */
const BLURBS: Record<string, string> = {
  'vision-mixer': 'Broadcast switcher — cut/mix/wipe PGM & PVW; keyers for lower-thirds & logos. This drives tally.',
  'multi-viewer': 'Configurable monitor wall (2×2→16×16) with PiP, tally states, and inline UMD labels.',
  'iso-recorder': 'Per-camera clean ISO recording + instant replay: jog/shuttle, angle select, mark-to-air.',
  'audio-mixer': 'Audio console — channel strips (fader/EQ/pan/aux), group buses; ⚙ jumps to Stage Box preamps.',
  'audio-monitor': 'Confidence monitor: 1–24-ch PPM/VU, phase correlation, and ITU-R BS.1770 loudness.',
  'audio-positioner': 'Object-based audio positioning (CMDP) — place beds and objects in the sound field.',
  'intercom': 'Comms key panel — TALK/LISTEN keys and gangable talk groups. The source layer for IFB.',
  'ifb': 'Talent earpiece: mix-minus (program minus own mic, to kill echo) plus the director interrupt.',
  'camera-control': 'CCU / RCP — PTZ plus shading (iris/gamma/gain/blacks), scopes, and the robotics map.',
  'encoder': 'Transcode/stream engine — 1:1 mezzanine → ABR ladder → RTMP/SRT, 2022-7 failover, DRM.',
  'signaling': 'Distributes tally (red PGM / green PVW / amber ISO), the On-Air light, and GPI/SCTE triggers.',
  'stagebox-input': 'Smart-object mic input — preamp gain/headroom, interlocked +48V phantom, impedance, HF comp.',
  'signal-conditioner': 'Frame-sync / delay / proc-amp — legalise and align signal at the studio edge.',
  'lighting': 'DMX console for a 3/4-point rig (Key/Fill/Back/Background) + set light; scene recall.',
  'wysiwyg': 'Top-down pre-viz of the DMX rig: beam cones, foot-candle heat-map, camera frustum, tally glow.',
  'graphics-engine': 'CG / title engine — lower-thirds, full-screen titles, and crawls on the rundown spine.',
  'meter-input': 'Real-video/audio scope bench — waveform, vectorscope, meters: an objective source of truth.',
  'person': 'A person as a routable virtual channel strip — identity, mic preference, and EQ/comp.',
  'prompter': 'Teleprompter source — a script + live playhead fanned to prompt heads (mirrored) & confidence.',
  'clock': 'Broadcast clock source — UTC + local ±3h zones as an LED ring (ticking) or a smooth analog sweep.',
  'chronos': 'Chronos graphic set — dual A/B chronometers + local time on configurable seven-segment or Arial faces (red/white on black).',
  'timer': 'Dual-channel up/down production timer — two 6-digit counts, 20 presets, follow buffer, calculator, and GPI on the bus.',
};

/** Cross-editor services (M1): replaces the legacy window.openStageBox global. */
const services: EditorServices = {
  openStageBox(name, color, channels) {
    // The real stagebox-input editor (preamp bench), not a bare channel list —
    // same pattern as openWirelessMic below. Channels ride in via config.inputs.
    const plugin = pluginFor('Stage Box');
    if (!plugin) return;
    openOverlay({ title: plugin.title, color, prodName: 'System', twistName: name }, (body, dispose) => {
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
    openOverlay({ title: plugin.title, color, prodName: 'System', twistName: name }, (body, dispose) => {
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
function openEditorForTwist(twistEl: HTMLElement): void {
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
    { title: prodName ? `${prodName} · ${plugin.title}` : plugin.title, color, prodName, twistName: name },
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
function openFromHash(): void {
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

/** Assemble the console shell and populate sources + destinations concurrently. */
async function buildConsole(): Promise<void> {
  // Paint the handedness + colour-scheme attributes on <html> BEFORE the grid
  // renders (no flash) — both are read by CSS on the initial paint.
  applyStoredChirality();
  applyStoredColourScheme();
  document.body.innerHTML = '';
  const ingress = el('div', { class: 'panel ingress-panel', id: 'sources' });
  const sash = el('div', { class: 'sidebar-sash', id: 'sidebar-sash', title: 'Drag to resize the sources sidebar' });
  const content = el('div', { id: 'production-content', style: 'flex:1 1 auto;min-height:0;overflow-y:auto;padding:24px 6px 4px 0;' });
  const destFrame = el('div', { class: 'panel dest-frame', style: 'overflow:hidden;display:flex;flex-direction:column;border:none;border-radius:0;' }, [content]);
  const container = el('div', { class: 'container' }, [ingress, sash, destFrame]);
  // Sources sash: drag to resize (chirality-aware — the grid is RTL right-handed),
  // width remembered per seat (restores the legacy sidebarWidth behavior).
  const applySash = (px: number): number => {
    const w = Math.max(180, Math.min(window.innerWidth * 0.5, px));
    container.style.setProperty('--sidebar-width', `${Math.round(w)}px`);
    return w;
  };
  const storedSash = getPrefs().ui.sashPx;
  if (typeof storedSash === 'number') applySash(storedSash);
  sash.addEventListener('mousedown', (e) => {
    e.preventDefault();
    sash.classList.add('dragging');
    let lastPx = 0;
    const move = (ev: MouseEvent): void => {
      const r = container.getBoundingClientRect();
      lastPx = applySash(getChirality() === 'right' ? r.right - ev.clientX : ev.clientX - r.left);
    };
    const up = (): void => {
      sash.classList.remove('dragging');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (lastPx) patchPrefs({ ui: { sashPx: Math.round(lastPx) } });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
  // The destinations tab FOOTER runs along the bottom, below the console.
  const footer = el('footer', { class: 'app-footer' }, [el('div', { id: 'production-tabs', class: 'tabs-header' })]);
  document.body.append(container, footer);
  // Footer chrome: the by-line credit link + the radial destination selector (◎).
  // The credit link shares a row with the relocated "1990s VIEW" launcher, which
  // router-view mounts into `.credit-row` (freeing the bottom corner for chat).
  document.body.append(el('div', { class: 'credit-row' }, [el('a', {
    class: 'credit-button', href: 'https://like.audio/20260627/twist-like-audio/',
    target: '_blank', rel: 'noopener',
  }, [
    'CREATED BY ANTHONY PETER KUZUB  -  WWW.LIKE.AUDIO',
    el('span', { class: 'app-version', title: BUILD.full }, [BUILD.short]),
  ])]));

  Footer.init(footer.querySelector('#production-tabs') as HTMLElement, content);
  await Promise.all([
    renderSourcesPanel(ingress, () => wireSourceNodes(ingress)).then(() => wireSourceNodes(ingress)),
    buildDestinations(openEditorForTwist),
  ]);
  // Seat memory: re-open the remembered groups + destination tab (a deep-link
  // hash still wins — openFromHash runs after boot and switches again).
  restoreFooterState();
  // Bottom-right UTC clock; the seconds-dots open the production schedule.
  initClock(showSchedule);
  // User control: the role badge (top-right) + login/rights overlays. Default Captain.
  initAuthPanel();
  // The "1990s VIEW" launcher — the Minesweeper-styled router crosspoint grid.
  initRouterView();
  // Production chat dock — bottom corner opposite the sources (the old 1990s slot).
  initChatDock();
  // Remaining LCARS chrome. Order: log button (top of sources) → filter (below it)
  // → portals pool (kept last) → mission bar + edge pulse (body-level).
  initCaptainsLog();
  initSourceFilter();
  initPortals();
  initMission();
  initLcarsPulse();
  initChirality();   // handedness toggle (sources rail edge + drag-ghost side)
  initColourScheme();   // palette launcher (left of chirality) → Colour & Vision editor
  initAuthoring();   // single-pane layout editing (EDIT LAYOUT toggle, bottom-left)
  initAcademy();   // first-load quick-start overlay + ACADEMY button (credit-row)
  initUserMenu();   // seat menu beside the log — adopts academy/1990s/display/chirality/credits

  // MQTT projection (audit: docs/Audit /TWIST-MQTT-Advertising-Audit.md). No-op
  // unless a broker is configured via ?mqtt=<host> — the console runs unchanged
  // without one. Advertise the whole catalogue, bridge the Captain's Log, and
  // mirror the operator role; publish a final presence on unload.
  const bus = getBus();
  initMqttTree(bus);   // bottom-right chip (above the clock) → live topic tree + broker config
  initChromeIcons();   // ICON-face tiles for the chrome buttons (after ALL chrome inits)
  startLogBridge(bus);
  initSeatSync(bus);   // seat prefs ride the retained bus; newer-wins on connect
  initBuildWatch(bus, BUILD);   // deploys announce themselves on the version badge
  onRoleChange((r) => bus.publishValue('system/role', { id: r.id, name: r.name, tier: r.tier }));
  void advertiseAll(bus);
  window.addEventListener('beforeunload', () => bus.dispose());
}

buildConsole().then(() => openFromHash()).catch((e: unknown) => {
  document.body.innerHTML = `<pre style="color:#ff6a6a">console boot failed: ${String(e)}</pre>`;
});
window.addEventListener('hashchange', openFromHash);
