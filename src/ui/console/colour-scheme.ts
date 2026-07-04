// src/ui/console/colour-scheme — the COLOUR & VISION engine + editor.
// Strategy: docs/Colours and shapes.md. Sibling to chirality.ts: a persistent
// toolbar button (a painter's palette, docked beside the handedness toggle) opens a
// full LCARS editor that drives three orthogonal accessibility axes, each a `data-*`
// attribute on <html>:
//
//   data-vision  low | normal | high    — contrast / luminance (dark-adapted ↔ hi-contrast)
//   data-chroma  full | grey | mono      — hue → desaturated → single-hue amber phosphor
//   data-cvd     <palette id>            — the active colour palette (see PALETTES)
//
// Vision + chroma are pure CSS (a composed root filter, see lcars.css). The PALETTE
// is TS-driven: PALETTES is the single source of truth, and paint() writes each
// palette's six semantic tokens (+ the three legacy category vars) INLINE onto <html>,
// so adding a palette is a one-line edit here — no CSS. Persisted per device and
// painted BEFORE first render (applyStored…) so the console lands in the chosen mode
// with no flash — exactly like chirality.

import { addStyles, el } from '../dom.js';
import { openOverlay } from '../../platform/overlay.js';

export type Vision = 'low' | 'normal' | 'high';
export type Chroma = 'full' | 'grey' | 'mono';
export interface ColourScheme { vision: Vision; chroma: Chroma; cvd: string; monoHue?: number; }

// ── PALETTES ────────────────────────────────────────────────────────────────
// Six semantic tokens per palette. `video/audio/program` are the three signal
// categories (the accessibility-critical trio — keep them distinct in hue AND
// luminance so they survive grey/mono); `alarm/ok/onair` are the state colours.
interface PaletteTokens { video: string; audio: string; program: string; alarm: string; ok: string; onair: string; }
interface Palette { id: string; name: string; cvdSafe: boolean; blurb: string; t: PaletteTokens; }

const PALETTES: readonly Palette[] = [
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

const paletteById = (id: string): Palette => PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;

const KEY = 'twist.colour';
const DEFAULT: ColourScheme = { vision: 'normal', chroma: 'full', cvd: 'classic', monoHue: -8 };

const VISIONS: readonly Vision[] = ['low', 'normal', 'high'];
const CHROMAS: readonly Chroma[] = ['full', 'grey', 'mono'];

const isVision = (v: string | null): v is Vision => (VISIONS as readonly string[]).includes(v ?? '');
const isChroma = (v: string | null): v is Chroma => (CHROMAS as readonly string[]).includes(v ?? '');
const isCvd = (v: string | null): boolean => PALETTES.some((p) => p.id === v);

/** The current scheme, read back from the <html> attributes (default-filled). */
export function getScheme(): ColourScheme {
  const h = document.documentElement;
  const vision = h.getAttribute('data-vision');
  const chroma = h.getAttribute('data-chroma');
  const cvd = h.getAttribute('data-cvd');
  const monoHueStr = h.style.getPropertyValue('--mono-hue');
  const monoHue = monoHueStr ? parseInt(monoHueStr.replace('deg', '')) : undefined;
  return {
    vision: isVision(vision) ? vision : DEFAULT.vision,
    chroma: isChroma(chroma) ? chroma : DEFAULT.chroma,
    cvd: isCvd(cvd) ? cvd! : DEFAULT.cvd,
    monoHue: monoHue !== undefined && !isNaN(monoHue) ? monoHue : DEFAULT.monoHue,
  };
}

/** Write a palette's tokens INLINE onto <html> (semantic + legacy category vars). */
function applyPaletteTokens(id: string): void {
  const t = paletteById(id).t;
  const s = document.documentElement.style;
  s.setProperty('--sig-video', t.video);   s.setProperty('--video-color', t.video);
  s.setProperty('--sig-audio', t.audio);    s.setProperty('--audio-color', t.audio);
  s.setProperty('--sig-program', t.program); s.setProperty('--program-color', t.program);
  s.setProperty('--state-alarm', t.alarm);
  s.setProperty('--state-ok', t.ok);
  s.setProperty('--state-onair', t.onair);
}

function paint(s: ColourScheme): void {
  const h = document.documentElement;
  h.setAttribute('data-vision', s.vision);
  h.setAttribute('data-chroma', s.chroma);
  h.setAttribute('data-cvd', s.cvd);
  if (s.monoHue !== undefined) {
    h.style.setProperty('--mono-hue', `${s.monoHue}deg`);
  }
  applyPaletteTokens(s.cvd);
}

/** Read the persisted scheme and paint the attributes. Call BEFORE first render. */
export function applyStoredColourScheme(): void {
  let s: ColourScheme = DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ColourScheme>;
      s = {
        vision: isVision(p.vision ?? null) ? p.vision! : DEFAULT.vision,
        chroma: isChroma(p.chroma ?? null) ? p.chroma! : DEFAULT.chroma,
        cvd: isCvd(p.cvd ?? null) ? p.cvd! : DEFAULT.cvd,
        monoHue: typeof p.monoHue === 'number' ? p.monoHue : DEFAULT.monoHue,
      };
    }
  } catch { /* private mode / disabled / malformed — fall back to default */ }
  paint(s);
}

/** Set the scheme: paint, persist, and announce (for live listeners). */
export function setScheme(s: ColourScheme): void {
  paint(s);
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  document.dispatchEvent(new CustomEvent<ColourScheme>('colour-scheme-change', { detail: s }));
}

const sameScheme = (a: ColourScheme, b: ColourScheme): boolean =>
  a.vision === b.vision && a.chroma === b.chroma && a.cvd === b.cvd && a.monoHue === b.monoHue;

/** The named presets — each a labelled point in the vision×chroma×palette cube. Glyphs
 *  are monochrome (never colour-dependent), so they read in every mode including mono. */
interface Preset { id: string; glyph: string; label: string; hint: string; scheme: ColourScheme; }
const PRESETS: readonly Preset[] = [
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
const AXES: ReadonlyArray<{
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
];

const STYLE_ID = 'tr-colour-editor';
const CSS = `
.cse-note{color:#9fb8d8;font-size:12px;line-height:1.55;margin:0 0 18px;max-width:74ch;}
.cse-sec{margin:0 0 24px;}
.cse-presets{display:flex;flex-wrap:wrap;gap:12px;}
/* LCARS Corner Law: inner radius = ½ outer, tops/bottoms square. Ladder pair 16↔8:
   leading (left) corners = outer 16, trailing (right) = inner 8; long edges stay flat. */
.cse-preset{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:126px;flex:1 1 126px;
  max-width:180px;padding:14px 12px 10px;border:2px solid #2b3d5f;border-radius:16px 8px 8px 16px;background:#111c31;
  color:#dce8fb;cursor:pointer;font:700 11px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;text-align:center;}
.cse-preset:hover{border-color:#4a678f;background:#16263f;}
.cse-preset .g{font-size:28px;line-height:1;}
.cse-preset .h{font:400 10px Arial,sans-serif;letter-spacing:0;text-transform:none;color:#7f98b8;line-height:1.3;}
.cse-preset .sel{font-size:9px;letter-spacing:1px;color:#7fd0ff;min-height:11px;}
.cse-preset[aria-pressed="true"]{border-color:#7fd0ff;box-shadow:inset 0 0 0 2px rgba(127,208,255,.35);}
.cse-row{display:flex;align-items:center;gap:16px;margin:0 0 12px;flex-wrap:wrap;}
.cse-lab{width:120px;flex:0 0 auto;color:#8fb0d0;font:700 11px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;}
.cse-seg{display:inline-flex;border:2px solid #2b3d5f;border-radius:15px;overflow:hidden;}
.cse-seg button{padding:9px 18px;background:#111c31;color:#cfe0ff;border:none;border-right:1px solid #2b3d5f;
  cursor:pointer;font:700 12px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;}
.cse-seg button:last-child{border-right:none;}
.cse-seg button:hover{background:#16263f;}
.cse-seg button[aria-pressed="true"]{background:#1d3a5c;color:#fff;box-shadow:inset 0 -3px 0 #7fd0ff;}
.cse-hint{color:#6f88a8;font:400 11px Arial,sans-serif;}
.cse-pals{display:flex;flex-wrap:wrap;gap:10px;}
.cse-pal{position:relative;display:flex;flex-direction:column;gap:7px;align-items:flex-start;min-width:138px;
  padding:11px 13px 9px;border:2px solid #2b3d5f;border-radius:16px 8px 8px 16px;background:#111c31;color:#dce8fb;cursor:pointer;}
.cse-pal:hover{border-color:#4a678f;background:#16263f;}
.cse-pal[aria-pressed="true"]{border-color:#7fd0ff;box-shadow:inset 0 0 0 2px rgba(127,208,255,.35);}
.cse-dots{display:flex;gap:5px;}
.cse-dots i{width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.18);}
.cse-pal .nm{font:700 12px Arial,sans-serif;letter-spacing:.5px;}
.cse-pal .safe{font:800 8px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#0a1322;
  background:#39d98a;border-radius:8px;padding:2px 6px;}
.cse-pal .safe.no{visibility:hidden;}
.cse-pal .selmark{position:absolute;top:8px;right:9px;font:800 12px Arial;color:#7fd0ff;min-width:12px;text-align:right;}
.cse-prev{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:18px;border-radius:16px 8px 8px 16px;
  background:#0a1322;border:1px solid #1d2b47;}
.cse-node{display:flex;align-items:center;gap:8px;padding:11px 24px;font:800 12px Arial,sans-serif;
  letter-spacing:1px;border:2px solid currentColor;border-radius:8px;background:rgba(255,255,255,.02);}
.cse-vid{color:var(--sig-video,#CC99CC);clip-path:polygon(0 0,100% 0,88% 100%,12% 100%);}
.cse-aud{color:var(--sig-audio,#FF9C63);clip-path:polygon(12% 0,88% 0,100% 100%,0 100%);}
.cse-prog{color:var(--sig-program,#646DCC);}
.cse-chip{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:22px;
  border:2px solid currentColor;font:800 12px Arial,sans-serif;letter-spacing:1px;}
.cse-chip .g{font-size:15px;line-height:1;}
.cse-fault{color:var(--state-alarm,#ff3b3b);}
.cse-ok{color:var(--state-ok,#39d98a);}
.cse-onair{color:var(--state-onair,#ffaa00);}
.cse-hue-row{display:flex;align-items:center;gap:16px;margin:0 0 12px;opacity:0.3;pointer-events:none;transition:opacity 0.2s;}
.cse-hue-row.active{opacity:1;pointer-events:auto;}
.cse-hue-slider{-webkit-appearance:none;appearance:none;width:160px;height:8px;border-radius:4px;background:linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);outline:none;}
.cse-hue-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #2b3d5f;cursor:pointer;}
.cse-hue-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #2b3d5f;cursor:pointer;}
`;

/** Build the editor body: presets, the vision/chroma axes, the palette gallery, and a live preview. */
function buildEditor(body: HTMLElement): void {
  addStyles(STYLE_ID, CSS);

  body.append(el('p', { class: 'cse-note' }, [
    'Presentation modes for colour-vision accessibility. Every mode keeps meaning readable ',
    'without relying on hue — signal category is coded by shape (video ▱ / audio ▽), and ',
    'state by glyph. Choose a preset, tune the axes, or pick a palette below. Changes apply ',
    'live and persist on this device.',
  ]));

  // ── PRESETS ──────────────────────────────────────────────────────────────
  const presetRow = el('div', { class: 'cse-presets' });
  const presetBtns = PRESETS.map((p) => {
    const btn = el('button', { class: 'cse-preset', type: 'button', title: p.hint }, [
      el('span', { class: 'g' }, [p.glyph]),
      el('span', {}, [p.label]),
      el('span', { class: 'h' }, [p.hint]),
      el('span', { class: 'sel' }, ['']),
    ]);
    btn.addEventListener('click', () => { setScheme(p.scheme); sync(); });
    return { p, btn };
  });
  presetRow.append(...presetBtns.map((x) => x.btn));
  const presetSec = el('div', { class: 'cse-sec' }, [el('h3', { class: 'ed-h' }, ['Presets']), presetRow]);

  // ── FINE CONTROL (vision + chroma) ─────────────────────────────────────────
  const axisSec = el('div', { class: 'cse-sec' }, [el('h3', { class: 'ed-h' }, ['Fine control'])]);
  const segBtns: Array<{ axisIdx: number; v: string; btn: HTMLButtonElement }> = [];
  AXES.forEach((axis, axisIdx) => {
    const seg = el('div', { class: 'cse-seg' });
    axis.opts.forEach((o) => {
      const b = el('button', { type: 'button' }, [o.label]);
      b.addEventListener('click', () => { setScheme(axis.set(getScheme(), o.v)); sync(); });
      seg.append(b);
      segBtns.push({ axisIdx, v: o.v, btn: b });
    });
    axisSec.append(el('div', { class: 'cse-row' }, [
      el('span', { class: 'cse-lab' }, [axis.label]),
      seg,
      el('span', { class: 'cse-hint' }, [axis.hint]),
    ]));
  });

  const hueInput = el('input', { class: 'cse-hue-slider', type: 'range', min: '-180', max: '180', step: '1', value: String(getScheme().monoHue ?? -8) }) as HTMLInputElement;
  const hueRow = el('div', { class: 'cse-hue-row' }, [
    el('span', { class: 'cse-lab' }, ['Mono Hue']),
    hueInput,
    el('span', { class: 'cse-hint' }, ['Adjust phosphor tint (only applies in Mono mode)']),
  ]);
  hueInput.addEventListener('input', () => {
    const s = getScheme();
    s.monoHue = parseInt(hueInput.value);
    setScheme(s);
    sync(); // Sync updates the hint state if needed, though mostly we just want live update
  });
  axisSec.append(hueRow);

  // ── PALETTE GALLERY ────────────────────────────────────────────────────────
  const palRow = el('div', { class: 'cse-pals' });
  const palBtns = PALETTES.map((p) => {
    const dots = el('span', { class: 'cse-dots' }, [
      el('i', { style: `background:${p.t.video}` }),
      el('i', { style: `background:${p.t.audio}` }),
      el('i', { style: `background:${p.t.program}` }),
    ]);
    const btn = el('button', { class: 'cse-pal', type: 'button', title: p.blurb }, [
      el('span', { class: 'selmark' }, ['']),
      dots,
      el('span', { class: 'nm' }, [p.name]),
      el('span', { class: `safe${p.cvdSafe ? '' : ' no'}` }, ['✓ CVD-safe']),
    ]);
    btn.addEventListener('click', () => { setScheme({ ...getScheme(), cvd: p.id }); sync(); });
    return { p, btn };
  });
  palRow.append(...palBtns.map((x) => x.btn));
  const palSec = el('div', { class: 'cse-sec' }, [
    el('h3', { class: 'ed-h' }, ['Palette']),
    el('p', { class: 'cse-note', style: 'margin-bottom:12px' }, [
      'The three swatches are the video · audio · program signal colours. Palettes tagged ',
      'CVD-safe stay distinguishable for colour-blind operators.',
    ]),
    palRow,
  ]);

  // ── LIVE PREVIEW ─────────────────────────────────────────────────────────
  const prevSec = el('div', { class: 'cse-sec' }, [
    el('h3', { class: 'ed-h' }, ['Live preview']),
    el('div', { class: 'cse-prev' }, [
      el('div', { class: 'cse-node cse-vid' }, ['VIDEO']),
      el('div', { class: 'cse-node cse-aud' }, ['AUDIO']),
      el('div', { class: 'cse-node cse-prog' }, ['PGM']),
      el('div', { class: 'cse-chip cse-fault' }, [el('span', { class: 'g' }, ['⚠']), 'FAULT']),
      el('div', { class: 'cse-chip cse-ok' }, [el('span', { class: 'g' }, ['✓']), 'OK']),
      el('div', { class: 'cse-chip cse-onair' }, [el('span', { class: 'g' }, ['●']), 'ON-AIR']),
    ]),
  ]);

  body.append(presetSec, axisSec, palSec, prevSec);

  /** Reflect the current scheme onto every control's pressed state. */
  function sync(): void {
    const cur = getScheme();
    for (const { p, btn } of presetBtns) {
      const on = sameScheme(cur, p.scheme);
      btn.setAttribute('aria-pressed', String(on));
      (btn.querySelector('.sel') as HTMLElement).textContent = on ? '✓ SELECTED' : '';
    }
    for (const { axisIdx, v, btn } of segBtns) {
      btn.setAttribute('aria-pressed', String(AXES[axisIdx]!.get(cur) === v));
    }
    for (const { p, btn } of palBtns) {
      const on = cur.cvd === p.id;
      btn.setAttribute('aria-pressed', String(on));
      (btn.querySelector('.selmark') as HTMLElement).textContent = on ? '✓' : '';
    }
    if (cur.chroma === 'mono') {
      hueRow.classList.add('active');
    } else {
      hueRow.classList.remove('active');
    }
    hueInput.value = String(cur.monoHue ?? -8);
  }
  sync();
}

/** Open the COLOUR & VISION editor overlay. */
export function openColourEditor(): void {
  openOverlay(
    { title: 'Colour & Vision', color: '#CC79A7', prodName: 'system', twistName: 'colour' },
    (bodyEl) => buildEditor(bodyEl),
  );
}

// A painter's-palette glyph as inline SVG: monochrome (currentColor, so it honours
// grey/mono modes), and renders without an emoji font. Paint wells are cut-outs.
const PALETTE_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
  '<path fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'd="M12 3C7 3 3 6.6 3 11c0 3.3 2.5 5.5 5.5 5.5.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1' +
  '-.2-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H13c3.3 0 6-2.4 6-5.3C19 5.9 15.9 3 12 3z"/>' +
  '<circle cx="7.4" cy="11" r="1.1" fill="currentColor"/>' +
  '<circle cx="9.6" cy="7.4" r="1.1" fill="currentColor"/>' +
  '<circle cx="13.2" cy="6.7" r="1.1" fill="currentColor"/>' +
  '<circle cx="16" cy="9" r="1.1" fill="currentColor"/></svg>';

/** Mount the palette launcher (docked beside the chirality toggle). */
export function initColourScheme(): void {
  applyStoredColourScheme();
  const btn = el('button', { class: 'palette-toggle', type: 'button', title: 'Colour & Vision modes' });
  btn.innerHTML = PALETTE_SVG;
  btn.setAttribute('aria-label', 'Colour & Vision modes');
  btn.addEventListener('click', openColourEditor);
  document.body.appendChild(btn);
}
