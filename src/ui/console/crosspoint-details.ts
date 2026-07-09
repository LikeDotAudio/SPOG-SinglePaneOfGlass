// src/ui/console/crosspoint-details — press-and-hold a routed crosspoint to open a
// little "DETAILS" card: the source's family/lineage, its full name, and WHEN + BY
// WHOM it was routed. The when/who are stamped onto the node the moment it first
// lands as a crosspoint (stampRouted, called from matrix-crosspoints); the family +
// name come off the node itself (data-origin + its label + video/audio/control kind).
import { addStyles } from '../dom.js';
import { operator } from '../../platform/auth.js';

const CSS = `
.xp-details{position:fixed;z-index:4000;min-width:220px;max-width:320px;background:#0a1120;color:#cfe6ff;
  border:1px solid #2a3b5c;border-radius:10px;box-shadow:0 10px 34px rgba(0,0,0,.6);
  font:12px/1.5 'Courier New',monospace;padding:0;overflow:hidden;}
.xp-details-h{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#16233d;color:#6FC8F0;
  font-weight:bold;letter-spacing:2px;text-transform:uppercase;font-size:11px;}
.xp-details-h .xp-details-x{margin-left:auto;cursor:pointer;color:#7e93b5;font-weight:bold;}
.xp-details-h .xp-details-x:hover{color:#fff;}
.xp-details-body{padding:8px 12px;display:grid;grid-template-columns:auto 1fr;gap:5px 12px;}
.xp-details-body dt{color:#7e93b5;text-transform:uppercase;font-size:9px;letter-spacing:1px;align-self:center;}
.xp-details-body dd{margin:0;color:#e6f2ff;word-break:break-word;}
`;

/** Stamp WHEN + BY WHOM a node was routed — once, when it first becomes a crosspoint. */
export function stampRouted(node: HTMLElement): void {
  if (node.dataset.routedTs) return;
  node.dataset.routedTs = String(Date.now());
  const who = operator();
  if (who) node.dataset.routedBy = who;
}

const kindOf = (node: HTMLElement): string =>
  node.classList.contains('video') ? 'Video'
  : node.classList.contains('control') ? 'Control'
  : node.classList.contains('audio') ? 'Audio'
  : node.classList.contains('camera') ? 'Camera' : 'Signal';

/** The clean label of a source-panel header (first <span>, minus the fold caret). */
function headerLabel(header: Element | null): string {
  if (!header) return '';
  const span = header.querySelector('span:not(.fold-icon)');
  const raw = (span?.textContent ?? header.textContent ?? '').replace(/[▼▶►◀]/g, '').trim();
  return raw.split('\n')[0]?.trim() ?? '';
}

/** Find a routed feed's source-of-truth node back in the sources panel (by name). */
function findPanelSource(name: string): HTMLElement | null {
  const matches = [...document.querySelectorAll<HTMLElement>('.signal-node')]
    .filter((n) => !n.closest('.twist-container') && ((n.textContent ?? '').trim().split('\n')[0] === name));
  return matches.find((n) => n.dataset.origin) ?? matches[0] ?? null;
}

/** Walk a source node's ancestry into a top-down family tree
 *  (category › folder › device/person). */
function breadcrumb(src: HTMLElement): string[] {
  const crumbs: string[] = [];
  let el: HTMLElement | null = src.parentElement;
  while (el && el !== document.body) {
    if (el.classList.contains('super-pool-container')) {
      const t = headerLabel(el.querySelector(':scope > .super-pool-title'));
      if (t) crumbs.push(t);
    } else if (el.classList.contains('media-group')) {
      const t = headerLabel(el.querySelector(':scope > .media-group-header'));
      if (t) crumbs.push(t);
    } else if (el.classList.contains('input-group')) {
      const t = headerLabel(el.querySelector(':scope > .foldable-header'));
      if (t) crumbs.push(t);
    }
    el = el.parentElement;
  }
  return crumbs.reverse();
}

interface Lineage { family: string; tree: string; source: string; kind: string; }

/** Resolve the full provenance of a routed crosspoint: which family/tree it comes
 *  from and the specific source (studio wall, person/host, camera…) that feeds it. */
function lineageFor(node: HTMLElement): Lineage {
  const name = (node.textContent ?? '').trim().split('\n')[0] ?? 'source';
  const panel = findPanelSource(name);
  const ref = panel ?? node;                                   // panel node has the richest ancestry
  const isPerson = ref.className.includes('person');
  // Origin string ("Studio A — N Wall") is a reliable lineage even for network /
  // 1990s-view feeds that never carried a panel ancestor.
  const origin = ref.dataset.origin || node.dataset.origin || '';
  const crumbs = panel ? breadcrumb(panel) : origin.split(' — ').map((s) => s.trim()).filter(Boolean);
  const family = crumbs[0] || (isPerson ? 'Person' : kindOf(node));
  const source = crumbs[crumbs.length - 1] || origin.split(' — ').pop() || name;
  const tree = crumbs.length ? crumbs.join(' › ') : (origin || '—');
  return { family, tree, source, kind: kindOf(node) };
}

let openCard: HTMLElement | null = null;
function closeCard(): void { openCard?.remove(); openCard = null; }

function fmtTs(ts?: string): string {
  if (!ts) return 'unknown';
  const n = Number(ts);
  if (!Number.isFinite(n)) return 'unknown';
  return new Date(n).toLocaleString();
}

/** Build + show the DETAILS card for a routed crosspoint, anchored near (x, y). */
function showDetails(node: HTMLElement, x: number, y: number): void {
  addStyles('xp-details-styles', CSS);
  closeCard();
  const name = (node.textContent ?? '').trim().split('\n')[0] ?? 'source';
  const esc = (s: string): string => s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
  const { family, tree, source, kind } = lineageFor(node);
  const row = (label: string, val: string): string => `<dt>${label}</dt><dd>${esc(val)}</dd>`;
  const card = document.createElement('div');
  card.className = 'xp-details';
  card.innerHTML = `
    <div class="xp-details-h">Details<span class="xp-details-x" title="Close">✕</span></div>
    <dl class="xp-details-body">
      ${row('Family', family)}
      ${row('Source', source)}
      ${row('Signal', `${name} · ${kind}`)}
      ${row('Feeds from', tree)}
      ${row('Routed', fmtTs(node.dataset.routedTs))}
      ${row('By', node.dataset.routedBy || '—')}
    </dl>`;
  document.body.appendChild(card);
  // Clamp within the viewport (card measured after mount).
  const r = card.getBoundingClientRect();
  const px = Math.min(x, window.innerWidth - r.width - 8);
  const py = Math.min(y, window.innerHeight - r.height - 8);
  card.style.left = `${Math.max(8, px)}px`;
  card.style.top = `${Math.max(8, py)}px`;
  openCard = card;
  card.querySelector('.xp-details-x')?.addEventListener('click', closeCard);
}

// Dismiss the card on any outside interaction / Escape (wired once).
let dismissWired = false;
function wireDismiss(): void {
  if (dismissWired) return;
  dismissWired = true;
  document.addEventListener('pointerdown', (e) => {
    if (openCard && !openCard.contains(e.target as Node)) closeCard();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });
}

/** Wire press-and-hold on a crosspoint node to open its DETAILS card. Idempotent. */
export function wireDetailsHold(node: HTMLElement): void {
  if (node.dataset.detailsWired) return;
  node.dataset.detailsWired = '1';
  wireDismiss();
  let timer: number | null = null;
  let sx = 0, sy = 0;
  const cancel = (): void => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  node.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;  // primary / touch only
    sx = e.clientX; sy = e.clientY;
    cancel();
    timer = window.setTimeout(() => { timer = null; showDetails(node, sx + 6, sy + 6); }, 450);
  });
  // Moving (i.e. starting a drag/reorder) or releasing early cancels the hold.
  node.addEventListener('pointermove', (e) => {
    if (timer !== null && (Math.abs(e.clientX - sx) > 6 || Math.abs(e.clientY - sy) > 6)) cancel();
  });
  node.addEventListener('pointerup', cancel);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('dragstart', cancel);
}
