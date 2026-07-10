// src/ui/console/captains-log-timeline-data — the Timeline Viewer's MODEL. Folds the
// Captain's Log (`narratives`) and the production `SCHEDULE` into ordered swimlanes:
// WHERE (destinations, grouped by room) then WHO (operators + booked crew), each lane
// carrying its past keyframes (log events, coloured by operator) and future planned
// bands (scheduled shows). Split out of captains-log-timeline (200-line rule).
import { narratives, type Entry } from './captains-log-state.js';
import { SCHEDULE, showColor } from './schedule.js';

const OP_COLORS = ['#FF9C63', '#3FC1C9', '#A06EB4', '#6cdf4a', '#6FC8F0', '#C2B74B', '#ff5fa2', '#cc6a3a', '#9C6B9C', '#39d353'];

export interface Keyframe { ts: number; text: string; rev: boolean; op: string; color: string }
export interface Plan { s: number; e: number; label: string; showName: string; reh?: boolean; tear?: boolean; color?: string }
export interface Lane { section: 'where' | 'who' | 'how' | 'whom'; group: string; name: string; kf: Keyframe[]; plans: Plan[] }

const allEntries = (): Entry[] => narratives.flatMap((n) => n.entries).sort((a, b) => a.ts - b.ts);
/** Operator off a narration ("… · by NAME") for the WHO lane + colour key. */
export const opOf = (e: Entry): string => (/·\s*by\s+(.+)$/.exec(e.text || '')?.[1] || e.origin || 'system').trim();

export function buildLanes(): { lanes: Lane[]; opColor: Map<string, string>; t0: number; t1: number } {
  const entries = allEntries();
  const opColor = new Map<string, string>();
  const colorFor = (op: string): string => { if (!opColor.has(op)) opColor.set(op, OP_COLORS[opColor.size % OP_COLORS.length]!); return opColor.get(op)!; };
  const lanes = new Map<string, Lane>();
  // A lane is keyed separately from its display name so a scheduled crew ROLE and an
  // operator acting in that role land on the SAME lane (booked vs actual), matched on
  // the role's first segment ("Conn · TD" / "Conn · Helm" → "conn").
  const lane = (section: 'where' | 'who' | 'how' | 'whom', group: string, key: string, name: string): Lane => {
    const k = `${section}|${group}|${key}`;
    if (!lanes.has(k)) lanes.set(k, { section, group, name, kf: [], plans: [] });
    return lanes.get(k)!;
  };
  const roleKey = (s: string): string => s.split(/[·—]/)[0]!.trim().toLowerCase();
  for (const e of entries) {
    const op = opOf(e), c = colorFor(op);
    const kf = { ts: e.ts, text: e.text, rev: e.reversed, op, color: c };
    const dest = e.dest || '— actions —';
    lane('where', (e.prod || 'FACILITY').toUpperCase(), dest, dest).kf.push(kf);
    // Prefer the operator's ROLE lane (aligns with scheduled crew); fall back to the
    // operator name for legacy entries with no role recorded.
    if (e.role) {
      if (/(host|guest|panelist)/i.test(e.role)) {
        lane('whom', 'PEOPLE', roleKey(e.role), e.role).kf.push(kf);
      } else {
        lane('who', 'CREW / ROLES', roleKey(e.role), e.role).kf.push(kf);
      }
    } else {
      lane('who', 'OPERATORS', op, op).kf.push(kf);
    }
  }
  // The production SCHEDULE is a DAILY recurring timetable — project it across today
  // and the next few days so future occurrences land to the RIGHT of now (the graph
  // no longer stops at "now"). Each day is a fresh set of planned bands.
  const SCHED_DAYS = 3;
  const mid = new Date(); mid.setHours(0, 0, 0, 0); const day0 = mid.getTime();
  let firstPlan = Infinity, lastPlan = 0;
  for (let d = 0; d < SCHED_DAYS; d++) {
    const day = day0 + d * 86400000;
    for (const sl of SCHEDULE) {
      const s = day + sl.s * 3600000, en = day + sl.e * 3600000;
      const reh = s - 45 * 60000;   // every slot earns a 45-minute rehearsal band before air
      const tear = en + 30 * 60000; // 30-minute teardown band after air
      firstPlan = Math.min(firstPlan, reh); lastPlan = Math.max(lastPlan, tear);
      const pc = showColor(sl.show);   // production identity colour, shared with the schedule overlay
      const room = lane('how', 'PRODUCTION ROOMS', sl.room, sl.room);
      room.plans.push({ s: reh, e: s, label: `${sl.show} · rehearsal`, showName: sl.show, reh: true, color: pc });
      room.plans.push({ s, e: en, label: sl.show, showName: sl.show, color: pc });
      room.plans.push({ s: en, e: tear, label: `${sl.show} · teardown`, showName: sl.show, tear: true, color: pc });
      // Booked crew ride the SAME role lanes as the operators who act in them — so two
      // concurrent shows needing one role stack into two rows (= "needs another person").
      for (const cr of sl.crew) {
        const ln = lane('who', 'CREW / ROLES', roleKey(cr), cr); ln.name = cr;
        ln.plans.push({ s: reh, e: s, label: `${sl.show} · rehearsal`, showName: sl.show, reh: true, color: pc });
        ln.plans.push({ s, e: en, label: sl.show, showName: sl.show, color: pc });
        ln.plans.push({ s: en, e: tear, label: `${sl.show} · teardown`, showName: sl.show, tear: true, color: pc });
      }
    }
  }
  const now = Date.now();
  const tsAll = [...entries.map((e) => e.ts), now, ...(Number.isFinite(firstPlan) ? [firstPlan, lastPlan] : [])];
  // Span the whole picture: earliest of (first event, first scheduled show) → latest of
  // (now, last event, last scheduled show), so the day's schedule is always on-canvas.
  const t0 = Math.min(...tsAll) - 900000;
  const t1 = Math.max(now + 900000, ...tsAll);
  const ord = { where: 0, how: 1, who: 2, whom: 3 } as const;
  const list = [...lanes.values()].sort((a, b) => ord[a.section] - ord[b.section] || a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  return { lanes: list, opColor, t0, t1 };
}
