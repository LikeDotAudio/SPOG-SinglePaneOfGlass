// src/ui/console/colour-engine — the COLOUR & VISION paint engine.
// Reads/writes the three accessibility axes as `data-*` attributes on <html>
// and writes each palette's semantic tokens INLINE, so a palette pick needs no
// CSS. Persisted per device (prefs) and painted BEFORE first render
// (applyStoredColourScheme) so the console lands in the chosen mode with no flash.

import { getPrefs, patchPrefs } from '../../platform/prefs.js';
import {
  type ColourScheme, DEFAULT, paletteById,
  isVision, isChroma, isFace, isCvd,
} from './colour-palettes.js';

/** The current scheme, read back from the <html> attributes (default-filled). */
export function getScheme(): ColourScheme {
  const h = document.documentElement;
  const vision = h.getAttribute('data-vision');
  const chroma = h.getAttribute('data-chroma');
  const cvd = h.getAttribute('data-cvd');
  const face = h.getAttribute('data-face');
  const monoHueStr = h.style.getPropertyValue('--mono-hue');
  const monoHue = monoHueStr ? parseInt(monoHueStr.replace('deg', '')) : undefined;
  return {
    vision: isVision(vision) ? vision : DEFAULT.vision,
    chroma: isChroma(chroma) ? chroma : DEFAULT.chroma,
    cvd: isCvd(cvd) ? cvd! : DEFAULT.cvd,
    face: isFace(face) ? face : DEFAULT.face,
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
  h.setAttribute('data-face', s.face);
  if (s.monoHue !== undefined) {
    h.style.setProperty('--mono-hue', `${s.monoHue}deg`);
  }
  applyPaletteTokens(s.cvd);
}

/** Read the persisted scheme and paint the attributes. Call BEFORE first render. */
export function applyStoredColourScheme(): void {
  const p = (getPrefs().colour ?? {}) as Partial<ColourScheme>;
  const s: ColourScheme = {
    vision: isVision(p.vision ?? null) ? p.vision! : DEFAULT.vision,
    chroma: isChroma(p.chroma ?? null) ? p.chroma! : DEFAULT.chroma,
    cvd: isCvd(p.cvd ?? null) ? p.cvd! : DEFAULT.cvd,
    face: isFace(p.face ?? null) ? p.face! : DEFAULT.face,
    monoHue: typeof p.monoHue === 'number' ? p.monoHue : DEFAULT.monoHue,
  };
  paint(s);
}

/** Set the scheme: paint, persist, and announce (for live listeners). */
export function setScheme(s: ColourScheme): void {
  paint(s);
  patchPrefs({ colour: s as unknown as Record<string, unknown> });
  document.dispatchEvent(new CustomEvent<ColourScheme>('colour-scheme-change', { detail: s }));
}

export const sameScheme = (a: ColourScheme, b: ColourScheme): boolean =>
  a.vision === b.vision && a.chroma === b.chroma && a.cvd === b.cvd && a.face === b.face && a.monoHue === b.monoHue;
