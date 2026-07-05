// src/ui/console/chirality — the handedness ("chirality") switch.
// Strategy: docs/Audit /Chirality Deployment strategy.md (C0 foundation + C1 rail).
//
// One axis, two states: `right` | `left`, meaning the operator's hand. It lives as
// `data-chirality` on <html> (never wiped by the body rebuild); CSS + the `--chir`
// token do the rest. `right` (default, the majority) docks the SOURCES rail on the
// dominant-hand RIGHT edge and emits the drag ghost to the non-occluded LEFT of the
// finger; `left` is the classic left dock, mirrored. Persisted per device now;
// per-operator persistence is a later phase (C4). Flips are deliberate + explicit —
// detection only *suggests* (not built yet), the toggle decides.

import { getPrefs, patchPrefs } from '../../platform/prefs.js';

export type Chirality = 'right' | 'left';

const DEFAULT: Chirality = 'right';

/** The current handedness (from the <html> attribute, default `right`). */
export function getChirality(): Chirality {
  return document.documentElement.getAttribute('data-chirality') === 'left' ? 'left' : 'right';
}

/** The sign every JS-computed placement reads: +1 right-handed, -1 left-handed. */
export function chiralitySign(): 1 | -1 {
  return getChirality() === 'left' ? -1 : 1;
}

/** Read the persisted value and paint the attribute. Call BEFORE first render so
 *  the layout lands in the right chirality with no visible flash. */
export function applyStoredChirality(): void {
  const stored = getPrefs().chirality;
  const c: Chirality = stored === 'left' ? 'left' : stored === 'right' ? 'right' : DEFAULT;
  document.documentElement.setAttribute('data-chirality', c);
}

/** Set handedness: paint the attribute, persist, and announce (for live listeners). */
export function setChirality(c: Chirality): void {
  document.documentElement.setAttribute('data-chirality', c);
  patchPrefs({ chirality: c });
  document.dispatchEvent(new CustomEvent('chirality-change', { detail: c }));
}

export function toggleChirality(): void {
  setChirality(getChirality() === 'right' ? 'left' : 'right');
}

/** Mount the persistent handedness toggle (a hand glyph pointing at the rail side). */
export function initChirality(): void {
  applyStoredChirality();
  const btn = document.createElement('button');
  btn.className = 'chir-toggle';
  const paint = (): void => {
    const c = getChirality();
    btn.textContent = c === 'right' ? '✋▶' : '◀✋';
    btn.title = c === 'right' ? 'Chirality Right' : 'Chirality Left';
    btn.setAttribute('aria-label', btn.title);
  };
  btn.addEventListener('click', () => { toggleChirality(); paint(); });
  document.addEventListener('chirality-change', paint);
  paint();
  document.body.appendChild(btn);
}
