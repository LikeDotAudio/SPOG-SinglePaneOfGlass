// Pure (node) tests for the P0 daypart projection + P1 glyph mapping. The SVG
// render (svgFor) touches `document` and is exercised at runtime in the browser,
// not here — this project's vitest environment is `node`, no DOM.
import { describe, it, expect } from 'vitest';
import { dayparts, type Forecast, type HourPt, type DayPt } from './data.js';
import { glyphFor } from './icons.js';

// UTC date strings so dayparts()'s `dateInZone('UTC')` lines up with the fixture.
const fmt = (d: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(d);
const now = new Date();
const TODAY = fmt(now);
const TMRW = fmt(new Date(now.getTime() + 86_400_000));

const hr = (date: string, h: number, tempC: number, code: number): HourPt =>
  ({ hour: `${date}T${String(h).padStart(2, '0')}:00`, tempC, code });
const day = (date: string, code: number, hiC: number, loC: number): DayPt =>
  ({ date, code, hiC, loC, sunrise: `${date}T06:00`, sunset: `${date}T20:00` });

const FC: Forecast = {
  tz: 'UTC',
  cur: { tempC: 28, feelsC: 30, code: 0, isDay: true, humidity: 40, windKmh: 12 },
  today: [hr(TODAY, 15, 27, 1)],
  hourly: [hr(TODAY, 18, 24, 2), hr(TODAY, 21, 19, 2), hr(TMRW, 8, 15, 1), hr(TMRW, 14, 30, 0)],
  days: [
    day(TODAY, 1, 29, 18),
    day(TMRW, 0, 31, 14),
    day(fmt(new Date(now.getTime() + 2 * 86_400_000)), 3, 22, 12),
    day(fmt(new Date(now.getTime() + 3 * 86_400_000)), 61, 20, 11),
    day(fmt(new Date(now.getTime() + 4 * 86_400_000)), 71, 5, -2),
  ],
};

describe('dayparts', () => {
  const dp = dayparts(FC);

  it('emits the four panels in air order', () => {
    expect(dp.panels.map((p) => p.key)).toEqual(['now', 'evening', 'tmrwAM', 'tmrwPM']);
  });
  it('anchors "now" on the current observation', () => {
    expect(dp.panels[0]).toMatchObject({ tempC: 28, code: 0, isDay: true });
  });
  it('picks the ~21:00 hour for evening and forces night', () => {
    expect(dp.panels[1]).toMatchObject({ tempC: 19, isDay: false });
  });
  it("uses tomorrow's LOW for the wake-up panel and the 08:00 icon", () => {
    expect(dp.panels[2]).toMatchObject({ tempC: 14, code: 1, isDay: true });
  });
  it("uses tomorrow's HIGH + daily code for the peak panel", () => {
    expect(dp.panels[3]).toMatchObject({ tempC: 31, code: 0, isDay: true });
  });
  it('clusters the following three days as the outlook', () => {
    expect(dp.outlook.map((d) => d.date)).toEqual(FC.days.slice(2, 5).map((d) => d.date));
  });
});

describe('glyphFor', () => {
  it('maps representative WMO codes (with day/night) to the right glyph', () => {
    expect(glyphFor(0, true)).toBe('clear-day');
    expect(glyphFor(0, false)).toBe('clear-night');
    expect(glyphFor(2, true)).toBe('partly-day');
    expect(glyphFor(2, false)).toBe('partly-night');
    expect(glyphFor(45, true)).toBe('fog');
    expect(glyphFor(65, true)).toBe('rain-heavy');
    expect(glyphFor(66, true)).toBe('freezing-rain');
    expect(glyphFor(71, true)).toBe('flurries');
    expect(glyphFor(75, true)).toBe('snow-heavy');
    expect(glyphFor(80, true)).toBe('showers');
    expect(glyphFor(95, true)).toBe('thunder');
    expect(glyphFor(96, true)).toBe('thunder-severe');
  });
  it('falls back to partly-cloudy for unknown codes', () => {
    expect(glyphFor(1234, true)).toBe('partly-day');
    expect(glyphFor(1234, false)).toBe('partly-night');
  });
});
