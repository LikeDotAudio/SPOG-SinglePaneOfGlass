import { describe, it, expect } from 'vitest';
import {
  wrap, advance, decompose, formatValue, parseEntry, nudgeFrames, calc, maxFrames,
} from './index.js';

describe('timer-core frame math', () => {
  it('wraps roll-over and roll-under at 24h', () => {
    expect(wrap(0, 30)).toBe(0);
    expect(wrap(maxFrames(30), 30)).toBe(0);          // 24h → 0
    expect(wrap(-1, 30)).toBe(maxFrames(30) - 1);     // under-run
  });

  it('advances up and down in the channel direction', () => {
    expect(advance(0, 'up', 30, 30)).toBe(30);        // +1s at 30fps
    expect(advance(30, 'down', 30, 30)).toBe(0);
    expect(advance(0, 'down', 1, 30)).toBe(maxFrames(30) - 1);   // under-run wraps
  });

  it('decomposes frames into h:m:s:f', () => {
    expect(decompose((3600 + 2 * 60 + 3) * 30 + 5, 30)).toEqual({ h: 1, m: 2, s: 3, f: 5 });
  });

  it('formats HH:MM:SS and MM:SS.FF over the same value', () => {
    const v = (90 * 60 + 30) * 30 + 12;               // 1:30:30 and 12 frames
    expect(formatValue(v, 'hms', 30)).toBe('01:30:30');
    expect(formatValue(v, 'msf', 30)).toBe('90:30.12');
  });

  it('blanks leading zeros (SHIFT-9)', () => {
    expect(formatValue(5 * 30, 'hms', 30, true)).toBe('       5');   // 00:00:05 → blanked to "5"
    expect(formatValue((3600 + 5) * 30, 'hms', 30, true)).toBe(' 1:00:05');   // one leading zero suppressed
  });

  it('parses keypad entry calculator-style (fill from right, normalise)', () => {
    expect(parseEntry('100', 'hms', 30)).toBe(60 * 30);     // "1,0,0" → 1 min
    expect(parseEntry('60', 'hms', 30)).toBe(60 * 30);      // "60"    → 1 min (60s normalised)
    expect(parseEntry('13000', 'hms', 30)).toBe((3600 + 30 * 60) * 30);  // 1:30:00
    expect(parseEntry('', 'hms', 30)).toBe(0);
    expect(parseEntry('13012', 'msf', 30)).toBe(90 * 30 + 12);   // "01:30.12" → 90s + 12fr
  });

  it('nudges by second (hms) or frame (msf)', () => {
    expect(nudgeFrames('hms', 25)).toBe(25);
    expect(nudgeFrames('msf', 25)).toBe(1);
  });

  it('calculates add/subtract with wrap', () => {
    expect(calc(60 * 30, '+', 30 * 30, 30)).toBe(90 * 30);
    expect(calc(30, '-', 60, 30)).toBe(maxFrames(30) - 30);   // under-run
  });
});
