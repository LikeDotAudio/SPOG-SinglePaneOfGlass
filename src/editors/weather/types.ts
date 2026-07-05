// src/editors/weather/types — the WEATHER data-layer types (P0 extraction).
//
// The shared interfaces/types for the one data pipe both faces read — the
// operator `board` grid and the on-air `strip`. Split out of data.ts (audit §4.7).

// ---- units ------------------------------------------------------------------
export type Unit = 'C' | 'F';

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

// ---- dayparts (P0) — the on-air strip's five curated selections -------------
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
