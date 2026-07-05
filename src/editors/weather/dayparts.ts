// src/editors/weather/dayparts — the on-air strip's five curated selections
// (P0). Pure projection over an already-fetched Forecast: no new network calls.
// Each daypart is a (temp, code, day/night) triple the strip face turns into a
// panel. Split out of data.ts (audit §4.7).

import type { Forecast, HourPt, Daypart, Dayparts } from './types.js';
import { dateInZone } from './format.js';

/** Hourly point on `dateStr` whose hour is nearest `targetHour` (local). */
function pickHourNear(hourly: HourPt[], dateStr: string, targetHour: number): HourPt | undefined {
  let best: HourPt | undefined; let bestGap = Infinity;
  for (const hp of hourly) {
    if (hp.hour.slice(0, 10) !== dateStr) continue;
    const h = Number(hp.hour.slice(11, 13));
    const gap = Math.abs(h - targetHour);
    if (gap < bestGap) { bestGap = gap; best = hp; }
  }
  return best;
}

export function dayparts(fc: Forecast): Dayparts {
  const todayStr = dateInZone(fc.tz) || fc.days[0]?.date.slice(0, 10) || '';
  const tmrw = fc.days[1];
  const tmrwStr = tmrw?.date.slice(0, 10) ?? '';

  // Evening: the hour nearest 21:00 today (fallback: last point still on today).
  const eve = pickHourNear(fc.hourly, todayStr, 21)
    ?? [...fc.hourly].reverse().find((h) => h.hour.slice(0, 10) === todayStr);
  // Tomorrow morning: ~08:00 for the condition icon; temp = tomorrow's LOW (wake-up).
  const am = pickHourNear(fc.hourly, tmrwStr, 8);

  const panels: Daypart[] = [
    { key: 'now', label: 'RIGHT NOW', sub: 'CURRENT',
      tempC: fc.cur.tempC, code: fc.cur.code, isDay: fc.cur.isDay },
    { key: 'evening', label: 'THIS EVENING', sub: '9 PM',
      tempC: eve?.tempC ?? fc.cur.tempC, code: eve?.code ?? fc.cur.code, isDay: false },
    { key: 'tmrwAM', label: 'TOMORROW AM', sub: 'WAKE-UP',
      tempC: tmrw?.loC ?? am?.tempC ?? fc.cur.tempC, code: am?.code ?? tmrw?.code ?? fc.cur.code, isDay: true },
    { key: 'tmrwPM', label: 'TOMORROW PM', sub: 'PEAK',
      tempC: tmrw?.hiC ?? fc.cur.tempC, code: tmrw?.code ?? fc.cur.code, isDay: true },
  ];
  return { panels, outlook: fc.days.slice(2, 5) };
}
