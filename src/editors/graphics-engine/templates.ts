// src/editors/graphics-engine/templates — the DESIGN/TEMPLATE layer (audit §1 L1).
//
// A template = a reusable scene + a schema of named, empty fields (design is
// separated from data so one template serves thousands of on-air instances).
// Each kind ships a pure `render(values, reveal)` that builds the graphic DOM;
// the preview stage drives its IN/UPDATE/NEXT/OUT lifecycle (see preview.ts).
// All text sits inside title-safe (90%) — the stage paints the SMPTE guides.

// The renderer lives in render.ts (audit §4.6 split); re-exported below so
// consumers keep importing renderGraphic / stateCount from this module.
export { renderGraphic, stateCount } from './render.js';

export type TemplateKind =
  | 'lower-third' | 'name-super' | 'up-next' | 'participant'
  | 'bug' | 'ticker' | 'fullscreen' | 'score' | 'credits' | 'weather';

export interface FieldSpec {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  /** For type:'select' — the allowed values (first is the default if none set). */
  options?: string[];
  placeholder?: string;
  default?: string;
}

export interface GfxTemplate {
  id: string;
  /** UPPERCASE name — matched (loosely) against routed source / input labels. */
  name: string;
  kind: TemplateKind;
  /** true ⇒ supports UPDATE-in-place (score/ticker) rather than a re-take. */
  updatable: boolean;
  /** true ⇒ multi-state; NEXT reveals the next row (lists). */
  stateful: boolean;
  /** true ⇒ NEXT replaces (the next card "takes over"), not accumulates. */
  replace?: boolean;
  fields: FieldSpec[];
}

export type Values = Record<string, string>;

// ---- The starter catalog (audit §8 G1) --------------------------------------

export const TEMPLATES: GfxTemplate[] = [
  {
    id: 'lower-third', name: 'LOWER THIRD', kind: 'lower-third', updatable: false, stateful: false,
    fields: [
      { key: 'name', label: 'Name', type: 'text', default: 'ANTHONY KUZUB' },
      { key: 'title', label: 'Role / Title', type: 'text', default: 'SYSTEMS ARCHITECT' },
    ],
  },
  {
    id: 'name-super', name: 'NAME SUPER', kind: 'name-super', updatable: false, stateful: false,
    fields: [
      { key: 'name', label: 'Name', type: 'text', default: 'JANE DOE' },
      { key: 'title', label: 'Title', type: 'text', default: 'CORRESPONDENT' },
      { key: 'locator', label: 'Location', type: 'text', default: 'TORONTO' },
    ],
  },
  {
    id: 'up-next', name: 'UP NEXT', kind: 'up-next', updatable: false, stateful: true,
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', default: 'COMING UP' },
      { key: 'items', label: 'Segments (one per line)', type: 'textarea',
        default: 'THE HEADLINES\nMARKET REPORT\nWEATHER\nSPORTS DESK' },
    ],
  },
  {
    id: 'participant', name: 'PARTICIPANT LIST', kind: 'participant', updatable: false, stateful: true,
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', default: 'ON THE PANEL' },
      { key: 'people', label: 'People — NAME | ROLE (one per line)', type: 'textarea',
        default: 'ANTHONY KUZUB | HOST\nJANE DOE | ANALYST\nSAM LEE | GUEST' },
    ],
  },
  {
    id: 'bug', name: 'BUG / DOG', kind: 'bug', updatable: false, stateful: false,
    fields: [
      { key: 'text', label: 'Channel / Brand', type: 'text', default: 'TWIST' },
      { key: 'sub', label: 'Sub-label', type: 'text', default: 'LIVE' },
    ],
  },
  {
    // Elements come from the crawl-item editor (view.ts) → values.text is the
    // enabled items joined by "\n"; sep/gap below control the on-air spacing.
    id: 'ticker', name: 'TICKER', kind: 'ticker', updatable: true, stateful: false,
    fields: [
      { key: 'tag', label: 'Tag', type: 'text', default: 'BREAKING' },
      { key: 'sep', label: 'Spacing character', type: 'text', default: '•' },
      { key: 'gap', label: 'Space between elements (px)', type: 'text', default: '26' },
    ],
  },
  {
    id: 'fullscreen', name: 'FULL-SCREEN TITLE', kind: 'fullscreen', updatable: false, stateful: false,
    fields: [
      { key: 'title', label: 'Title', type: 'text', default: 'THE MORNING SHOW' },
      { key: 'subtitle', label: 'Subtitle', type: 'text', default: 'WITH ANTHONY KUZUB' },
    ],
  },
  {
    id: 'score', name: 'SCORE BUG', kind: 'score', updatable: true, stateful: false,
    fields: [
      { key: 'home', label: 'Home', type: 'text', default: 'HOME' },
      { key: 'homeScore', label: 'Home score', type: 'text', default: '2' },
      { key: 'away', label: 'Away', type: 'text', default: 'AWAY' },
      { key: 'awayScore', label: 'Away score', type: 'text', default: '1' },
      { key: 'clock', label: 'Clock', type: 'text', default: "12'" },
    ],
  },
  {
    // WEATHER — a live dataset, not a text card. The city field drives an async
    // geocode + Open-Meteo forecast; the graphic is the on-air forecast strip.
    // UPDATE re-fetches in place (a manual refresh); no reveal states.
    id: 'weather', name: 'WEATHER', kind: 'weather', updatable: true, stateful: false,
    fields: [
      { key: 'city', label: 'City / Location', type: 'text', default: 'Toronto' },
      { key: 'unit', label: 'Units', type: 'select', options: ['C', 'F'], default: 'C' },
    ],
  },
  {
    // A full text of credit CARDS separated by a "----" line. NEXT transitions one
    // card over the next ("takes over"); each "ROLE | NAME" line gets a dot leader.
    id: 'credits', name: 'CREDIT ROLL', kind: 'credits', updatable: false, stateful: true, replace: true,
    fields: [
      { key: 'credits', label: 'Credits — ROLE | NAME · separate cards with a "----" line', type: 'textarea',
        default: 'PRODUCED BY | ANTHONY KUZUB\n------------------------\nDIRECTED BY | JANE DOE\n------------------------\nGRAPHICS | SAM LEE\n------------------------\nAUDIO | PAT MORGAN' },
    ],
  },
];

/** Presets = saved graphic instances (audit §6): a template + pre-filled values. */
export interface Preset { name: string; templateId: string; values: Values; }

export const PRESETS: Preset[] = [
  { name: 'MORNING SHOW OPEN', templateId: 'fullscreen',
    values: { title: 'THE MORNING SHOW', subtitle: 'WITH ANTHONY KUZUB' } },
  { name: 'EVENING NEWS OPEN', templateId: 'fullscreen',
    values: { title: 'EVENING NEWS', subtitle: 'THE STORIES THAT MATTER' } },
  { name: 'SPORTS OPEN', templateId: 'score',
    values: { home: 'LIONS', homeScore: '0', away: 'BEARS', awayScore: '0', clock: "0'" } },
  { name: 'BREAKING NEWS', templateId: 'ticker',
    values: { tag: 'BREAKING', text: 'DEVELOPING STORY  •  MORE TO FOLLOW  •  STAY WITH US' } },
  { name: 'ELECTION NIGHT', templateId: 'participant',
    values: { heading: 'THE PANEL', people: 'ANALYST ONE | POLLSTER\nANALYST TWO | STRATEGIST' } },
  { name: 'WEATHER PACKAGE', templateId: 'lower-third',
    values: { name: 'THE FORECAST', title: 'NEXT 24 HOURS' } },
  { name: 'LOWER-THIRD KIT', templateId: 'lower-third',
    values: { name: 'GUEST NAME', title: 'GUEST TITLE' } },
  { name: 'CREDITS ROLL', templateId: 'credits',
    values: { credits: 'PRODUCED BY | ANTHONY KUZUB\n------------------------\nDIRECTED BY | JANE DOE\n------------------------\nGRAPHICS | SAM LEE\n------------------------\nAUDIO | PAT MORGAN' } },
];

// ---- Matching routed labels → templates -------------------------------------

const norm = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

export function templateById(id: string): GfxTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Best-effort map an input/source label (e.g. "NAME SUPER") to a template. */
export function templateForLabel(label: string): GfxTemplate | undefined {
  const n = norm(label);
  return TEMPLATES.find((t) => norm(t.name) === n)
    ?? TEMPLATES.find((t) => n.includes(norm(t.name)) || norm(t.name).includes(n));
}

export function presetForLabel(label: string): Preset | undefined {
  const n = norm(label);
  return PRESETS.find((p) => norm(p.name) === n)
    ?? PRESETS.find((p) => n.includes(norm(p.name)) || norm(p.name).includes(n));
}

/** Seed a values bag from a template's field defaults. */
export function defaults(tpl: GfxTemplate): Values {
  const v: Values = {};
  for (const f of tpl.fields) v[f.key] = f.default ?? '';
  return v;
}
