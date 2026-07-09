import { describe, it, expect } from 'vitest';
import { buildGrid, type RLane } from './captains-log-timeline-render.js';

const lane = (group: string, n: number): RLane => ({
  section: 'where', group, name: `${group} · LANE`,
  kf: Array.from({ length: n }, (_, i) => ({ ts: i, text: `e${i}`, rev: false, op: 'op', color: '#fff' })),
  plans: [],
});
const x = (ts: number): number => ts;

describe('timeline render — folded room header', () => {
  it('folded group shows an INLINE count and no separate composite lane', () => {
    const lanes = [lane('1ST FLOOR — ROOM 1', 2)];
    const { html } = buildGrid(lanes, x, 100, 0, 2, 0, new Set(['G:where|1ST FLOOR — ROOM 1']));
    expect(html).toContain('tl-group folded');
    expect(html).toContain('tl-count');
    expect(html).toContain('(2 events)');
    expect(html).not.toContain('tl-comp');          // no separate "N events (folded)" row
    expect(html).toContain('tl-kf tl-sum');          // but a SUMMARY event line stays on the header row
    expect(html).not.toContain('ROOM 1 · LANE');     // the lane label itself is hidden while folded
  });
  it('singular event count reads "(1 event)"', () => {
    const { html } = buildGrid([lane('1ST FLOOR — ROOM 2', 1)], x, 100, 0, 2, 0, new Set(['G:where|1ST FLOOR — ROOM 2']));
    expect(html).toContain('(1 event)');
  });
  it('expanded group shows its lane and no count chip', () => {
    const { html } = buildGrid([lane('2ND FLOOR — ROOM 1', 3)], x, 100, 0, 2, 0, new Set());
    expect(html).toContain('2ND FLOOR — ROOM 1 · LANE');
    expect(html).not.toContain('tl-count');
  });
});

describe('timeline render — overlap stacking', () => {
  const overlapLane: RLane = {
    section: 'who', group: 'CREW / ROLES', name: 'Ops', kf: [],
    plans: [{ s: 0, e: 10, label: 'Sports' }, { s: 5, e: 15, label: 'Weather' }],
  };
  it('two overlapping bookings stack into a taller lane with a ×2 conflict badge', () => {
    const { html } = buildGrid([overlapLane], x, 100, 0, 20, 0, new Set());
    expect(html).toContain('height:48px');   // 30 + 1*18 → a second row
    expect(html).toContain('tl-conflict');
    expect(html).toContain('×2');
    expect(html).toContain('top:25px');       // 7 + 1*18 → the stacked band sits on row 2
  });
  it('non-overlapping bookings stay a single 30px row with no badge', () => {
    const solo: RLane = { ...overlapLane, plans: [{ s: 0, e: 5, label: 'A' }, { s: 5, e: 10, label: 'B' }] };
    const { html } = buildGrid([solo], x, 100, 0, 20, 0, new Set());
    expect(html).toContain('height:30px');
    expect(html).not.toContain('tl-conflict');
  });
});
