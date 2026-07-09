// src/ui/console/captains-log-timeline-render — builds the timeline grid HTML from the
// filtered lanes: section/group headers (foldable), per-lane keyframe dots + occupancy
// bands + planned bands, and the bottom hour ruler. When a section or group is FOLDED
// it still emits a COMPOSITE lane aggregating all its events, so nothing vanishes on
// fold. Split out of captains-log-timeline (200-line rule).
export interface RKf { ts: number; text: string; rev: boolean; op: string; color: string }
export interface RLane { section: 'where' | 'who'; group: string; name: string; kf: RKf[]; plans: { s: number; e: number; label: string }[] }
export interface REv { ts: number; text: string; op: string; rev: boolean; color: string }

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
const hm = (ts: number): string => new Date(ts).toISOString().slice(11, 16);

/** Build the grid innerHTML + the click-lookup event list. `x(ts)` maps a time to px. */
export function buildGrid(lanes: RLane[], x: (ts: number) => number, width: number, t0: number, t1: number, now: number, collapsed: Set<string>): { html: string; ev: REv[] } {
  const ev: REv[] = [];
  // Aggregate every lane's keyframes per group and per section (for fold composites).
  const aggG = new Map<string, RKf[]>(), aggS = new Map<string, RKf[]>();
  for (const ln of lanes) {
    const gk = `G:${ln.section}|${ln.group}`, sk = `S:${ln.section}`;
    (aggG.get(gk) ?? aggG.set(gk, []).get(gk)!).push(...ln.kf);
    (aggS.get(sk) ?? aggS.set(sk, []).get(sk)!).push(...ln.kf);
  }
  const laneHtml = (label: string, kf: RKf[], plans: RLane['plans'], cls = ''): string => {
    let h = `<div class="tl-lane ${cls}"><span class="tl-lanelabel" title="${esc(label)}">${esc(label)}</span>`;
    const s = [...kf].sort((a, b) => a.ts - b.ts);
    s.forEach((k, i) => { const sx = x(k.ts), ex = i + 1 < s.length ? x(s[i + 1]!.ts) : sx; if (ex > sx) h += `<div class="tl-band" style="left:${sx}px;width:${ex - sx}px;background:${k.color};"></div>`; });
    for (const p of plans) h += `<div class="tl-plan" style="left:${x(p.s)}px;width:${x(p.e) - x(p.s)}px;" title="${esc(p.label)} · scheduled">${esc(p.label)}</div>`;
    for (const k of s) { const idx = ev.push({ ts: k.ts, text: k.text, op: k.op, rev: k.rev, color: k.color }) - 1; h += `<div class="tl-kf${k.rev ? ' rev' : ''}" data-ev="${idx}" style="left:${x(k.ts)}px;background:${k.color};" title="${esc(hm(k.ts) + '  ' + k.text)}"></div>`; }
    return h + '</div>';
  };
  const comp = (n: number): string => `⋯ ${n} event${n === 1 ? '' : 's'} (folded)`;

  let html = '', curSec = '', curGrp = '';
  for (const ln of lanes) {
    const secKey = `S:${ln.section}`, grpKey = `G:${ln.section}|${ln.group}`;
    if (ln.section !== curSec) {
      curSec = ln.section; curGrp = '';
      const c = collapsed.has(secKey), label = ln.section === 'where' ? 'WHERE — DESTINATIONS &amp; ROOMS' : 'WHO — OPERATORS &amp; BOOKED CREW';
      html += `<div class="tl-sec ${ln.section}" data-fold="${secKey}">${c ? '▸' : '▾'} ${label}</div>`;
      if (c) html += laneHtml(comp((aggS.get(secKey) ?? []).length), aggS.get(secKey) ?? [], [], 'tl-comp');
    }
    if (collapsed.has(secKey)) continue;
    if (ln.group !== curGrp) {
      curGrp = ln.group;
      const c = collapsed.has(grpKey);
      html += `<div class="tl-group" data-fold="${esc(grpKey)}">${c ? '▸' : '▾'} ${esc(ln.group)}</div>`;
      if (c) html += laneHtml(comp((aggG.get(grpKey) ?? []).length), aggG.get(grpKey) ?? [], [], 'tl-comp');
    }
    if (collapsed.has(grpKey)) continue;
    html += laneHtml(ln.name, ln.kf, ln.plans);
  }
  let ticks = '', ruler = '';
  for (let h = Math.floor(t0 / 3600000) * 3600000; h <= t1; h += 3600000) {
    const px = x(h); ticks += `<div class="tl-tick" style="left:${px}px;"></div>`;
    ruler += `<div class="tl-rlabel" style="left:${px}px;">${hm(h)}<b>${new Date(h).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' })}</b></div>`;
  }
  html = ticks + html + `<div class="tl-now" style="left:${x(now)}px;" title="now"></div><div class="tl-ruler" style="width:${width}px;">${ruler}</div>`;
  return { html, ev };
}
