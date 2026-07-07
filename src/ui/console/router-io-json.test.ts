// Unit tests for the hierarchical JSON format (pure — node env). Round-trips the flat
// sheets → nested JSON → flat sheets and checks the nesting shape.
import { describe, it, expect } from 'vitest';
import { toJson, fromJson, type RouterDoc } from './router-io-json.js';
import type { Sheet } from './router-io-sheet.js';

const src: Sheet = {
  name: 'Sources', headers: ['Origin', 'Feed', 'Type', 'Color', 'Status'],
  rows: [
    ['STUDIO A — North Wall — VIDEO SB 101', 'V101-1', 'video', '#FF9C00', 'OK'],
    ['STUDIO A — North Wall — VIDEO SB 101', 'V101-2', 'video', '#FF9C00', 'OK'],
    ['STUDIO A — North Wall — AUDIO SB 101', 'CH 1', 'audio', '', 'OK'],
  ],
};
const dst: Sheet = {
  name: 'Destinations', headers: ['Category', 'Room', 'Twist', 'Accepts', 'Row', 'Routed Origin', 'Routed Feed', 'Type'],
  rows: [
    ['Control Rooms', 'PRIMARY — PROD 3', 'CAM 1', 'camera', 'cameras', 'STUDIO A — North Wall — VIDEO SB 101', 'V101-1', 'video'],
    ['Control Rooms', 'PRIMARY — PROD 3', 'CAM 2', 'camera', 'cameras', '', '', ''],
  ],
};

describe('router-io JSON', () => {
  it('nests sources Studio → Wall → Box(→feeds)', () => {
    const doc = JSON.parse(toJson(src, dst, '20260706.1900')) as RouterDoc;
    expect(doc.schema).toBe('spog.router/1');
    expect(doc.sources[0]!.name).toBe('STUDIO A');
    const wall = doc.sources[0]!.children![0]!;
    expect(wall.name).toBe('North Wall');
    expect(wall.children!.map((b) => b.name)).toEqual(['VIDEO SB 101', 'AUDIO SB 101']);
    expect(wall.children![0]!.feeds).toEqual(['V101-1', 'V101-2']);
  });

  it('nests destinations Facility → Room → twist(→routed crosspoints)', () => {
    const doc = JSON.parse(toJson(src, dst, 's')) as RouterDoc;
    const room = doc.destinations[0]!.rooms[0]!;
    expect(doc.destinations[0]!.name).toBe('Control Rooms');
    expect(room.name).toBe('PRIMARY — PROD 3');
    expect(room.twists[0]!.routed).toEqual([{ origin: 'STUDIO A — North Wall — VIDEO SB 101', feed: 'V101-1', type: 'video' }]);
    expect(room.twists[1]!.routed).toEqual([]);   // empty twist preserved
  });

  it('round-trips back to the same flat rows', () => {
    const back = fromJson(toJson(src, dst, 's'));
    expect(back.sources.rows).toEqual(src.rows);
    expect(back.destinations.rows).toEqual(dst.rows);
  });
});
