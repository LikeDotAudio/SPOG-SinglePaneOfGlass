// src/ui/console/dest-fixtures-monitor — the MONITOR fixture (test-frame audit P3).
//
// Every destination now carries a live PROGRAM monitor: it renders the "faux
// signal" (the deterministic person-in-a-room picture) of whatever source
// currently sits in the room's crosspoints, so you can see at a glance which feed
// the room is carrying — the literal ask of the Test-Frame Routing audit.
//
// It re-reads the routed feed from the DOM each redraw (the same
// `.drop-zone > .signal-node` scan the rest of the app uses), so dragging a
// source onto any of the room's twists lights this monitor WITHOUT a full room
// re-render. When the room is OFFLINE it shows the NO SIGNAL slate; when nothing
// is routed it shows an idle placeholder.

import { el } from '../dom.js';
import { drawFauxSignal, type FauxSource } from '../faux-signal.js';
import { animate, card } from './dest-fixtures-shared.js';

/** The feed to monitor: the first VIDEO/control feed routed anywhere in the room
 *  (an audio-only feed is used only as a last resort). Mirrors app/context.ts
 *  routedFeeds, but scans the whole room body across every twist's drop-zone. */
function routedFeed(body: HTMLElement): FauxSource | null {
  const nodes = body.querySelectorAll<HTMLElement>('.drop-zone .signal-node:not(.dropped-group)');
  let audioFallback: FauxSource | null = null;
  for (const n of nodes) {
    const label = (n.textContent ?? '').trim().split('\n')[0]?.trim() ?? '';
    if (!label) continue;
    const color = n.style.color || n.style.borderColor || '#4d94ff';
    const media = n.classList.contains('audio') ? 'audio' as const
      : n.classList.contains('video') ? 'video' as const
      : n.classList.contains('control') || n.classList.contains('camera-control') ? 'control' as const
      : undefined;
    const feed: FauxSource = { id: n.id || label, label, color, origin: n.dataset.origin, media };
    if (media !== 'audio') return feed;   // prefer a picture feed
    audioFallback ??= feed;
  }
  return audioFallback;
}

/** A dim "nothing routed" placeholder (distinct from the faulted NO SIGNAL slate). */
function drawIdle(cvs: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const cw = cvs.clientWidth, ch = cvs.clientHeight;
  if (!cw || !ch) return;
  cvs.width = Math.round(cw * dpr); cvs.height = Math.round(ch * dpr);
  const g = cvs.getContext('2d'); if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#050608'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#3a4658'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${Math.max(9, Math.round(ch * 0.1))}px 'Courier New',monospace`;
  g.fillText('NO SOURCE ROUTED', cw / 2, ch / 2);
}

/** The MONITOR fixture. `offline` (room fault status) forces the NO SIGNAL slate. */
export function monitorCard(body: HTMLElement, offline: boolean): HTMLElement {
  const cvs = el('canvas', {
    class: 'dfx-cvs',
    style: 'aspect-ratio:16/9;height:auto;background:#000;',
  });
  // ~15fps redraw (every 4th display frame): the faux "breathing" bob is slow, so
  // this stays smooth while quartering the DOM re-scan + canvas realloc cost.
  let f = 0;
  animate(cvs, () => {
    if (f++ % 4) return;
    const t = performance.now();
    if (offline) { drawFauxSignal(cvs, { label: 'PROGRAM', faulted: true }, t); return; }
    const feed = routedFeed(body);
    if (feed) drawFauxSignal(cvs, feed, t);
    else drawIdle(cvs);
  });
  return card('MONITOR', cvs, offline ? 'offline' : 'routed source');
}
