// src/editors/tsg/view — the TEST SIGNAL GENERATOR render.
//
// A big live preview of the currently-generated pattern + its spec tooltip and a
// link to the governing document, over the shared picker gallery (ui/tsg-gallery).
// The chosen pattern is persisted per-twist and published as an R/W MQTT param so a
// routed monitor / another console tracks the selection. The initial pattern is
// seeded from the routed feed's LABEL (route "EBU BARS" → the EBU bars generator).

import { addStyles, el } from '../../ui/dom.js';
import type { EditorContext } from '../types.js';
import { CSS } from './styles.js';
import { buildTsgGallery } from '../../ui/tsg-gallery.js';
import { drawTsg, patternById, patternForLabel, type TsgPattern } from '../../domain/tsg/index.js';

const keyFor = (ctx: EditorContext): string => `tsg:${ctx.production.name}:${ctx.twist.name}`;

/** Resolve the pattern to show first: saved selection → routed feed label → default. */
function seedPattern(ctx: EditorContext): TsgPattern {
  try { const saved = localStorage.getItem(keyFor(ctx)); if (saved) return patternById(saved); } catch { /* ignore */ }
  const routed = ctx.sources.map((s) => s.label).find((l) => !!l && !/\bSET\b/i.test(l));
  return patternForLabel(routed);
}

export function renderTsg(host: HTMLElement, ctx: EditorContext): void {
  addStyles('tsg-editor', CSS);
  let cur = seedPattern(ctx);

  const preview = el('canvas', { class: 'tsg-preview' });
  const name = el('div', { class: 'tsg-ed-name' });
  const badge = el('div', { class: 'tsg-ed-badge' });
  const desc = el('div', { class: 'tsg-ed-desc' });
  const link = el('a', { class: 'tsg-ed-link', target: '_blank', rel: 'noopener noreferrer' }, ['◈ Reference document ↗']);

  const top = el('div', { class: 'tsg-ed-top' }, [
    el('div', { class: 'tsg-ed-preview' }, [preview]),
    el('div', { class: 'tsg-ed-meta' }, [name, badge, desc, link]),
  ]);

  ctx.services.advertiseParams?.([
    { name: 'pattern', type: 'string', writable: true },
  ]);

  function apply(p: TsgPattern, publish = true): void {
    cur = p;
    name.textContent = p.name;
    badge.textContent = p.group === 'HDR' ? 'HDR · REC. 2100' : 'SDR · REC. 709';
    desc.textContent = p.title;
    preview.title = p.title;
    link.setAttribute('href', p.href);
    link.title = p.title;
    gallery.select(p.id);
    try { localStorage.setItem(keyFor(ctx), p.id); } catch { /* ignore */ }
    if (publish) ctx.services.publishParam?.('pattern', p.id, { throttle: false });
  }

  const gallery = buildTsgGallery({
    selected: cur.id,
    onPick: (p) => apply(p),
    dispose: ctx.dispose,
  });

  host.append(el('div', { class: 'tsg-ed' }, [
    top,
    el('div', { class: 'tsg-ed-h' }, ['Test Signal Library']),
    gallery.root,
  ]));

  apply(cur, false);

  // External changes (another console / backend echo) re-select here.
  ctx.services.onParam?.('pattern', (v) => { if (typeof v === 'string' && v !== cur.id) apply(patternById(v), false); });

  // Big preview ticker (the gallery runs its own for the tiles).
  ctx.dispose.raf(() => { if (preview.isConnected) drawTsg(preview, cur.id, performance.now()); });
}
