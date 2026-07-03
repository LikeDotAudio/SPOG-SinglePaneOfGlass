// src/editors/weather/data — the WEATHER data layer (P0 extraction).
//
// Everything network- and model-shaped that used to live inline in index.ts:
// Open-Meteo geocoding + forecast fetch, the WMO code table, unit conversion,
// time-zone helpers, and feed-label seeding. Factored out so BOTH faces — the
// operator `board` and the on-air `strip` — read one data pipe (audit §7). No
// behaviour change for the board: `decode()` and the `Forecast` shape are
// unchanged; `hourly[]` + `dayparts()` are pure additions for the strip.

// ---- units ------------------------------------------------------------------
export type Unit = 'C' | 'F';
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

// ---- data model -------------------------------------------------------------
export interface GeoMatch {
  name: string; admin1?: string; country?: string; countryCode?: string;
  lat: number; lon: number; timezone?: string;
}
export interface HourPt { hour: string; tempC: number; code: number; }
export interface DayPt { date: string; code: number; hiC: number; loC: number; sunrise: string; sunset: string; }
export interface Forecast {
  tz: string;
  cur: { tempC: number; feelsC: number; code: number; isDay: boolean; humidity: number; windKmh: number };
  /** Next 10 hourly points from the current hour — the board's "Upcoming today" scroller. */
  today: HourPt[];
  /** Wider ~48h window from the current hour — feeds the strip's evening / tomorrow dayparts. */
  hourly: HourPt[];
  days: DayPt[];
}
export interface Location {
  key: string; name: string; admin1?: string; country?: string; lat: number; lon: number; timezone?: string;
}

// ---- network ----------------------------------------------------------------
export const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const FCT_URL = 'https://api.open-meteo.com/v1/forecast';

export async function geocode(query: string, signal: AbortSignal): Promise<GeoMatch[]> {
  const u = `${GEO_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  const j = await res.json() as { results?: Array<Record<string, unknown>> };
  return (j.results ?? []).map((r) => ({
    name: String(r.name ?? ''),
    admin1: r.admin1 ? String(r.admin1) : undefined,
    country: r.country ? String(r.country) : undefined,
    countryCode: r.country_code ? String(r.country_code) : undefined,
    lat: Number(r.latitude), lon: Number(r.longitude),
    timezone: r.timezone ? String(r.timezone) : undefined,
  }));
}

export async function fetchForecast(lat: number, lon: number, signal: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    timezone: 'auto', forecast_days: '6',
    temperature_unit: 'celsius', wind_speed_unit: 'kmh',
  });
  const res = await fetch(`${FCT_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  const j = await res.json() as any;
  const c = j.current ?? {};
  const h = j.hourly ?? {}; const times: string[] = h.time ?? [];
  // From the current hour onward: 10 points for the board scroller, ~48 for the strip.
  const nowHour = String(c.time ?? '').slice(0, 13) + ':00';   // e.g. 2026-07-03T14:00
  let start = times.findIndex((t) => t >= nowHour);
  if (start < 0) start = 0;
  const at = (i: number): HourPt => ({
    hour: times[i]!, tempC: Number(h.temperature_2m?.[i]), code: Number(h.weather_code?.[i]),
  });
  const window = (n: number): HourPt[] =>
    times.slice(start, start + n).map((_, k) => at(start + k));
  const today = window(10);
  const hourly = window(48);
  const d = j.daily ?? {}; const dTimes: string[] = d.time ?? [];
  const days: DayPt[] = dTimes.slice(0, 5).map((t, i) => ({
    date: t, code: Number(d.weather_code?.[i]),
    hiC: Number(d.temperature_2m_max?.[i]), loC: Number(d.temperature_2m_min?.[i]),
    sunrise: String(d.sunrise?.[i] ?? ''), sunset: String(d.sunset?.[i] ?? ''),
  }));
  return {
    tz: String(j.timezone ?? ''),
    cur: {
      tempC: Number(c.temperature_2m), feelsC: Number(c.apparent_temperature),
      code: Number(c.weather_code), isDay: Number(c.is_day) === 1,
      humidity: Number(c.relative_humidity_2m), windKmh: Number(c.wind_speed_10m),
    },
    today, hourly, days,
  };
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

// ---- dayparts (P0) — the on-air strip's five curated selections -------------
// Pure projection over an already-fetched Forecast: no new network calls. Each
// daypart is a (temp, code, day/night) triple the strip face turns into a panel.
export type DaypartKey = 'now' | 'evening' | 'tmrwAM' | 'tmrwPM';
export interface Daypart {
  key: DaypartKey;
  label: string;      // headline, e.g. "RIGHT NOW"
  sub: string;        // sub-label, e.g. "9 PM" / "WAKE-UP"
  tempC: number;
  code: number;
  isDay: boolean;
}
export interface Dayparts {
  panels: Daypart[];  // now → evening → tmrwAM → tmrwPM (in air order)
  outlook: DayPt[];   // the 3-day cluster (days[2..4])
}

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
