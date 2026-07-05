// src/domain/test-card/render — paint one square "faux signal" frame into a canvas.
//
// A routed source no longer shows generic SMPTE colour bars: it shows its OWN
// self-identifying picture — a deterministic "person in a room" cartoon, seeded
// from the source's name+colour so it is recognisable wherever it lands after
// routing, with a burned-in lower-third (name · room). See the shared painter in
// src/ui/faux-signal.ts. The frame count still drives the subtle "live" motion.

import { drawFauxSignal } from '../../ui/faux-signal.js';
import type { CardSpec } from './types.js';

/** Paint the card. Delegates to the shared faux-signal painter (DPR-aware). The
 *  logical `frame` (at spec.format.fps) becomes the ms clock for the live bob. */
export function drawCard(canvas: HTMLCanvasElement, spec: CardSpec, frame: number): void {
  const t = (frame / spec.format.fps) * 1000;
  drawFauxSignal(canvas, {
    label: spec.ident.name,
    color: spec.color,
    origin: spec.origin,
    media: spec.media,
    faulted: spec.faulted,
  }, t);
}
