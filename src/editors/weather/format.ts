// src/editors/weather/format — units, WMO-code decode, and time-zone/label
// helpers (P0 extraction). The pure formatting half of the WEATHER data layer,
// split out of data.ts (audit §4.7): unit conversion, the WMO code table,
// time-zone helpers, and feed-label seeding. No behaviour change.

import type { Unit, Forecast } from './types.js';

// ---- units ------------------------------------------------------------------
export const toDisplay = (c: number, u: Unit): number => (u === 'C' ? c : c * 9 / 5 + 32);
export const windDisplay = (kmh: number, u: Unit): string =>
  u === 'C' ? `${Math.round(kmh)} km/h` : `${Math.round(kmh * 0.621371)} mph`;
export const round = (n: number): number => Math.round(n);

// ---- WMO weather codes → label + emoji (day / optional night) ---------------
// The emoji stay for the board face; the strip renders SVG via icons.ts, which
// keys off the SAME raw `code` + day/night, so the two faces never diverge.
interface WmoEntry { t: string; d: string; n?: string; }
const WMO: Record<number, WmoEntry> = {
  0: { t: 'Clear', d: '☀️', n: '🌙' },
  1: { t: 'Mainly clear', d: '🌤️', n: '🌙' },
  2: { t: 'Partly cloudy', d: '⛅', n: '☁️' },
  3: { t: 'Overcast', d: '☁️' },
  45: { t: 'Fog', d: '🌫️' }, 48: { t: 'Rime fog', d: '🌫️' },
  51: { t: 'Light drizzle', d: '🌦️' }, 53: { t: 'Drizzle', d: '🌦️' }, 55: { t: 'Heavy drizzle', d: '🌧️' },
  56: { t: 'Freezing drizzle', d: '🌧️' }, 57: { t: 'Freezing drizzle', d: '🌧️' },
  61: { t: 'Light rain', d: '🌦️' }, 63: { t: 'Rain', d: '🌧️' }, 65: { t: 'Heavy rain', d: '🌧️' },
  66: { t: 'Freezing rain', d: '🌧️' }, 67: { t: 'Freezing rain', d: '🌧️' },
  71: { t: 'Light snow', d: '🌨️' }, 73: { t: 'Snow', d: '❄️' }, 75: { t: 'Heavy snow', d: '❄️' },
  77: { t: 'Snow grains', d: '🌨️' },
  80: { t: 'Rain showers', d: '🌦️' }, 81: { t: 'Rain showers', d: '🌧️' }, 82: { t: 'Violent showers', d: '⛈️' },
  85: { t: 'Snow showers', d: '🌨️' }, 86: { t: 'Snow showers', d: '❄️' },
  95: { t: 'Thunderstorm', d: '⛈️' }, 96: { t: 'Thunderstorm, hail', d: '⛈️' }, 99: { t: 'Thunderstorm, hail', d: '⛈️' },
};
export function decode(code: number, isDay = true): { label: string; icon: string } {
  const e = WMO[code] ?? { t: '—', d: '🌡️' };
  return { label: e.t, icon: !isDay && e.n ? e.n : e.d };
}

// ---- formatting -------------------------------------------------------------
export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/** "HH:MM" (local) out of an Open-Meteo ISO string like 2026-07-03T05:42 → 5:42 AM. */
export function clockOf(iso: string): string {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return '—';
  let h = Number(m[1]); const min = m[2]; const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${ap}`;
}
/** Weekday short label for a daily date string (parsed as local, no TZ shift). */
export function weekdayOf(dateStr: string, todayStr: string): string {
  if (dateStr.slice(0, 10) === todayStr) return 'TODAY';
  const [y, mo, da] = dateStr.slice(0, 10).split('-').map(Number);
  const dt = new Date(y!, (mo! - 1), da!);
  return WEEKDAYS[dt.getDay()] ?? '—';
}
/** The current wall-clock in an IANA time zone (falls back to browser time). */
export function timeInZone(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz || undefined,
    }).format(new Date());
  } catch { return ''; }
}
/** The current date (YYYY-MM-DD) in an IANA zone, to mark "TODAY" in the forecast. */
export function dateInZone(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined }).format(new Date());
  } catch { return ''; }
}
/** Rough day/night flag for an hourly point, from that day's sunrise/sunset. */
export function isDaytimeHour(iso: string, fc: Forecast): boolean {
  const day = fc.days.find((d) => d.date.slice(0, 10) === iso.slice(0, 10));
  if (!day) return true;
  const hm = iso.slice(11, 16);
  return hm >= day.sunrise.slice(11, 16) && hm <= day.sunset.slice(11, 16);
}
/** "3p" / "9a"-ish short hour label from an ISO hourly string. */
export function hourLabel(iso: string): string {
  const m = iso.match(/T(\d{2}):/);
  if (!m) return '';
  let h = Number(m[1]); const ap = h >= 12 ? 'p' : 'a';
  h = h % 12 || 12;
  return `${h}${ap}`;
}

// ---- deriving locations from routed feeds -----------------------------------
/** Feed labels → geocode queries, skipping the "set" group label. */
export function seedQueries(sources: ReadonlyArray<{ label: string }>): string[] {
  const out: string[] = [];
  for (const s of sources) {
    const q = s.label.trim();
    if (!q || /^weather\b.*\bset$/i.test(q) || /^weather set$/i.test(q)) continue;
    out.push(q);
  }
  return out;
}
