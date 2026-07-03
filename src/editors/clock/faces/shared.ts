// src/editors/clock/faces/shared — the clock-face contract + shared primitives.
//
// Every face lives in its own file under faces/ and default-exports a FaceDef. The
// clock editor collects them with import.meta.glob (see index.ts), so adding a face
// is "drop a file". Faces are pure: they draw into an S×S canvas box from a FaceCtx
// (the zone, the frame timestamp, the display resolution, and a per-window state bag
// for animation) — no DOM, no globals.

export const TAU = Math.PI * 2;
export const pad = (n: number): string => String(n).padStart(2, '0');

// ---- zone model -------------------------------------------------------------
export interface Zone { label: string; utc: boolean; offsetH: number; }

/** Parse a routed feed label into a time zone. "UTC" → utc; "LOCAL ±NH" → offset. */
export function parseZone(label: string): Zone {
  const clean = label.trim();
  if (/utc|gmt|zulu/i.test(clean)) return { label: 'UTC', utc: true, offsetH: 0 };
  const m = clean.match(/([+\-−])\s*(\d+)/);
  const offsetH = m ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : 0;
  return { label: clean || 'LOCAL', utc: false, offsetH };
}

/** The zones to seed the bench with: every routed feed, or a LOCAL + UTC default pair. */
export function deriveZones(sources: ReadonlyArray<{ label: string }>): Zone[] {
  const zones = sources.map((s) => parseZone(s.label));
  return zones.length ? zones : [parseZone('LOCAL'), parseZone('UTC')];
}

/** {h,m,s,ms} for a zone at the current instant (UTC read-out or local ± offset). */
export function zoneTime(z: Zone): { h: number; m: number; s: number; ms: number } {
  const now = new Date();
  if (z.utc) return { h: now.getUTCHours(), m: now.getUTCMinutes(), s: now.getUTCSeconds(), ms: now.getUTCMilliseconds() };
  const d = new Date(now.getTime() + z.offsetH * 3600_000);
  return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), ms: d.getMilliseconds() };
}

/** {day 0-6, date 1-31, mon 1-12} for a zone (the digital watch faces use it). */
export function zoneCal(z: Zone): { day: number; date: number; mon: number } {
  const now = new Date();
  if (z.utc) return { day: now.getUTCDay(), date: now.getUTCDate(), mon: now.getUTCMonth() + 1 };
  const d = new Date(now.getTime() + z.offsetH * 3600_000);
  return { day: d.getDay(), date: d.getDate(), mon: d.getMonth() + 1 };
}
export const WEEKDAY3 = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// ---- display resolution -----------------------------------------------------
// How much of the time a numeric face shows. FF = frames within the second, at FPS
// (a display cadence, not a genlocked timecode).
export type Resolution = 'hm' | 'hms' | 'hmsf';
export const RESOLUTIONS: Array<{ id: Resolution; label: string }> = [
  { id: 'hm', label: 'HH:MM' },
  { id: 'hms', label: 'HH:MM:SS' },
  { id: 'hmsf', label: 'HH:MM:SS:FF' },
];
export const FPS = 30;

/** Frame index (00..FPS-1) for a millisecond reading. */
export const frames = (ms: number): number => Math.floor((ms / 1000) * FPS);

/** Format a zone time to the requested resolution. */
export function formatTime(t: { h: number; m: number; s: number; ms: number }, res: Resolution): string {
  const hm = `${pad(t.h)}:${pad(t.m)}`;
  if (res === 'hm') return hm;
  const hms = `${hm}:${pad(t.s)}`;
  if (res === 'hms') return hms;
  return `${hms}:${pad(frames(t.ms))}`;
}

// ---- drawing primitives -----------------------------------------------------
export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---- face contract ----------------------------------------------------------
/** Per-window mutable bag a face may stash animation state on (e.g. flip cards). */
export type FaceState = Record<string, unknown>;

/** Everything a face needs to draw one frame. */
export interface FaceCtx {
  z: Zone;
  now: number;            // performance.now() timestamp for animation
  res: Resolution;        // display resolution (numeric faces honour it)
  state: FaceState;       // per-window scratch (persists across frames)
}

export type FaceDraw = (g: CanvasRenderingContext2D, S: number, c: FaceCtx) => void;

/** A self-contained clock face's manifest — its single default export. */
export interface FaceDef {
  id: string;
  label: string;                 // full label for the "Face (all)" toolbar
  short: string;                 // compact label for the per-window picker
  order?: number;                // UI ordering (lower first; default 100)
  fit: [number, number];         // content aspect [w,h] of the S×S box (window fill)
  lightBg?: boolean;             // face needs a light canvas panel (e.g. the cat)
  draw: FaceDraw;
}
