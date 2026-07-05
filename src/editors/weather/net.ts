// src/editors/weather/net — Open-Meteo geocoding + forecast fetch (P0 extraction).
//
// The network half of the WEATHER data layer, split out of data.ts (audit §4.7):
// Open-Meteo geocoding + forecast fetch. `decode()` and the `Forecast` shape are
// unchanged; no behaviour change.

import type { GeoMatch, Forecast, HourPt, DayPt } from './types.js';

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
