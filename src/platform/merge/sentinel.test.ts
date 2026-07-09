// Conformance tests for the sentinel merge — names track the SMRT assertions.
import { describe, it, expect } from 'vitest';
import { eff, mergeSentinel } from './sentinel.js';

describe('eff — scalar precedence', () => {
  it('A-2.2-05: incoming nil is no opinion → stored unchanged', () => {
    expect(eff(5, undefined)).toBe(5);
    expect(eff(5, null)).toBe(5);
  });
  it('a literal always wins', () => {
    expect(eff(5, 120)).toBe(120);
    expect(eff('a', 'b')).toBe('b');
  });
  it('false is the off-switch and replaces', () => {
    expect(eff(100, false)).toBe(false);
  });
  it('A-3.3-05: true over a stored sentinel resolves to true', () => {
    expect(eff(false, true)).toBe(true);
    expect(eff(undefined, true)).toBe(true);
  });
  it('true yields to a stored literal', () => {
    expect(eff(96, true)).toBe(96);
  });
});

describe('mergeSentinel — composite', () => {
  it('objects merge recursively; untouched keys survive (compositional fix)', () => {
    expect(mergeSentinel({ size: 40, mirror: false }, { mirror: true }))
      .toEqual({ size: 40, mirror: true });
  });
  it('A-2.3-11: PUT {} to a stored value changes nothing', () => {
    expect(mergeSentinel({ v: 5 }, {})).toEqual({ v: 5 });
  });
  it('arrays are atomic — replace, never element-merge', () => {
    expect(mergeSentinel([1, 2, 3], [9])).toEqual([9]);
  });
  it('a nested literal wins while its siblings are preserved', () => {
    expect(mergeSentinel({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 20 } }))
      .toEqual({ a: 1, b: { c: 20, d: 3 } });
  });
});
