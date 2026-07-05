// src/app/shell.ts — the console shell: build the LCARS grid + wire all chrome.
//
// Split out of main.ts (composition root): `buildConsole` assembles the SOURCES
// panel (left), destination content (centre), tab FOOTER (bottom), the resize
// sash, then fires every init* for the LCARS chrome + the MQTT projection. The
// twist→editor dispatch lives in editor-dispatch.ts (imported here for
// buildDestinations); main.ts owns the BUILD stamp and passes it in.

import { el } from '../ui/dom.js';
import { renderSourcesPanel } from '../ui/sources/panel.js';
import { wireSourceNodes } from '../ui/sources/interact.js';
import { Footer, loadAllDestinations, restoreFooterState } from '../ui/console/footer.js';
import { buildDestinations } from '../ui/console/destinations.js';
import { initClock } from '../ui/console/clock.js';
import { showSchedule } from '../ui/console/schedule.js';
import { initAuthPanel } from '../ui/console/auth-panel.js';
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
import { onRoleChange } from '../platform/auth.js';
import { openEditorForTwist } from './editor-dispatch.js';

/** The Vite-injected build stamp (see main.ts / vite.config.ts). */
type BuildStamp = { short: string; full: string; ts?: number };

/** Assemble the console shell and populate sources + destinations concurrently. */
export async function buildConsole(BUILD: BuildStamp): Promise<void> {
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
    'CREATED BY ANTHONY PETER KUZUB  -  WWW.LIKE.AUDIO',
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
