// Unit tests for the 1990s-grid 3-layer planner (pure — node env).
import { describe, it, expect } from 'vitest';
import { buildAxisPlan, DEPTH, type PlanLeaf } from './router-view-tree.js';

const leaf = (a: string, b: string, c: string, f: string): PlanLeaf<string> =>
  ({ segs: [a, b, c], leaf: f, id: [`${a} — ${b} — ${c}`, f], ref: `${a}/${b}/${c}/${f}` });

const ROWS: Array<PlanLeaf<string>> = [
  leaf('A', 'N', 'Box1', 'f1'), leaf('A', 'N', 'Box1', 'f2'),
  leaf('A', 'E', 'Box2', 'f3'), leaf('B', 'N', 'Box3', 'f4'),
];

describe('buildAxisPlan — expanded', () => {
  const plan = buildAxisPlan(ROWS, new Set(), 'r:');
  it('keeps every leaf as an item', () => {
    expect(plan.depth).toBe(DEPTH);
    expect(plan.items.map((i) => i.leaf)).toEqual(['f1', 'f2', 'f3', 'f4']);
    expect(plan.items.every((i) => !i.agg)).toBe(true);
  });
  it('spans headers by shared prefix at each level', () => {
    expect(plan.headers[0]).toEqual([
      { level: 0, label: 'A', key: 'r:A', start: 0, span: 3, collapsed: false },
      { level: 0, label: 'B', key: 'r:B', start: 3, span: 1, collapsed: false },
    ]);
    expect(plan.headers[1]!.map((c) => [c.label, c.start, c.span])).toEqual([['N', 0, 2], ['E', 2, 1], ['N', 3, 1]]);
    expect(plan.headers[2]!.map((c) => [c.label, c.start, c.span])).toEqual([['Box1', 0, 2], ['Box2', 2, 1], ['Box3', 3, 1]]);
  });
  it('trailing feed cell per leaf (cross 1)', () => {
    expect(plan.items[0]!.trailing).toEqual({ summary: false, label: 'f1', cross: 1 });
  });
});

describe('buildAxisPlan — collapse at the top level', () => {
  const plan = buildAxisPlan(ROWS, new Set(['r:A']), 'r:');
  it('folds all of A into one aggregate item, leaves B expanded', () => {
    expect(plan.items.length).toBe(2);
    expect(plan.items[0]!.agg).toBe(true);
    expect(plan.items[0]!.ids.length).toBe(3);          // f1,f2,f3
    expect(plan.items[0]!.trailing).toEqual({ summary: true, label: '▸ A · 3', cross: DEPTH });  // fills wall+box+feed
    expect(plan.items[1]!.leaf).toBe('f4');
  });
  it('emits a collapsed level-0 cell + no deeper cells for the aggregate', () => {
    expect(plan.headers[0]).toEqual([
      { level: 0, label: 'A', key: 'r:A', start: 0, span: 1, collapsed: true },
      { level: 0, label: 'B', key: 'r:B', start: 1, span: 1, collapsed: false },
    ]);
    expect(plan.headers[1]!.map((c) => c.start)).toEqual([1]);   // only B has a wall cell
    expect(plan.headers[2]!.map((c) => c.start)).toEqual([1]);
  });
});

describe('buildAxisPlan — shallow + deep normalization', () => {
  it('pads a 1-segment path and merges a 4-segment tail', () => {
    const p = buildAxisPlan([
      { segs: ['GRAPHICS'], leaf: 'BUG', id: ['GRAPHICS', 'BUG'], ref: 'x' },
      { segs: ['W', 'X', 'Y', 'Z'], leaf: 'q', id: ['W — X — Y — Z', 'q'], ref: 'y' },
    ], new Set(), 'r:');
    expect(p.headers[0]!.map((c) => c.label)).toEqual(['GRAPHICS', 'W']);
    expect(p.headers[1]!.map((c) => c.label)).toEqual(['', 'X']);          // graphics wall blank
    expect(p.headers[2]!.map((c) => c.label)).toEqual(['', 'Y — Z']);      // deep tail merged into box
  });
});
