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
  for (const tab of document.querySelectorAll<HTMLElement>('.lcars-tab')) {
    if (destSlug(tab.innerText) !== prod) continue;
    const g = groupOfTab(tab), chain = chainSlugs(g);
    let ci = 0;
    const ok = floors.every((f) => { while (ci < chain.length && chain[ci] !== f) ci++; return ci++ < chain.length; });
    if (!ok) continue;
    if (g) openGroupPath(g.path);
    tab.click();
    expandProductionGroups(tab.dataset['tabId'] ?? '');   // navigated-to production opens EXPANDED
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
