// src/ui/console/captains-log-timeline — the TIMELINE VIEWER window (audit:
// docs/Audits/TimeLine Investigation.md). ONE stringline / swimlane graph of the
// Captain's Log + production schedule: WHERE (destinations, grouped by room) on TOP,
// WHO (operators + booked crew) on the BOTTOM, sharing one TIME axis along the bottom.
// Rows are a FOLDABLE TREE (section → group → lane). Past log events are solid
// keyframes coloured by operator (CLICK one for its full log detail); future SCHEDULE
// slots are dashed "planned" bands reached by scrolling right; a red NOW playhead
// divides past from future. Rendered ON DEMAND — recomputes a snapshot from
// `narratives` + `SCHEDULE` each open (and on ⟳), never on a live subscription.
import { el, addStyles } from '../dom.js';
import { buildLanes, type Lane } from './captains-log-timeline-data.js';
import { TL_CSS } from './captains-log-timeline-css.js';
import { wireNav } from './captains-log-timeline-nav.js';
import { buildGrid } from './captains-log-timeline-render.js';
import { showSchedule } from './schedule.js';

const PLAN = '#5a6a8c';
const MIN_SPAN_MIN = 60, GUTTER = 220;
let pxPerMin = 5;          // horizontal zoom (px per minute) — driven by wheel + nav handles
let curWidth = 0;          // last rendered content width (for the nav zoom maths)
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));

let panel: HTMLElement | null = null;
const collapsed = new Set<string>();          // explicitly-collapsed SECTIONS (default expanded)
const expandedGroups = new Set<string>();     // explicitly-expanded room GROUPS (rooms fold by default)
const selectedGroups = new Set<string>();   // multi-select room chips (stack / union)
let filter = '';
let showUnused = false;
let evList: { ts: number; text: string; op: string; rev: boolean; color: string }[] = [];

/** Sync the minimap's viewport rectangle to the main scroll position. */
function updateNavView(): void {
  const body = panel?.querySelector<HTMLElement>('.tl-body');
  const view = panel?.querySelector<HTMLElement>('.tl-nav-view');
  if (!body || !view) return;
  const sw = body.scrollWidth || 1;
  view.style.left = `${(body.scrollLeft / sw) * 100}%`;
  view.style.width = `${(body.clientWidth / sw) * 100}%`;
}

function renderInto(body: HTMLElement, resetScroll = true): void {
  const { lanes: all, opColor, t0, t1 } = buildLanes();
  // Filter in two stages: (1) the selected room chips (a UNION — a lane is kept if it
  // belongs to ANY selected group, matched by group / lane name / event text); then
  // (2) the free-text box. Empty groups/sections don't emit a header, since the render
  // loop walks the filtered set.
  const sel = [...selectedGroups];
  const inSel = (ln: Lane): boolean => sel.length === 0 || sel.some((g) => ln.group.toLowerCase().includes(g) || ln.name.toLowerCase().includes(g) || ln.kf.some((k) => k.text.toLowerCase().includes(g)));
  const hit = (s: string): boolean => !filter || s.toLowerCase().includes(filter);
  const now = Date.now();
  let lanes = all.filter(inSel).map((ln) => {
    const laneHit = hit(ln.name) || hit(ln.group);
    return { ...ln, kf: laneHit ? ln.kf : ln.kf.filter((k) => hit(k.text) || hit(k.op)), plans: laneHit ? ln.plans : ln.plans.filter((p) => hit(p.label)), keep: laneHit };
  }).filter((ln) => ln.keep || ln.kf.length || ln.plans.length) as (Lane & { keep: boolean })[];
  if (showUnused) lanes = lanes.filter((ln) => !ln.plans.some((p) => p.s <= now && p.e > now));
  if (!lanes.length) { body.replaceChildren(el('div', { class: 'tl-empty' }, [(filter || sel.length || showUnused) ? '— no timeline items match the current filter —' : '— no log events or schedule yet — routing decisions and booked shows plot here —'])); return; }
  const spanMin = Math.max(MIN_SPAN_MIN, (t1 - t0) / 60000);
  const width = Math.ceil(GUTTER + spanMin * pxPerMin) + 20;
  curWidth = width;
  const x = (ts: number): number => GUTTER + ((ts - t0) / 60000) * pxPerMin;
  // WHERE room-groups FOLD BY DEFAULT (compact overview). A room is shown expanded only
  // when the operator explicitly opened it OR it's currently selected via a room chip —
  // so selecting one (or many) chips unfolds those rooms and exposes their lanes.
  const groupSelected = (group: string): boolean => sel.some((g) => group.toLowerCase().includes(g));
  const foldSet = new Set<string>(collapsed);   // section collapses carry through
  for (const l of all) {
    if ((l.section === 'where' || l.section === 'how') && !expandedGroups.has(`G:${l.section}|${l.group}`) && !groupSelected(l.group)) foldSet.add(`G:${l.section}|${l.group}`);
  }
  // Grid HTML (foldable headers with inline counts, dots, bands, ruler) — see
  // captains-log-timeline-render. `ev` is the click-lookup list.
  const { html, ev, onAirRooms } = buildGrid(lanes, x, width, t0, t1, now, foldSet);
  evList = ev;
  const grid = el('div', { class: 'tl-grid', style: `width:${width}px;` });
  grid.innerHTML = html;
  body.replaceChildren(grid);

  const banner = panel?.querySelector('.tl-onair-banner'); if (banner) { banner.innerHTML = onAirRooms.map((r) => `<span>${esc(r)}</span>`).join(''); banner.className = `tl-onair-banner${onAirRooms.length ? ' active' : ''}`; }

  const legend = panel?.querySelector('.tl-legend');
  if (legend) legend.innerHTML = [...opColor].map(([op, c]) => `<span><i style="background:${c}"></i>${esc(op)}</span>`).join('') + `<span><i style="background:${PLAN};border-radius:2px"></i>scheduled</span>`;
  // Destination-group chips — the real room groups (WHERE, minus the schedule group),
  // each coloured by its declared schema colour from the DOM twist's --lcars-color.
  const chips = panel?.querySelector('.tl-groups');
  if (chips) {
    const twists = [...document.querySelectorAll<HTMLElement>('.twist-container')];
    const groups = [...new Set(all.filter((l) => l.section === 'where' || l.section === 'how').map((l) => l.group))];
    chips.innerHTML = `<button class="tl-chip all${!selectedGroups.size && !filter ? ' on' : ''}" data-group="">◎ SHOW ALL</button>` + groups.map((g) => {
      const tw = twists.find((t) => (t.dataset['prodName'] || '').toUpperCase() === g);
      const c = (tw && getComputedStyle(tw).getPropertyValue('--lcars-color').trim()) || '#3FC1C9';
      return `<button class="tl-chip${selectedGroups.has(g.toLowerCase()) ? ' on' : ''}" data-group="${esc(g)}" style="--c:${c}">${esc(g)}</button>`;
    }).join('');
  }
  // Minimap: the whole span compressed, with event marks, a NOW tick, and a viewport box.
  const nav = panel?.querySelector('.tl-nav');
  if (nav) {
    const pct = (ts: number): string => ((x(ts) / width) * 100).toFixed(2);
    nav.innerHTML = evList.map((e) => `<div class="tl-nav-mark" style="left:${pct(e.ts)}%;background:${e.color};"></div>`).join('')
      + `<div class="tl-nav-now" style="left:${pct(now)}%;"></div><div class="tl-nav-view"><span class="tl-nav-h" data-h="l"></span><span class="tl-nav-h" data-h="r"></span></div><div class="tl-nav-cap">NAV · drag · handles/wheel = zoom</div>`;
  }
  // Open anchored on NOW near the LEFT (just past the label gutter + a sliver of
  // past), so most of the view looks forward into the rest of the day. Deferred to
  // the next frame: on first open renderInto runs while the panel is still
  // display:none, and scrollLeft is ignored on a hidden element.
  if (resetScroll) { const target = Math.max(0, x(now) - GUTTER - 60); requestAnimationFrame(() => { body.scrollLeft = target; updateNavView(); }); }
  updateNavView();
}

function showDetail(idx: number, cx: number, cy: number): void {
  panel?.querySelector('.tl-detail')?.remove();
  const ev = evList[idx]; if (!ev || !panel) return;
  const card = el('div', { class: 'tl-detail' }, []);
  card.innerHTML = `<div class="tl-detail-h">LOG EVENT<span class="x">✕</span></div>
    <div class="tl-detail-b"><div>${esc(new Date(ev.ts).toLocaleString())} · by ${esc(ev.op)}${ev.rev ? ' <span class="rev">[reversed]</span>' : ''}</div><div style="margin-top:6px;color:#cfe6ff">${esc(ev.text)}</div></div>`;
  panel.appendChild(card);
  const r = card.getBoundingClientRect();
  card.style.left = `${Math.min(cx + 8, window.innerWidth - r.width - 8)}px`;
  card.style.top = `${Math.min(cy + 8, window.innerHeight - r.height - 8)}px`;
  card.querySelector('.x')!.addEventListener('click', () => card.remove());
}

/** Open the Timeline Viewer (lazy build; recompute snapshot on every open / ⟳). */
export function openTimeline(): void {
  addStyles('cl-timeline-styles', TL_CSS);
  if (!panel) {
    panel = el('div', { class: 'tl-panel' });
    const body = el('div', { class: 'tl-body' });
    const nowBtn = el('button', { class: 'tl-btn' }, ['⤒ NOW']);
    const schedBtn = el('button', { class: 'tl-btn' }, ['⇥ SCHEDULE']);
    const unusedBtn = el('button', { class: 'tl-btn' + (showUnused ? ' on' : '') }, ['UNUSED']);
    unusedBtn.addEventListener('click', () => { showUnused = !showUnused; unusedBtn.className = 'tl-btn' + (showUnused ? ' on' : ''); const sx = body.scrollLeft; renderInto(body, false); body.scrollLeft = sx; });
    const filterEl = el('input', { class: 'tl-filter', type: 'search', placeholder: '⌕ filter lanes / events…' }) as HTMLInputElement;
    filterEl.addEventListener('input', () => { filter = filterEl.value.trim().toLowerCase(); const sx = body.scrollLeft; renderInto(body, false); body.scrollLeft = sx; });
    const groupsEl = el('span', { class: 'tl-groups' });
    // Destination-group chips — click to scope the timeline to a room (or SHOW ALL to
    // clear). Each inherits the room's declared schema colour (via DOM --lcars-color).
    groupsEl.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-group]'); if (!chip) return;
      const g = chip.dataset['group'] ?? '';
      // SHOW ALL resets to the compact overview: clear selection AND any drilled-down
      // groups/sections, so everything tucks back up to folded headers.
      if (!g) { selectedGroups.clear(); expandedGroups.clear(); collapsed.clear(); filter = ''; filterEl.value = ''; }
      else { const k = g.toLowerCase(); selectedGroups.has(k) ? selectedGroups.delete(k) : selectedGroups.add(k); }  // stack / un-stack
      const sx = body.scrollLeft; renderInto(body, false); body.scrollLeft = sx;
    });
    const head = el('div', { class: 'tl-head' }, [
      el('span', { class: 'tl-title' }, ['⧗ TIMELINE VIEWER']),
      filterEl,
      el('span', { class: 'tl-legend' }),
      el('span', { class: 'tl-onair-banner' }),
      unusedBtn, nowBtn, schedBtn, el('button', { class: 'tl-btn' }, ['⟳ REFRESH']),
      el('span', { class: 'tl-x', title: 'Close' }, ['✕']),
    ]);
    const chipbar = el('div', { class: 'tl-chipbar' }, [groupsEl]);
    const closeTimeline = (): void => { panel!.classList.remove('open'); if (isTimelineHash()) history.replaceState(null, '', location.pathname + location.search); };
    // Clicking the yellow header bar closes the viewer (like the other editors) —
    // except when the click lands on an actual control (buttons, filter, chips, legend).
    head.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button, input, select, .tl-filter, .tl-legend, .tl-groups')) return; closeTimeline(); });
    head.querySelector('.tl-x')!.addEventListener('click', closeTimeline);
    (head.querySelectorAll('.tl-btn')[3] as HTMLElement).addEventListener('click', () => renderInto(body));
    nowBtn.addEventListener('click', () => { const n = body.querySelector<HTMLElement>('.tl-now'); if (n) body.scrollLeft = Math.max(0, n.offsetLeft - body.clientWidth * 0.5); });
    schedBtn.addEventListener('click', () => {
      const nowX = body.querySelector<HTMLElement>('.tl-now')?.offsetLeft ?? 0;
      const future = [...body.querySelectorAll<HTMLElement>('.tl-plan')].map((p) => p.offsetLeft).filter((l) => l > nowX).sort((a, b) => a - b);
      body.scrollLeft = Math.max(0, (future[0] ?? nowX) - GUTTER - 40);
    });
    // Delegated clicks: fold a section/group, or open a keyframe's log detail.
    body.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const fold = t.closest<HTMLElement>('[data-fold]');
      // Groups fold by default → their toggle tracks EXPANDED (opt-in); sections track COLLAPSED.
      if (fold) { const k = fold.dataset['fold']!; const set = k.startsWith('G:') ? expandedGroups : collapsed; set.has(k) ? set.delete(k) : set.add(k); const sx = body.scrollLeft; renderInto(body, false); body.scrollLeft = sx; return; }
      const kf = t.closest<HTMLElement>('.tl-kf[data-ev]');
      const plan = t.closest<HTMLElement>('.tl-plan[data-show]');
      if (kf) showDetail(Number(kf.dataset['ev']), (e as MouseEvent).clientX, (e as MouseEvent).clientY);
      else if (plan) showSchedule(plan.dataset['show']);
      else panel!.querySelector('.tl-detail')?.remove();
    });
    // Middle-button (wheel-click) drag = grab-scrub the timeline on both axes.
    let mid: { x: number; y: number; sl: number; st: number } | null = null;
    body.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });   // suppress autoscroll
    body.addEventListener('pointerdown', (e) => { if (e.button !== 1) return; mid = { x: e.clientX, y: e.clientY, sl: body.scrollLeft, st: body.scrollTop }; body.setPointerCapture(e.pointerId); body.style.cursor = 'grabbing'; });
    body.addEventListener('pointermove', (e) => { if (!mid) return; body.scrollLeft = mid.sl - (e.clientX - mid.x); body.scrollTop = mid.st - (e.clientY - mid.y); });
    const endMid = (): void => { mid = null; body.style.cursor = ''; };
    body.addEventListener('pointerup', endMid); body.addEventListener('pointercancel', endMid);
    // Navigation minimap — drag to scroll, drag the box handles or mouse-wheel to zoom.
    const nav = el('div', { class: 'tl-nav', title: 'Navigation — drag to scroll · handles or wheel to zoom' });
    wireNav(body, nav, {
      width: () => curWidth,
      px: () => pxPerMin,
      setPx: (v) => { pxPerMin = v; },
      rerender: () => renderInto(body, false),
    });
    body.addEventListener('scroll', () => updateNavView());
    panel.append(head, chipbar, body, nav);
    document.body.appendChild(panel);
  }
  renderInto(panel.querySelector('.tl-body') as HTMLElement);
  panel.classList.add('open');
  try { history.replaceState(null, '', '#timeline'); } catch { /* ignore */ }   // shareable URL
}

/** True when the URL addresses the timeline (`#timeline`). */
const isTimelineHash = (): boolean => /^#\/?timeline\b/i.test(location.hash);
/** Open the timeline if the current URL asks for it (boot + hashchange deep-link). */
export function openTimelineIfHashed(): void { if (isTimelineHash()) openTimeline(); }
if (typeof window !== 'undefined') window.addEventListener('hashchange', openTimelineIfHashed);
