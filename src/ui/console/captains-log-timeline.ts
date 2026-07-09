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

const PLAN = '#5a6a8c';
const PX_PER_MIN = 5, MIN_SPAN_MIN = 60, LANE_H = 30, GROUP_H = 19, RULER_H = 26, GUTTER = 220;
const hm = (ts: number): string => new Date(ts).toISOString().slice(11, 16);
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));

const TL_CSS = `
.tl-panel{position:fixed;inset:0;z-index:2700;display:none;flex-direction:column;background:#06070c;color:#cfe6ff;font-family:Arial,Helvetica,sans-serif;}
.tl-panel.open{display:flex;}
.tl-head{display:flex;align-items:center;gap:10px;min-height:46px;padding:4px 14px;background:#C2B74B;color:#000;flex:0 0 auto;flex-wrap:wrap;}
.tl-title{font-weight:900;letter-spacing:2px;}
.tl-head .tl-spacer{flex:1;}
.tl-legend{display:flex;gap:10px;flex-wrap:wrap;font:10px 'Courier New',monospace;}
.tl-legend span{display:inline-flex;align-items:center;gap:4px;}
.tl-legend i{width:10px;height:10px;border-radius:50%;display:inline-block;}
.tl-filter{font:12px 'Courier New',monospace;border:none;border-radius:12px;padding:7px 12px;width:180px;background:#140f06;color:#ffcf6b;outline:none;}
.tl-filter::placeholder{color:#8a7430;}
.tl-groups{display:flex;gap:6px;flex-wrap:wrap;}
.tl-chip{font:800 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;border:2px solid var(--c,#3FC1C9);border-radius:12px;padding:5px 11px;cursor:pointer;background:transparent;color:var(--c,#3FC1C9);white-space:nowrap;}
.tl-chip:hover{background:color-mix(in srgb, var(--c,#3FC1C9) 22%, transparent);}
.tl-chip.on{background:var(--c,#3FC1C9);color:#06070c;}
.tl-btn{font:900 11px sans-serif;letter-spacing:1px;text-transform:uppercase;border:none;border-radius:12px;padding:7px 12px;cursor:pointer;background:#140f06;color:#ffcf6b;}
.tl-btn:hover{filter:brightness(1.15);}
.tl-x{cursor:pointer;font-weight:900;padding:0 6px;}
.tl-body{flex:1;min-height:0;overflow:auto;position:relative;background:#06070c;}
.tl-grid{position:relative;}
.tl-sec,.tl-group{cursor:pointer;user-select:none;}
.tl-sec{position:sticky;left:0;z-index:5;height:${GROUP_H}px;display:flex;align-items:center;gap:6px;padding:0 8px;font:900 10px sans-serif;letter-spacing:2px;color:#06070c;}
.tl-sec.where{background:#6FC8F0;} .tl-sec.who{background:#A06EB4;}
.tl-group{position:sticky;left:0;z-index:4;height:${GROUP_H}px;display:flex;align-items:center;gap:6px;padding:0 8px 0 18px;color:#9a8845;font:9px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;background:#0a0805;}
.tl-lane{position:relative;height:${LANE_H}px;border-bottom:1px solid #10141f;}
.tl-lane:nth-of-type(even){background:rgba(255,255,255,.015);}
.tl-lanelabel{position:sticky;left:0;z-index:4;display:inline-flex;align-items:center;height:100%;width:${GUTTER}px;box-sizing:border-box;padding:0 8px 0 30px;font:11px 'Courier New',monospace;color:#9fb6cc;background:#0a0c14;border-right:1px solid #1d2942;box-shadow:2px 0 6px rgba(0,0,0,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tl-band{position:absolute;top:11px;height:8px;border-radius:4px;opacity:.5;}
.tl-plan{position:absolute;top:7px;height:16px;border-radius:5px;border:1.5px dashed ${PLAN};background:rgba(90,106,140,.18);color:#aeb9d0;font:9px 'Courier New',monospace;line-height:16px;padding:0 6px;overflow:hidden;white-space:nowrap;box-sizing:border-box;}
.tl-kf{position:absolute;top:8px;width:12px;height:12px;margin-left:-6px;border-radius:50%;border:2px solid #06070c;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.6);z-index:3;}
.tl-kf:hover{transform:scale(1.4);z-index:6;}
.tl-kf.rev{opacity:.35;}
.tl-tick{position:absolute;top:0;bottom:${RULER_H}px;width:1px;background:#12182a;}
.tl-ruler{position:sticky;bottom:0;height:${RULER_H}px;z-index:5;background:#0a0c14;border-top:1px solid #1d2942;}
.tl-rlabel{position:absolute;bottom:0;height:100%;display:flex;flex-direction:column;justify-content:center;font:10px 'Courier New',monospace;color:#7e93b5;padding-left:3px;border-left:1px solid #16233d;}
.tl-rlabel b{color:#6FC8F0;font-size:9px;}
.tl-now{position:absolute;top:0;bottom:${RULER_H}px;width:2px;background:#ff3b3b;box-shadow:0 0 8px #ff3b3b;z-index:4;pointer-events:none;}
.tl-empty{padding:40px;text-align:center;color:#6a5a30;letter-spacing:1px;}
.tl-detail{position:fixed;z-index:2800;max-width:380px;min-width:220px;background:#0a1120;border:1px solid #2a3b5c;border-radius:10px;box-shadow:0 12px 36px rgba(0,0,0,.65);color:#e6f2ff;font:12px/1.5 'Courier New',monospace;overflow:hidden;}
.tl-detail-h{display:flex;align-items:center;gap:8px;padding:7px 11px;background:#16233d;color:#6FC8F0;font-weight:bold;letter-spacing:1px;}
.tl-detail-h .x{margin-left:auto;cursor:pointer;color:#7e93b5;}
.tl-detail-b{padding:9px 12px;}
.tl-detail-b .rev{color:#ff8a8a;font-style:italic;}
`;

let panel: HTMLElement | null = null;
const collapsed = new Set<string>();
let filter = '';
let evList: { ts: number; text: string; op: string; rev: boolean }[] = [];

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
    for (const k of kf) { const idx = evList.push({ ts: k.ts, text: k.text, op: k.op, rev: k.rev }) - 1; html += `<div class="tl-kf${k.rev ? ' rev' : ''}" data-ev="${idx}" style="left:${x(k.ts)}px;background:${k.color};" title="${esc(hm(k.ts) + '  ' + k.text)}"></div>`; }
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
  if (resetScroll) body.scrollLeft = Math.max(0, x(now) - body.clientWidth * 0.6);
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
    // Destination-group chips (top-right) — click to scope the timeline to that room;
    // each inherits the room's declared schema colour (via the DOM's --lcars-color).
    groupsEl.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-group]'); if (!chip) return;
      const g = chip.dataset['group']!;
      const on = filter === g.toLowerCase();
      filter = on ? '' : g.toLowerCase(); filterEl.value = on ? '' : g;
      const sx = body.scrollLeft; renderInto(body, false); body.scrollLeft = sx;
    });
    const head = el('div', { class: 'tl-head' }, [
      el('span', { class: 'tl-title' }, ['⧗ TIMELINE VIEWER']),
      filterEl,
      el('span', { class: 'tl-legend' }),
      el('span', { class: 'tl-spacer' }),
      groupsEl,
      nowBtn, schedBtn, el('button', { class: 'tl-btn' }, ['⟳ REFRESH']),
      el('span', { class: 'tl-x', title: 'Close' }, ['✕']),
    ]);
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
    panel.append(head, body);
    document.body.appendChild(panel);
  }
  renderInto(panel.querySelector('.tl-body') as HTMLElement);
  panel.classList.add('open');
}
