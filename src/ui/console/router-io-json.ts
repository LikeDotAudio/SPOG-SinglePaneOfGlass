// src/ui/console/router-io-json — the hierarchical JSON format for the 1990s
// import/export (Phase 4, replaces the SpreadsheetML XML). Parents are nesting objects:
// sources nest Studio → Wall → Box(→feeds); destinations nest Facility → Room →
// twist(→routed crosspoints). It is a thin FORMAT layer over the flat Sheet model
// (router-io-sheet): export nests the sheet rows into trees, import flattens back — so
// device authoring + route replay reuse the exact same pipeline. Pure + unit-testable.
import { columnMap, type Sheet } from './router-io-sheet.js';

const SRC_HEADERS = ['Origin', 'Feed', 'Type', 'Color', 'Status'];
const DST_HEADERS = ['Category', 'Room', 'Twist', 'Accepts', 'Row', 'Routed Origin', 'Routed Feed', 'Type'];

interface SrcNode { name: string; children?: SrcNode[]; type?: string; color?: string; status?: string; feeds?: string[] }
interface Routed { origin: string; feed: string; type?: string }
interface Twist { name: string; accepts?: string; row?: string; routed?: Routed[] }
interface Room { name: string; twists: Twist[] }
interface Facility { name: string; rooms: Room[] }
export interface RouterDoc { schema: string; stamp?: string; sources: SrcNode[]; destinations: Facility[] }

// ---- SHEETS → JSON (export) -------------------------------------------------
function nestSources(src: Sheet): SrcNode[] {
  const col = columnMap(src), roots: SrcNode[] = [];
  const boxes = new Map<string, SrcNode>();
  for (const r of src.rows) {
    const origin = col(r, 'Origin').trim(); if (!origin) continue;
    let box = boxes.get(origin);
    if (!box) {
      const segs = origin.split(' — ').map((s) => s.trim());
      let level = roots;
      for (const seg of segs.slice(0, -1)) {
        let n = level.find((x) => x.name === seg && x.children);
        if (!n) { n = { name: seg, children: [] }; level.push(n); }
        level = n.children!;
      }
      box = { name: segs[segs.length - 1]!, type: col(r, 'Type').trim(), color: col(r, 'Color').trim() || undefined, status: col(r, 'Status').trim() || undefined, feeds: [] };
      level.push(box); boxes.set(origin, box);
    }
    box.feeds!.push(col(r, 'Feed').trim());
  }
  return roots;
}
function nestDest(dst: Sheet): Facility[] {
  const col = columnMap(dst), facs = new Map<string, Facility>();
  const rooms = new Map<string, Room>(), twists = new Map<string, Twist>();
  for (const r of dst.rows) {
    const cat = col(r, 'Category').trim() || '—', room = col(r, 'Room').trim(), twist = col(r, 'Twist').trim();
    if (!room || !twist) continue;
    let fac = facs.get(cat); if (!fac) { fac = { name: cat, rooms: [] }; facs.set(cat, fac); }
    const rk = cat + '␟' + room;
    let rm = rooms.get(rk); if (!rm) { rm = { name: room, twists: [] }; rooms.set(rk, rm); fac.rooms.push(rm); }
    const tk = rk + '␟' + twist;
    let tw = twists.get(tk);
    if (!tw) { tw = { name: twist, accepts: col(r, 'Accepts').trim() || undefined, row: col(r, 'Row').trim() || undefined, routed: [] }; twists.set(tk, tw); rm.twists.push(tw); }
    const feed = col(r, 'Routed Feed').trim();
    if (feed) tw.routed!.push({ origin: col(r, 'Routed Origin').trim(), feed, type: col(r, 'Type').trim() || undefined });
  }
  return [...facs.values()];
}

/** Serialize the two sheets as one hierarchical JSON document. */
export function toJson(src: Sheet, dst: Sheet, stamp: string): string {
  const doc: RouterDoc = { schema: 'spog.router/1', stamp, sources: nestSources(src), destinations: nestDest(dst) };
  return JSON.stringify(doc, null, 2);
}

// ---- JSON → SHEETS (import) -------------------------------------------------
function flattenSources(nodes: SrcNode[], path: string[], rows: string[][]): void {
  for (const n of nodes) {
    if (n.feeds) { const origin = [...path, n.name].join(' — '); for (const f of n.feeds) rows.push([origin, f, n.type ?? '', n.color ?? '', n.status ?? '']); }
    if (n.children) flattenSources(n.children, [...path, n.name], rows);
  }
}
/** Parse a JSON document back into the flat { sources, destinations } sheets. */
export function fromJson(text: string): { sources: Sheet; destinations: Sheet } {
  const doc = JSON.parse(text) as RouterDoc;
  const srcRows: string[][] = [];
  flattenSources(doc.sources ?? [], [], srcRows);
  const dstRows: string[][] = [];
  for (const fac of doc.destinations ?? []) for (const rm of fac.rooms ?? []) for (const tw of rm.twists ?? []) {
    const base = [fac.name, rm.name, tw.name, tw.accepts ?? '', tw.row ?? ''];
    if (!tw.routed?.length) dstRows.push([...base, '', '', '']);
    else for (const rt of tw.routed) dstRows.push([...base, rt.origin ?? '', rt.feed, rt.type ?? '']);
  }
  return { sources: { name: 'Sources', headers: SRC_HEADERS, rows: srcRows }, destinations: { name: 'Destinations', headers: DST_HEADERS, rows: dstRows } };
}
