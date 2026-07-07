// src/editors/signaling/tsg-frame — the studio TEST SIGNAL frame on the SIGNALING
// panel. A live preview of the room's Test Signal Generator output that opens the
// TSG editor on tap; it re-reads the persisted pick each frame so choosing a pattern
// there updates this frame live. Split from view.ts to keep it under the size cap.

import { qs } from '../../ui/dom.js';
import type { EditorContext } from '../types.js';
import { drawTsg, tsgFor } from '../../domain/tsg/index.js';

/** Wire the `.sg-tsg` frame already present in the SIGNALING markup. */
export function mountStudioTsg(host: HTMLElement, ctx: EditorContext): void {
  const frame = qs<HTMLElement>(host, '.sg-tsg');
  const cvs = qs<HTMLCanvasElement>(host, '.sg-tsg-cvs');
  const nameEl = qs<HTMLElement>(host, '.sg-tsg-name');
  frame.addEventListener('click', () => ctx.services.openTsg?.(ctx.production.name, ctx.production.color));
  ctx.dispose.raf(() => {
    if (!cvs.isConnected) return;
    const p = tsgFor(ctx.production.name, 'STUDIO TSG');
    nameEl.textContent = p.name.toUpperCase();
    drawTsg(cvs, p.id, performance.now());
  });
}
