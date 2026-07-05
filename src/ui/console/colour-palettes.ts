// src/ui/console/colour-palettes — palette data tables + type guards.
// The single source of truth for the COLOUR & VISION engine (colour-engine.ts)
// and editor (colour-editor.ts): the six-token palettes, the accessibility axis
// value sets + guards, and the editor's preset/axis tables. Pure data — no DOM.

export type Vision = 'low' | 'normal' | 'high';
export type Chroma = 'full' | 'grey' | 'mono';
/** FACE — the chrome aesthetic: LCARS bars, or the macOS-style icon tiles
 *  (Routes/Sources/.icon + Routes/Destinations/.icons). A presentation axis just
 *  like vision/chroma: `html[data-face]` + CSS overlay; the DOM never changes. */
export type Face = 'lcars' | 'icons';
export interface ColourScheme { vision: Vision; chroma: Chroma; cvd: string; face: Face; monoHue?: number; }

// ── PALETTES ────────────────────────────────────────────────────────────────
// Six semantic tokens per palette. `video/audio/program` are the three signal
// categories (the accessibility-critical trio — keep them distinct in hue AND
// luminance so they survive grey/mono); `alarm/ok/onair` are the state colours.
interface PaletteTokens { video: string; audio: string; program: string; alarm: string; ok: string; onair: string; }
export interface Palette { id: string; name: string; cvdSafe: boolean; blurb: string; t: PaletteTokens; }

export const PALETTES: readonly Palette[] = [
  { id: 'classic', name: 'Classic LCARS', cvdSafe: false,
    blurb: 'The signature Twist palette — violet / orange / blue.',
    t: { video: '#CC99CC', audio: '#FF9C63', program: '#646DCC', alarm: '#ff3b3b', ok: '#39d98a', onair: '#ffaa00' } },
  { id: 'okabe', name: 'Okabe-Ito', cvdSafe: true,
    blurb: 'The scientific gold standard — safe across all three colour-vision deficiencies.',
    t: { video: '#CC79A7', audio: '#E69F00', program: '#56B4E9', alarm: '#D55E00', ok: '#009E73', onair: '#F0E442' } },
  { id: 'ibm', name: 'IBM Carbon', cvdSafe: true,
    blurb: 'IBM Design colour-blind-safe set — bright and modern.',
    t: { video: '#785EF0', audio: '#FE6100', program: '#648FFF', alarm: '#DC267F', ok: '#24A148', onair: '#FFB000' } },
  { id: 'tol', name: 'Paul Tol', cvdSafe: true,
    blurb: 'Paul Tol vibrant scheme — the muted, print-friendly CVD-safe alternative.',
    t: { video: '#AA3377', audio: '#EE7733', program: '#4477AA', alarm: '#CC3311', ok: '#228833', onair: '#CCBB44' } },
  { id: 'synthwave', name: 'Synthwave', cvdSafe: false,
    blurb: 'Neon night palette — electric purple, hot-pink and cyan on the dark grid.',
    t: { video: '#B14EFF', audio: '#FF2E97', program: '#00E5FF', alarm: '#FF3355', ok: '#05FFA1', onair: '#FFD319' } },
  { id: 'ember', name: 'Ember', cvdSafe: false,
    blurb: 'Warm, blue-free ramp for low-light / night rooms — easy on dark-adapted eyes.',
    t: { video: '#FF6B6B', audio: '#FFA94D', program: '#FFD43B', alarm: '#E03131', ok: '#82C91E', onair: '#FF922B' } },
  { id: 'tidal', name: 'Tidal', cvdSafe: false,
    blurb: 'Cool and calm — cyan, indigo and mint, with a warm alarm for salience.',
    t: { video: '#4DD0E1', audio: '#5C7CFA', program: '#63E6BE', alarm: '#FF6B6B', ok: '#38D9A9', onair: '#74C0FC' } },
];

export const paletteById = (id: string): Palette => PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;

export const DEFAULT: ColourScheme = { vision: 'normal', chroma: 'full', cvd: 'classic', face: 'lcars', monoHue: -8 };

const VISIONS: readonly Vision[] = ['low', 'normal', 'high'];
const CHROMAS: readonly Chroma[] = ['full', 'grey', 'mono'];
const FACES: readonly Face[] = ['lcars', 'icons'];

export const isVision = (v: string | null): v is Vision => (VISIONS as readonly string[]).includes(v ?? '');
export const isChroma = (v: string | null): v is Chroma => (CHROMAS as readonly string[]).includes(v ?? '');
export const isFace = (v: string | null): v is Face => (FACES as readonly string[]).includes(v ?? '');
export const isCvd = (v: string | null): boolean => PALETTES.some((p) => p.id === v);

// ── EDITOR TABLES ────────────────────────────────────────────────────────────
/** The named presets — each a labelled point in the vision×chroma×palette cube. Glyphs
 *  are monochrome (never colour-dependent), so they read in every mode including mono.
 *  Presets are points in the COLOUR cube only — FACE is orthogonal and preserved,
 *  so switching palette presets never flips the chrome between LCARS and icons. */
interface Preset { id: string; glyph: string; label: string; hint: string; scheme: Omit<ColourScheme, 'face'>; }
export const PRESETS: readonly Preset[] = [
  { id: 'default', glyph: '⬡', label: 'Default', hint: 'Classic LCARS, full colour',
    scheme: { vision: 'normal', chroma: 'full', cvd: 'classic' } },
  { id: 'lowvis', glyph: '☾', label: 'Low Visibility', hint: 'Dim, calm — dark-adapted / on-air rooms',
    scheme: { vision: 'low', chroma: 'full', cvd: 'okabe' } },
  { id: 'highvis', glyph: '☀', label: 'High Visibility', hint: 'Max contrast, glow off, CVD-safe palette',
    scheme: { vision: 'high', chroma: 'full', cvd: 'okabe' } },
  { id: 'grey', glyph: '◑', label: 'Grey', hint: 'Hue removed — shape + luminance carry meaning',
    scheme: { vision: 'high', chroma: 'grey', cvd: 'classic', monoHue: -8 } },
  { id: 'mono', glyph: '▮', label: 'Monochrome', hint: 'Single-hue amber phosphor — the universal fallback',
    scheme: { vision: 'normal', chroma: 'mono', cvd: 'classic', monoHue: -8 } },
];

// The two pure-CSS axes render as segmented controls; the palette gets its own gallery.
export const AXES: ReadonlyArray<{
  label: string; hint: string; get(s: ColourScheme): string;
  opts: ReadonlyArray<{ v: string; label: string }>;
  set(s: ColourScheme, v: string): ColourScheme;
}> = [
  { label: 'Vision', hint: 'contrast / luminance', get: (s) => s.vision,
    opts: [{ v: 'low', label: 'Low' }, { v: 'normal', label: 'Normal' }, { v: 'high', label: 'High' }],
    set: (s, v) => ({ ...s, vision: v as Vision }) },
  { label: 'Chroma', hint: 'hue → grey → mono', get: (s) => s.chroma,
    opts: [{ v: 'full', label: 'Full' }, { v: 'grey', label: 'Grey' }, { v: 'mono', label: 'Mono' }],
    set: (s, v) => ({ ...s, chroma: v as Chroma }) },
  { label: 'Face', hint: 'chrome aesthetic — LCARS bars or icon tiles', get: (s) => s.face,
    opts: [{ v: 'lcars', label: 'LCARS' }, { v: 'icons', label: 'Icons' }],
    set: (s, v) => ({ ...s, face: v as Face }) },
];
