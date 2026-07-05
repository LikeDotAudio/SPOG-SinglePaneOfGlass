// src/domain/test-card — SPOG's synthetic, routable test frame.
//
// A source's self-identifying frame of video: square SMPTE bars + a burned-in
// slate + a moving shape ident, keyed on the source's own name/colour so it is
// recognisable wherever it lands after routing. See
// docs/Audit/Test-Frame-Routing-Audit.md.
//
// createTestCardWall() gives a surface (e.g. the multiviewer) ONE shared rAF
// ticker for its whole wall — every mounted canvas is painted from a single loop
// at the display cap, while the LOGICAL frame count runs at the format fps.
// Canvases that leave the DOM are pruned automatically (like dest-fixtures).

import type { Disposer } from '../../ui/timers.js';
import { el } from '../../ui/dom.js';
import { drawCard } from './render.js';
import { identFor } from './ident.js';
import { MEZZANINE, type CardSpec } from './types.js';

export { drawCard } from './render.js';
export { identFor, hashHue, hueOf } from './ident.js';
export { pathShape } from './shapes.js';
export * from './types.js';

/** Build a CardSpec from a source's label + authored colour (the common case).
 *  `extra` threads the source's origin/media/fault through to the faux signal. */
export function testCardFor(
  label: string,
  color?: string,
  extra?: { origin?: string; media?: 'audio' | 'video' | 'control'; faulted?: boolean },
): CardSpec {
  return { ident: identFor(label, color), format: MEZZANINE, color: color || '#4d94ff', ...extra };
}

export interface TestCardWall {
  /** Create a live test-card canvas for `spec`, registered on the shared ticker. */
  mount(spec: CardSpec, className?: string): HTMLCanvasElement;
}

/** One shared ticker for a whole preview surface. The logical frame is derived
 *  from elapsed time (×fps), so a paused/throttled render still reports true
 *  100fps timecode and a frozen pane is visibly frozen. */
export function createTestCardWall(dispose: Disposer): TestCardWall {
  const entries: Array<{ cv: HTMLCanvasElement; spec: CardSpec }> = [];
  let start = -1;

  dispose.raf(() => {
    if (start < 0) start = performance.now();
    const elapsed = performance.now() - start;
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i]!;
      if (!e.cv.isConnected) {
        entries.splice(i, 1); // prune tiles the wall has re-rendered away
        continue;
      }
      const frame = Math.floor((elapsed / 1000) * e.spec.format.fps);
      drawCard(e.cv, e.spec, frame);
    }
  });

  return {
    mount(spec, className = 'mv-screen') {
      const cv = el('canvas', { class: className, style: 'display:block;width:100%;height:100%' });
      entries.push({ cv, spec });
      return cv;
    },
  };
}
