// src/editors/clock/faces/shared — the clock-face contract + shared primitives.
//
// Every face lives in its own file under faces/ and default-exports a FaceDef. The
// clock editor collects them with import.meta.glob (see index.ts), so adding a face
// is "drop a file". Faces are pure: they draw into an S×S canvas box from a FaceCtx
// (the zone, the frame timestamp, the display resolution, and a per-window state bag
// for animation) — no DOM, no globals.

export const TAU = Math.PI * 2;
export const pad = (n: number): string => String(n).padStart(2, '0');

// ---- time-zone catalogue (absolute UTC offsets) -----------------------------
// The broadcast "world clock" set: standard UTC offsets in MINUTES east of UTC. The
// bench detects the operator's CURRENT offset (getTimezoneOffset is DST-aware) and
// matches it to this catalogue — the "◉ here" entry — after which every other clock
// is an absolute offset off this same list, so each reads a real wall-clock time.
export interface ZoneDef { off: number; code: string; codes: string; cities: string; }
export const ZONES: ZoneDef[] = [
  { off: -720, code: 'BIT', codes: 'BIT', cities: 'Baker Island, Howland Island' },
  { off: -660, code: 'SST', codes: 'NUT / SST', cities: 'American Samoa, Niue, Midway' },
  { off: -600, code: 'HST', codes: 'HST', cities: 'Hawaii, Aleutians, Cook Is.' },
  { off: -570, code: 'MART', codes: 'MART', cities: 'Marquesas Islands' },
  { off: -540, code: 'AKST', codes: 'AKST', cities: 'Alaska, Gambier Islands' },
  { off: -480, code: 'PST', codes: 'PST', cities: 'Los Angeles, Vancouver, Baja California' },
  { off: -420, code: 'MST', codes: 'MST', cities: 'Denver, Calgary, Arizona' },
  { off: -360, code: 'CST', codes: 'CST', cities: 'Chicago, Mexico City, Costa Rica' },
  { off: -300, code: 'EST', codes: 'EST', cities: 'New York, Toronto, Bogotá, Lima' },
  { off: -240, code: 'AST', codes: 'AST', cities: 'Halifax, Puerto Rico, Santiago' },
  { off: -210, code: 'NST', codes: 'NST', cities: "St. John's" },
  { off: -180, code: 'BRT', codes: 'ART / BRT', cities: 'Buenos Aires, São Paulo, Montevideo' },
  { off: -120, code: 'FNT', codes: 'FNT', cities: 'Fernando de Noronha, South Georgia' },
  { off: -60, code: 'AZOT', codes: 'AZOT / CVT', cities: 'Azores, Cape Verde' },
  { off: 0, code: 'UTC', codes: 'GMT / UTC', cities: 'London, Lisbon, Reykjavik, Accra' },
  { off: 60, code: 'CET', codes: 'CET / WAT', cities: 'Paris, Berlin, Rome, Lagos' },
  { off: 120, code: 'EET', codes: 'EET / CAT', cities: 'Athens, Cairo, Johannesburg, Kyiv' },
  { off: 180, code: 'MSK', codes: 'MSK / EAT', cities: 'Moscow, Istanbul, Nairobi, Riyadh' },
  { off: 210, code: 'IRST', codes: 'IRST', cities: 'Tehran' },
  { off: 240, code: 'GST', codes: 'GST / AZT', cities: 'Dubai, Baku, Tbilisi' },
  { off: 270, code: 'AFT', codes: 'AFT', cities: 'Kabul' },
  { off: 300, code: 'PKT', codes: 'PKT', cities: 'Islamabad, Karachi, Tashkent' },
  { off: 330, code: 'IST', codes: 'IST / SLST', cities: 'New Delhi, Mumbai, Colombo' },
  { off: 345, code: 'NPT', codes: 'NPT', cities: 'Kathmandu' },
  { off: 360, code: 'BST', codes: 'BST', cities: 'Dhaka, Almaty' },
  { off: 390, code: 'MMT', codes: 'MMT / CCT', cities: 'Yangon, Cocos Islands' },
  { off: 420, code: 'ICT', codes: 'ICT / WIB', cities: 'Bangkok, Hanoi, Jakarta' },
  { off: 480, code: 'CST', codes: 'CST / AWST', cities: 'Beijing, Singapore, Perth, Manila' },
  { off: 525, code: 'ACWST', codes: 'ACWST', cities: 'Eucla' },
  { off: 540, code: 'JST', codes: 'JST / KST', cities: 'Tokyo, Seoul, Yakutsk' },
  { off: 570, code: 'ACST', codes: 'ACST', cities: 'Adelaide, Darwin' },
  { off: 600, code: 'AEST', codes: 'AEST', cities: 'Sydney, Melbourne, Brisbane' },
  { off: 630, code: 'LHST', codes: 'LHST', cities: 'Lord Howe Island' },
  { off: 660, code: 'SBT', codes: 'SBT / VUT', cities: 'Honiara, Port Vila, Nouméa' },
  { off: 720, code: 'NZST', codes: 'NZST / FJT', cities: 'Auckland, Suva, Kamchatka' },
  { off: 765, code: 'CHAST', codes: 'CHAST', cities: 'Chatham Islands' },
  { off: 780, code: 'TOT', codes: 'TOT / PHOT', cities: "Nuku'alofa, Apia" },
  { off: 840, code: 'LINT', codes: 'LINT', cities: 'Kiritimati' },
];

// ---- zone model (a display label + an absolute UTC offset in minutes) -------
export interface Zone { label: string; offsetMin: number; }
export const zoneOf = (z: ZoneDef): Zone => ({ label: z.code, offsetMin: z.off });

/** "UTC+05:30" / "UTC−05:00" / "UTC±00:00" for a minutes offset. */
export function offsetLabel(off: number): string {
  const a = Math.abs(off), sign = off === 0 ? '±' : off < 0 ? '−' : '+';
  return `UTC${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}
/** The browser's current offset — minutes east of UTC, DST-aware. */
export const localOffsetMin = (): number => -new Date().getTimezoneOffset();
/** Catalogue index nearest an absolute offset. */
export function zoneIdxForOffset(off: number): number {
  let best = 0, bestD = Infinity;
  ZONES.forEach((z, i) => { const d = Math.abs(z.off - off); if (d < bestD) { bestD = d; best = i; } });
  return best;
}
/** Catalogue index the browser is in RIGHT NOW (exact offset, else nearest). */
export const detectZoneIdx = (): number => zoneIdxForOffset(localOffsetMin());

/** Map a routed-feed / saved label to a catalogue zone: a code (EST), a city, an
    explicit offset ("+9", "UTC-5", "+5:30"), UTC/GMT, else the detected local zone. */
export function parseZone(label: string): Zone {
  const clean = label.trim(), up = clean.toUpperCase();
  let def = ZONES.find((z) => z.code === up || z.codes.toUpperCase().split(/\s*\/\s*/).includes(up));
  if (!def && up.length >= 3) def = ZONES.find((z) => z.cities.toUpperCase().includes(up));
  if (!def) {
    const m = clean.match(/([+\-−])\s*(\d{1,2})(?::?(\d{2}))?/);
    if (m) def = ZONES[zoneIdxForOffset((m[1] === '+' ? 1 : -1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)))];
    else if (/utc|gmt|zulu/i.test(clean)) def = ZONES.find((z) => z.off === 0);
  }
  return zoneOf(def ?? ZONES[detectZoneIdx()]!);   // detectZoneIdx() is always a valid index
}

/** The zones to seed the bench with: every routed feed, or the detected local + UTC. */
export function deriveZones(sources: ReadonlyArray<{ label: string }>): Zone[] {
  const zones = sources.map((s) => parseZone(s.label));
  return zones.length ? zones : [zoneOf(ZONES[detectZoneIdx()]!), zoneOf(ZONES[zoneIdxForOffset(0)]!)];
}

/** {h,m,s,ms} for a zone right now — UTC shifted by the zone's absolute offset. */
export function zoneTime(z: Zone): { h: number; m: number; s: number; ms: number } {
  const d = new Date(Date.now() + z.offsetMin * 60_000);
  return { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), ms: d.getUTCMilliseconds() };
}

/** {day 0-6, date 1-31, mon 1-12} for a zone (the digital watch faces use it). */
export function zoneCal(z: Zone): { day: number; date: number; mon: number } {
  const d = new Date(Date.now() + z.offsetMin * 60_000);
  return { day: d.getUTCDay(), date: d.getUTCDate(), mon: d.getUTCMonth() + 1 };
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
