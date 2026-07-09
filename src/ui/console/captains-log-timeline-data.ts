// src/ui/console/captains-log-timeline-data — the Timeline Viewer's MODEL. Folds the
// Captain's Log (`narratives`) and the production `SCHEDULE` into ordered swimlanes:
// WHERE (destinations, grouped by room) then WHO (operators + booked crew), each lane
// carrying its past keyframes (log events, coloured by operator) and future planned
// bands (scheduled shows). Split out of captains-log-timeline (200-line rule).
import { narratives, type Entry } from './captains-log-state.js';
import { SCHEDULE } from './schedule.js';

const OP_COLORS = ['#FF9C63', '#3FC1C9', '#A06EB4', '#6cdf4a', '#6FC8F0', '#C2B74B', '#ff5fa2', '#cc6a3a', '#9C6B9C', '#39d353'];

export interface Keyframe { ts: number; text: string; rev: boolean; op: string; color: string }
export interface Lane { section: 'where' | 'who'; group: string; name: string; kf: Keyframe[]; plans: { s: number; e: number; label: string }[] }

const allEntries = (): Entry[] => narratives.flatMap((n) => n.entries).sort((a, b) => a.ts - b.ts);
/** Operator off a narration ("… · by NAME") for the WHO lane + colour key. */
export const opOf = (e: Entry): string => (/·\s*by\s+(.+)$/.exec(e.text || '')?.[1] || e.origin || 'system').trim();

export function buildLanes(): { lanes: Lane[]; opColor: Map<string, string>; t0: number; t1: number } {
  const entries = allEntries();
  const opColor = new Map<string, string>();
  const colorFor = (op: string): string => { if (!opColor.has(op)) opColor.set(op, OP_COLORS[opColor.size % OP_COLORS.length]!); return opColor.get(op)!; };
  const lanes = new Map<string, Lane>();
  const lane = (section: 'where' | 'who', group: string, name: string): Lane => {
    const k = `${section}|${group}|${name}`;
    if (!lanes.has(k)) lanes.set(k, { section, group, name, kf: [], plans: [] });
    return lanes.get(k)!;
  };
  for (const e of entries) {
    const op = opOf(e), c = colorFor(op);
    lane('where', (e.prod || 'FACILITY').toUpperCase(), e.dest || '— actions —').kf.push({ ts: e.ts, text: e.text, rev: e.reversed, op, color: c });
    lane('who', 'OPERATORS', op).kf.push({ ts: e.ts, text: e.text, rev: e.reversed, op, color: c });
  }
  const mid = new Date(); mid.setHours(0, 0, 0, 0); const day = mid.getTime();
  let lastPlan = 0;
  for (const sl of SCHEDULE) {
    const s = day + sl.s * 3600000, en = day + sl.e * 3600000; lastPlan = Math.max(lastPlan, en);
    lane('where', 'SCHEDULED — ROOMS', sl.room).plans.push({ s, e: en, label: sl.show });
    for (const role of sl.crew) lane('who', 'BOOKED CREW', role).plans.push({ s, e: en, label: sl.show });
  }
  const now = Date.now();
  const tsAll = [...entries.map((e) => e.ts), now];
  const t0 = Math.min(...tsAll) - 900000;
  const t1 = Math.max(now + 900000, ...tsAll, lastPlan);
  const ord = { where: 0, who: 1 } as const;
  const list = [...lanes.values()].sort((a, b) => ord[a.section] - ord[b.section] || a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  return { lanes: list, opColor, t0, t1 };
}
