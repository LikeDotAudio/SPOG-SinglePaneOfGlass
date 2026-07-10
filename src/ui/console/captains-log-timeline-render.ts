// src/ui/console/captains-log-timeline-render — builds the timeline grid HTML from the
// filtered lanes: section/group headers (foldable), per-lane keyframe dots + occupancy
// bands + planned bands, and the bottom hour ruler. When a section or group is FOLDED
// it still emits a COMPOSITE lane aggregating all its events, so nothing vanishes on
// fold. Split out of captains-log-timeline (200-line rule).
export interface RKf { ts: number; text: string; rev: boolean; op: string; color: string }
export interface RPlan { s: number; e: number; label: string; reh?: boolean; color?: string }
export interface RLane { section: 'where' | 'who' | 'how' | 'whom'; group: string; name: string; kf: RKf[]; plans: RPlan[] }
export interface REv { ts: number; text: string; op: string; rev: boolean; color: string }

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
const hm = (ts: number): string => new Date(ts).toISOString().slice(11, 16);

/** Build the grid innerHTML + the click-lookup event list. `x(ts)` maps a time to px. */
export function buildGrid(lanes: RLane[], x: (ts: number) => number, width: number, t0: number, t1: number, now: number, collapsed: Set<string>): { html: string; ev: REv[]; onAirRooms: string[] } {
  const ev: REv[] = [];
  const onAirRooms: string[] = [];
  // Aggregate every lane's keyframes per group and per section (for fold composites).
  const aggG = new Map<string, RKf[]>(), aggS = new Map<string, RKf[]>();
  for (const ln of lanes) {
    const gk = `G:${ln.section}|${ln.group}`, sk = `S:${ln.section}`;
    (aggG.get(gk) ?? aggG.set(gk, []).get(gk)!).push(...ln.kf);
    (aggS.get(sk) ?? aggS.set(sk, []).get(sk)!).push(...ln.kf);
  }
  const laneHtml = (label: string, kf: RKf[], plans: RPlan[], isRoom: boolean, cls = ''): string => {
    // Pack overlapping plans into sub-rows (greedy interval colouring): a booking clash
    // grows the lane into a SECOND line, and the label gets a ×N badge = how many people
    // / rooms that slot demands at peak. Non-overlapping plans keep one row (30px).
    const sp = [...plans].sort((a, b) => a.s - b.s);
    const rowEnd: number[] = [];
    const rowOf = sp.map((p) => { let r = rowEnd.findIndex((e) => p.s >= e); if (r === -1) { r = rowEnd.length; rowEnd.push(0); } rowEnd[r] = p.e; return r; });
    const rows = Math.max(1, rowEnd.length);
    const conflict = rows > 1 ? ` <em class="tl-conflict" title="peak concurrent bookings — needs ${rows} people/rooms">×${rows}</em>` : '';
    let rowCls = cls;
    let labelBadge = '';
    if (isRoom) {
      const active = plans.find((p) => now >= p.s && now < p.e);
      if (active) {
        if (active.reh) {
          rowCls += ' room-reh';
          labelBadge = ' <span class="r-badge reh">REHEARSAL</span>';
        } else {
          rowCls += ' room-onair';
          labelBadge = ' <span class="r-badge onair pulse">ON AIR</span>';
          onAirRooms.push(`${label.toUpperCase()} ON AIR`);
        }
      }
    }
    let h = `<div class="tl-lane ${rowCls}" style="height:${30 + (rows - 1) * 18}px"><span class="tl-lanelabel" title="${esc(label)}">${esc(label)}${conflict}${labelBadge}</span>`;
    const s = [...kf].sort((a, b) => a.ts - b.ts);
    s.forEach((k, i) => { const sx = x(k.ts), ex = i + 1 < s.length ? x(s[i + 1]!.ts) : sx; if (ex > sx) h += `<div class="tl-band" style="left:${sx}px;width:${ex - sx}px;background:${k.color};"></div>`; });
    sp.forEach((p, i) => { const pc = p.color ? `--pc:${p.color};` : ''; h += `<div class="tl-plan${p.reh ? ' reh' : ''}" style="${pc}left:${x(p.s)}px;width:${x(p.e) - x(p.s)}px;top:${7 + rowOf[i]! * 18}px;" title="${esc(p.label)} · scheduled">${esc(p.label)}</div>`; });
    for (const k of s) { const idx = ev.push({ ts: k.ts, text: k.text, op: k.op, rev: k.rev, color: k.color }) - 1; h += `<div class="tl-kf${k.rev ? ' rev' : ''}" data-ev="${idx}" style="left:${x(k.ts)}px;background:${k.color};" title="${esc(hm(k.ts) + '  ' + k.text)}"></div>`; }
    return h + '</div>';
  };
  // Aggregated activity for a FOLDED group's own header row: thin occupancy bands +
  // small event dots (still click-through to detail), so a folded topic keeps a
  // one-line summary on the timeline instead of vanishing.
  const summaryMarks = (kf: RKf[]): string => {
    let h = '';
    const s = [...kf].sort((a, b) => a.ts - b.ts);
    s.forEach((k, i) => { const sx = x(k.ts), ex = i + 1 < s.length ? x(s[i + 1]!.ts) : sx; if (ex > sx) h += `<div class="tl-band tl-sum" style="left:${sx}px;width:${ex - sx}px;background:${k.color};"></div>`; });
    for (const k of s) { const idx = ev.push({ ts: k.ts, text: k.text, op: k.op, rev: k.rev, color: k.color }) - 1; h += `<div class="tl-kf tl-sum${k.rev ? ' rev' : ''}" data-ev="${idx}" style="left:${x(k.ts)}px;background:${k.color};" title="${esc(hm(k.ts) + '  ' + k.text)}"></div>`; }
    return h;
  };

  let html = '', curSec = '', curGrp = '';
  for (const ln of lanes) {
    const secKey = `S:${ln.section}`, grpKey = `G:${ln.section}|${ln.group}`;
    if (ln.section !== curSec) {
      curSec = ln.section; curGrp = '';
      const LABELS: Record<string, string> = {
        where: 'WHERE — DESTINATIONS',
        how: 'HOW — PRODUCTION ROOMS',
        who: 'WHO — OPERATORS &amp; BOOKED CREW',
        whom: 'WHOM — PEOPLE (HOSTS, GUESTS)'
      };
      const c = collapsed.has(secKey), label = LABELS[ln.section] || ln.section.toUpperCase();
      const aggsec = aggS.get(secKey) ?? [];
      const scount = c ? ` <span class="tl-count">(${aggsec.length} event${aggsec.length === 1 ? '' : 's'})</span>` : '';
      html += `<div class="tl-sec ${ln.section}" data-fold="${secKey}"><span class="tl-hd-in">${c ? '▸' : '▾'} ${label}${scount}</span>${c ? summaryMarks(aggsec) : ''}</div>`;
    }
    if (collapsed.has(secKey)) continue;
    if (ln.group !== curGrp) {
      curGrp = ln.group;
      const c = collapsed.has(grpKey);
      // Folded rooms show their count INLINE (e.g. "▸ 1ST FLOOR — ROOM 1 (2 events)")
      // AND a one-line summary of their events on the same header row — no separate
      // composite lane, so a folded topic stays compact but never vanishes from the graph.
      const agg = aggG.get(grpKey) ?? [];
      const count = c ? ` <span class="tl-count">(${agg.length} event${agg.length === 1 ? '' : 's'})</span>` : '';
      html += `<div class="tl-group${c ? ' folded' : ''}" data-fold="${esc(grpKey)}"><span class="tl-hd-in">${c ? '▸' : '▾'} ${esc(ln.group)}${count}</span>${c ? summaryMarks(agg) : ''}</div>`;
    }
    if (collapsed.has(grpKey)) continue;
    html += laneHtml(ln.name, ln.kf, ln.plans, ln.section === 'how');
  }
  let ticks = '', ruler = '';
  for (let h = Math.floor(t0 / 3600000) * 3600000; h <= t1; h += 3600000) {
    const px = x(h); ticks += `<div class="tl-tick" style="left:${px}px;"></div>`;
    ruler += `<div class="tl-rlabel" style="left:${px}px;">${hm(h)}<b>${new Date(h).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' })}</b></div>`;
  }
  html = ticks + html + `<div class="tl-now" style="left:${x(now)}px;" title="now"></div><div class="tl-ruler" style="width:${width}px;">${ruler}</div>`;
  return { html, ev, onAirRooms };
}
