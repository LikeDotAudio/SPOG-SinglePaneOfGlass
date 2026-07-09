// src/ui/console/footer-deeplink — URL deep-linking for destination tabs
// (`#on/<floor…>/<production>`). Split out of footer.ts (200-line rule). Maps a
// slugged path to a tab (reveal + select + scroll) and back (a tab → its hash),
// reading the footer's group handles via footerGroups().
import { footerGroups, openGroupPath, type GroupHandle } from './footer.js';

const destSlug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Unfold every LCARS twist group in a production's pane. Destinations render on
 *  demand (async fetch), so retry briefly until the groups exist. A production the
 *  operator actively opens (deep link / tab click) comes up EXPANDED, while the
 *  root / passive restore stays folded. */
export function expandProductionGroups(tabId: string): void {
  if (!tabId) return;
  let tries = 0;
  const open = (): void => {
    const pane = document.getElementById('tab-' + tabId);
    const groups = pane ? pane.querySelectorAll<HTMLDetailsElement>('details.twist-group') : null;
    if (groups && groups.length) { groups.forEach((g) => { g.open = true; }); return; }
    if (tries++ < 14) setTimeout(open, 120);
  };
  open();
}
const groupOfTab = (tab: HTMLElement): GroupHandle | null => footerGroups().find((g) => g.tabsEl.contains(tab)) ?? null;
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
  const select = (tab: HTMLElement): true => {
    const g = groupOfTab(tab);
    if (g) openGroupPath(g.path);
    tab.click();
    expandProductionGroups(tab.dataset['tabId'] ?? '');   // navigated-to production opens EXPANDED
    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    return true;
  };
  const tabs = [...document.querySelectorAll<HTMLElement>('.lcars-tab')].filter((t) => destSlug(t.innerText) === prod);
  // Prefer a tab whose group chain contains every floor segment (ordered subsequence),
  // so a production name shared across floors still disambiguates by category.
  for (const tab of tabs) {
    const chain = chainSlugs(groupOfTab(tab));
    let ci = 0;
    if (floors.every((f) => { while (ci < chain.length && chain[ci] !== f) ci++; return ci++ < chain.length; })) return select(tab);
  }
  // …but never fail silently on a floor mismatch — a stale, renamed, or singular/plural
  // link ("control-rooms" vs "control-room") should still honour the production asked
  // for. Production tab labels are unique, so falling back to the name alone is safe.
  return tabs.length ? select(tabs[0]!) : false;
}

/** Handle an `#on/…` deep link in the current URL. Returns true if it matched. */
export function handleDestDeepLink(): boolean {
  const h = location.hash || '';
  if (!/^#on\//i.test(h)) return false;
  const segs = h.replace(/^#on\//i, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (navigateToDest(segs)) return true;
  // Destination tabs render on demand (async fetch), so the target may not exist yet on
  // first paint — retry briefly, but bail if the operator has since navigated elsewhere.
  let tries = 0;
  const retry = (): void => {
    if (location.hash !== h) return;
    if (navigateToDest(segs) || tries++ >= 14) return;
    setTimeout(retry, 150);
  };
  setTimeout(retry, 150);
  return false;
}
