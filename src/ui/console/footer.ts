// src/ui/console/footer — the DESTINATIONS footer: the LCARS tab bar pinned at
// the bottom of the console (the `#production-tabs` strip). Port of js/topbar.js
// (TopBar). Nested accordion groups (DESTINATIONS → FLOORS → floor), D-shaped
// tabs, lazy content panes filled on first activation, and auto-collapse on idle.
//
// Named "footer" per the console anatomy: sources column (left) · destination
// content (centre) · this tab footer (bottom).
import { addStyles } from '../dom.js';
import { stampIcon } from '../icon-face.js';
import { getPrefs, patchPrefs } from '../../platform/prefs.js';
import { FOOTER_CSS, LCARS_COLORS, hexToRgb } from './footer-styles.js';

export interface GroupHandle {
  group: HTMLElement;
  tabsEl: HTMLElement;
  bodyEl: HTMLElement;
  labelEl: HTMLElement;
  parent: GroupHandle | null;
  path: string;
}
interface TabInfo { id: string; name: string }
interface TabOpts { group?: GroupHandle | null; active?: boolean; color?: string; onActivate?: () => void }

let tabsContainer: HTMLElement | null = null;
let contentContainer: HTMLElement | null = null;
let tabIndex = 0;
let groups: GroupHandle[] = [];
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let idleBound = false;
const IDLE_MS = 10000;

function collapseAllGroups(): void {
  groups.forEach((g) => g.group.classList.add('collapsed'));
}
function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(collapseAllGroups, IDLE_MS);
}
function bindIdleWatchers(): void {
  if (idleBound) return;
  idleBound = true;
  (['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'] as const)
    .forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
}

// Remember the OPERATOR's open/closed choices (idle auto-collapse is UX, not a
// preference, so collapseAllGroups deliberately never writes here).
function persistOpenGroups(): void {
  patchPrefs({ ui: { openGroups: groups.filter((g) => !g.group.classList.contains('collapsed')).map((g) => g.path) } });
}

function toggleGroup(target: GroupHandle, persist = true): void {
  const expand = target.group.classList.contains('collapsed');
  groups.filter((g) => g.parent === target.parent && g !== target).forEach((g) => g.group.classList.add('collapsed'));
  target.group.classList.toggle('collapsed', !expand);
  if (expand && !target.tabsEl.querySelector('.lcars-tab.active')) {
    target.tabsEl.querySelector<HTMLElement>('.lcars-tab')?.click();
  }
  if (persist) persistOpenGroups();
}

/** Open a group (and its ancestor chain) by its stored path. */
export function openGroupPath(path: string): boolean {
  const target = groups.find((g) => g.path === path);
  if (!target) return false;
  const chain: GroupHandle[] = [];
  for (let g: GroupHandle | null = target; g; g = g.parent) chain.unshift(g);
  chain.forEach((g) => { if (g.group.classList.contains('collapsed')) toggleGroup(g, false); });
  resetIdleTimer();
  return true;
}

/** Activate a destination tab by its pane id (programmatic restore / deep link). */
export function activateTab(tabId: string): boolean {
  const tab = document.querySelector<HTMLElement>(`.lcars-tab[data-tab-id="${CSS.escape(tabId)}"]`);
  if (!tab) return false;
  tab.click();
  return true;
}

// ---- URL deep-linking (`#on/<floor…>/<production>`) --------------------------
const destSlug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const groupOfTab = (tab: HTMLElement): GroupHandle | null => groups.find((g) => g.tabsEl.contains(tab)) ?? null;
const chainSlugs = (g: GroupHandle | null): string[] => (g ? g.path.split(' / ').map(destSlug) : []);

/** The `on/<floor…>/<production>` hash path that addresses a destination tab. */
export function destHashPath(tab: HTMLElement): string {
  const segs = chainSlugs(groupOfTab(tab));
  segs.push(destSlug(tab.innerText));
  return 'on/' + segs.filter(Boolean).join('/');
}

/** Deep-link: reveal + select a destination by its slugged path. The last segment
 *  is the production tab; earlier ones are floor/category filters (a subsequence of
 *  the tab's group chain, so intermediate levels like "primary" may be omitted). */
export function navigateToDest(segments: string[]): boolean {
  const segs = segments.map(destSlug).filter(Boolean);
  if (!segs.length) return false;
  const prod = segs[segs.length - 1], floors = segs.slice(0, -1);
  for (const tab of document.querySelectorAll<HTMLElement>('.lcars-tab')) {
    if (destSlug(tab.innerText) !== prod) continue;
    const g = groupOfTab(tab), chain = chainSlugs(g);
    let ci = 0;
    const ok = floors.every((f) => { while (ci < chain.length && chain[ci] !== f) ci++; return ci++ < chain.length; });
    if (!ok) continue;
    if (g) openGroupPath(g.path);
    tab.click();
    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    return true;
  }
  return false;
}

/** Handle an `#on/…` deep link in the current URL. Returns true if it matched. */
export function handleDestDeepLink(): boolean {
  const h = location.hash || '';
  if (!/^#on\//i.test(h)) return false;
  return navigateToDest(h.replace(/^#on\//i, '').split('/').filter(Boolean).map(decodeURIComponent));
}

/** Re-apply the remembered footer state (open groups + selected destination).
 *  Call once after the destination tree is built; a deep-link hash still wins
 *  because openFromHash runs after and simply switches again. */
export function restoreFooterState(): void {
  const ui = getPrefs().ui;
  // parents before children so ancestor chains expand in order
  [...(ui.openGroups ?? [])].sort((a, b) => a.split(' / ').length - b.split(' / ').length)
    .forEach((p) => openGroupPath(p));
  if (ui.destTab) activateTab(ui.destTab);
}

/** Show one destination pane, hide the rest (port of js/globals.js switchTab). */
function switchTab(tabId: string, ev: Event): void {
  document.querySelectorAll('.tab, .lcars-tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll<HTMLElement>('.tab-content').forEach((c) => { c.style.display = ''; c.classList.remove('active'); });
  (ev.currentTarget as HTMLElement).classList.add('active');
  const target = document.getElementById('tab-' + tabId);
  if (target) { target.style.display = ''; target.classList.add('active'); }
}

/** Activate every destination tab so its program + twists render (used by the
 *  1990s router-view's "ALL DESTINATIONS" to reveal unconnected receivers). */
export function loadAllDestinations(): void {
  document.querySelectorAll<HTMLElement>('.lcars-tab').forEach((t) => { try { t.click(); } catch { /* ignore */ } });
}

export const Footer = {
  /** Bind the footer to its tab-strip + content host. Call once per render. */
  init(tabsEl: HTMLElement, contentEl: HTMLElement): void {
    addStyles('lcars-topbar-styles', FOOTER_CSS);
    tabsContainer = tabsEl;
    contentContainer = contentEl;
    tabsContainer.className = 'lcars-topbar';
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    tabIndex = 0;
    groups = [];
    bindIdleWatchers();
    resetIdleTimer();
  },

  addGroup(label: string, opts: { color?: string; collapsed?: boolean; parent?: GroupHandle | null } = {}): GroupHandle | null {
    if (!tabsContainer) return null;
    const color = opts.color || '255,170,0';
    const parent = opts.parent || null;
    const group = document.createElement('div');
    group.className = 'lcars-group' + (opts.collapsed ? ' collapsed' : '');
    group.style.setProperty('--group-lcars', color);
    const labelEl = document.createElement('div');
    labelEl.className = 'lcars-group-label';
    labelEl.innerHTML = `<span>${label}</span><span class="lcars-group-caret">▸</span>`;
    group.appendChild(labelEl);
    const bodyEl = document.createElement('div');
    bodyEl.className = 'lcars-group-body';
    group.appendChild(bodyEl);
    const tabsEl = document.createElement('div');
    tabsEl.className = 'lcars-group-tabs';
    bodyEl.appendChild(tabsEl);
    const handle: GroupHandle = { group, tabsEl, bodyEl, labelEl, parent, path: parent ? `${parent.path} / ${label}` : label };
    labelEl.addEventListener('click', (e) => { e.stopPropagation(); toggleGroup(handle); });
    groups.push(handle);
    (parent ? parent.bodyEl : tabsContainer).appendChild(group);
    // ICON face: top-level category groups carry their dock tile (inert in LCARS
    // face; only activates if Routes/Destinations/.icons/<slug>.svg exists).
    if (!parent) stampIcon(labelEl, 'dest', label);
    return handle;
  },

  addTab(pgm: TabInfo, opts: TabOpts = {}): HTMLElement | null {
    if (!tabsContainer || !contentContainer) return null;
    const active = !!opts.active;
    const host = (opts.group && opts.group.tabsEl) || tabsContainer;
    const color = (opts.color && hexToRgb(opts.color)) || LCARS_COLORS[tabIndex % LCARS_COLORS.length] || '0,0,0';
    tabIndex++;
    const tab = document.createElement('div');
    tab.className = 'lcars-tab' + (active ? ' active' : '');
    tab.style.setProperty('--lcars', color);
    tab.dataset['tabId'] = pgm.id;
    tab.innerText = pgm.name;
    host.appendChild(tab);
    const cont = document.createElement('div');
    cont.id = 'tab-' + pgm.id;
    cont.className = 'tab-content' + (active ? ' active' : '');
    contentContainer.appendChild(cont);
    let loaded = false;
    const activate = (): void => { if (loaded) return; loaded = true; opts.onActivate?.(); };
    tab.onclick = (e): void => {
      activate();
      switchTab(pgm.id, e);
      // Only a REAL click is the operator's choice — programmatic activations
      // (loadAllDestinations, deep links, restore) must not clobber the memory or URL.
      if (e.isTrusted) {
        collapseAllGroups();
        patchPrefs({ ui: { destTab: pgm.id } });
        // Point the URL at the production being viewed ("as it is called"), unless an
        // editor deep link (#/…) currently owns the hash.
        if (!document.querySelector('.ed-overlay.open') && !/^#\//.test(location.hash)) {
          try { history.replaceState(null, '', '#' + destHashPath(tab)); } catch { /* ignore */ }
        }
      }
    };
    if (active) activate();
    return tab;
  },
};
