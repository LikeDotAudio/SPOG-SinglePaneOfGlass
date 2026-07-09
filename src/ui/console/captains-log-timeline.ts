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

const PLAN = '#5a6a8c';
const PX_PER_MIN = 5, MIN_SPAN_MIN = 60, GUTTER = 220;
const hm = (ts: number): string => new Date(ts).toISOString().slice(11, 16);
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));

let panel: HTMLElement | null = null;
const collapsed = new Set<string>();
let filter = '';
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
  // Filter: keep only lanes/events that match the query (lane name/group, or any
  // keyframe text/operator, or a scheduled show label). Empty groups/sections then
  // simply don't emit a header, since the render loop walks the filtered set.
  const hit = (s: string): boolean => !filter || s.toLowerCase().includes(filter);
  const lanes = all.map((ln) => {
    const laneHit = hit(ln.name) || hit(ln.group);
    return { ...ln, kf: laneHit ? ln.kf : ln.kf.filter((k) => hit(k.text) || hit(k.op)), plans: laneHit ? ln.plans : ln.plans.filter((p) => hit(p.label)), keep: laneHit };
  }).filter((ln) => ln.keep || ln.kf.length || ln.plans.length) as (Lane & { keep: boolean })[];
  if (!lanes.length) { body.replaceChildren(el('div', { class: 'tl-empty' }, [filter ? `— no timeline items match “${filter}” —` : '— no log events or schedule yet — routing decisions and booked shows plot here —'])); return; }
  const spanMin = Math.max(MIN_SPAN_MIN, (t1 - t0) / 60000);
  const width = Math.ceil(GUTTER + spanMin * PX_PER_MIN) + 20;
  const now = Date.now();
  const x = (ts: number): number => GUTTER + ((ts - t0) / 60000) * PX_PER_MIN;
  evList = [];

  let html = '', curSec = '', curGrp = '';
  for (const ln of lanes) {
    const secKey = `S:${ln.section}`, grpKey = `G:${ln.section}|${ln.group}`;
    if (ln.section !== curSec) {
      curSec = ln.section; curGrp = '';
      const label = ln.section === 'where' ? 'WHERE — DESTINATIONS &amp; ROOMS' : 'WHO — OPERATORS &amp; BOOKED CREW';
      html += `<div class="tl-sec ${ln.section}" data-fold="${secKey}">${collapsed.has(secKey) ? '▸' : '▾'} ${label}</div>`;
    }
    if (collapsed.has(secKey)) continue;
    if (ln.group !== curGrp) {
      curGrp = ln.group;
      html += `<div class="tl-group" data-fold="${esc(grpKey)}">${collapsed.has(grpKey) ? '▸' : '▾'} ${esc(ln.group)}</div>`;
    }
    if (collapsed.has(grpKey)) continue;
    html += `<div class="tl-lane"><span class="tl-lanelabel" title="${esc(ln.name)}">${esc(ln.name)}</span>`;
    const kf = [...ln.kf].sort((a, b) => a.ts - b.ts);
    kf.forEach((k, i) => {
      const sx = x(k.ts), ex = i + 1 < kf.length ? x(kf[i + 1]!.ts) : sx;
      if (ex > sx) html += `<div class="tl-band" style="left:${sx}px;width:${ex - sx}px;background:${k.color};"></div>`;
    });
    for (const p of ln.plans) html += `<div class="tl-plan" style="left:${x(p.s)}px;width:${x(p.e) - x(p.s)}px;" title="${esc(p.label)} · scheduled">${esc(p.label)}</div>`;
    for (const k of kf) { const idx = evList.push({ ts: k.ts, text: k.text, op: k.op, rev: k.rev, color: k.color }) - 1; html += `<div class="tl-kf${k.rev ? ' rev' : ''}" data-ev="${idx}" style="left:${x(k.ts)}px;background:${k.color};" title="${esc(hm(k.ts) + '  ' + k.text)}"></div>`; }
    html += `</div>`;
  }
  let ticks = '', ruler = '';
  for (let h = Math.floor(t0 / 3600000) * 3600000; h <= t1; h += 3600000) {
    const px = x(h); ticks += `<div class="tl-tick" style="left:${px}px;"></div>`;
    ruler += `<div class="tl-rlabel" style="left:${px}px;">${hm(h)}<b>${new Date(h).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' })}</b></div>`;
  }
  html = ticks + html + `<div class="tl-now" style="left:${x(now)}px;" title="now"></div><div class="tl-ruler" style="width:${width}px;">${ruler}</div>`;
  const grid = el('div', { class: 'tl-grid', style: `width:${width}px;` });
  grid.innerHTML = html;
  body.replaceChildren(grid);

  const legend = panel?.querySelector('.tl-legend');
  if (legend) legend.innerHTML = [...opColor].map(([op, c]) => `<span><i style="background:${c}"></i>${esc(op)}</span>`).join('') + `<span><i style="background:${PLAN};border-radius:2px"></i>scheduled</span>`;
  // Destination-group chips — the real room groups (WHERE, minus the schedule group),
  // each coloured by its declared schema colour from the DOM twist's --lcars-color.
  const chips = panel?.querySelector('.tl-groups');
  if (chips) {
    const twists = [...document.querySelectorAll<HTMLElement>('.twist-container')];
    const groups = [...new Set(all.filter((l) => l.section === 'where' && l.group !== 'SCHEDULED — ROOMS').map((l) => l.group))];
    chips.innerHTML = groups.map((g) => {
      const tw = twists.find((t) => (t.dataset['prodName'] || '').toUpperCase() === g);
      const c = (tw && getComputedStyle(tw).getPropertyValue('--lcars-color').trim()) || '#3FC1C9';
      return `<button class="tl-chip${filter === g.toLowerCase() ? ' on' : ''}" data-group="${esc(g)}" style="--c:${c}">${esc(g)}</button>`;
    }).join('');
  }
  // Minimap: the whole span compressed, with event marks, a NOW tick, and a viewport box.
  const nav = panel?.querySelector('.tl-nav');
  if (nav) {
    const pct = (ts: number): string => ((x(ts) / width) * 100).toFixed(2);
    nav.innerHTML = evList.map((e) => `<div class="tl-nav-mark" style="left:${pct(e.ts)}%;background:${e.color};"></div>`).join('')
      + `<div class="tl-nav-now" style="left:${pct(now)}%;"></div><div class="tl-nav-view"></div><div class="tl-nav-cap">NAV · drag</div>`;
  }
  if (resetScroll) body.scrollLeft = Math.max(0, x(now) - body.clientWidth * 0.6);
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
    const filterEl = el('input', { class: 'tl-filter', type: 'search', placeholder: '⌕ filter lanes / events…' }) as HTMLInputElement;
    filterEl.addEventListener('input', () => { filter = filterEl.value.trim().toLowerCase(); const sx = body.scrollLeft; renderInto(body, false); body.scrollLeft = sx; });
    const groupsEl = el('span', { class: 'tl-groups' });
    // Destination-group chips — click to scope the timeline to a room (or SHOW ALL to
    // clear). Each inherits the room's declared schema colour (via DOM --lcars-color).
    groupsEl.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-group]'); if (!chip) return;
      const g = chip.dataset['group'] ?? '';
      const on = !g || filter === g.toLowerCase();          // empty = SHOW ALL; re-click a room = clear
      filter = on ? '' : g.toLowerCase(); filterEl.value = on ? '' : g;
      const sx = body.scrollLeft; renderInto(body, false); body.scrollLeft = sx;
    });
    const head = el('div', { class: 'tl-head' }, [
      el('span', { class: 'tl-title' }, ['⧗ TIMELINE VIEWER']),
      filterEl,
      el('span', { class: 'tl-legend' }),
      el('span', { class: 'tl-spacer' }),
      nowBtn, schedBtn, el('button', { class: 'tl-btn' }, ['⟳ REFRESH']),
      el('span', { class: 'tl-x', title: 'Close' }, ['✕']),
    ]);
    const chipbar = el('div', { class: 'tl-chipbar' }, [groupsEl]);
    head.querySelector('.tl-x')!.addEventListener('click', () => panel!.classList.remove('open'));
    (head.querySelectorAll('.tl-btn')[2] as HTMLElement).addEventListener('click', () => renderInto(body));
    nowBtn.addEventListener('click', () => { const n = body.querySelector<HTMLElement>('.tl-now'); if (n) body.scrollLeft = Math.max(0, n.offsetLeft - body.clientWidth * 0.5); });
    schedBtn.addEventListener('click', () => { const p = body.querySelector<HTMLElement>('.tl-plan'); if (p) body.scrollLeft = Math.max(0, p.offsetLeft - GUTTER - 40); });
    // Delegated clicks: fold a section/group, or open a keyframe's log detail.
    body.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const fold = t.closest<HTMLElement>('[data-fold]');
      if (fold) { const k = fold.dataset['fold']!; collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k); const sx = body.scrollLeft; renderInto(body, false); body.scrollLeft = sx; return; }
      const kf = t.closest<HTMLElement>('.tl-kf[data-ev]');
      if (kf) showDetail(Number(kf.dataset['ev']), (e as MouseEvent).clientX, (e as MouseEvent).clientY);
      else panel!.querySelector('.tl-detail')?.remove();
    });
    // Navigation minimap — drag/click to scroll the main view; tracks the scroll.
    const nav = el('div', { class: 'tl-nav', title: 'Navigation — click or drag to scroll' });
    const navTo = (clientX: number): void => { const r = nav.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width)); body.scrollLeft = f * body.scrollWidth - body.clientWidth / 2; };
    let navDrag = false;
    nav.addEventListener('pointerdown', (e) => { navDrag = true; nav.setPointerCapture(e.pointerId); navTo(e.clientX); });
    nav.addEventListener('pointermove', (e) => { if (navDrag) navTo(e.clientX); });
    nav.addEventListener('pointerup', () => { navDrag = false; });
    body.addEventListener('scroll', () => updateNavView());
    panel.append(head, chipbar, body, nav);
    document.body.appendChild(panel);
  }
  renderInto(panel.querySelector('.tl-body') as HTMLElement);
  panel.classList.add('open');
}
