// src/ui/tip-expectation — Kind A: "what the production expects of this window",
// DERIVED from the EditorContext (accepts/inputs/routed/siblings/caps) MERGED with
// any tip authored in the Routes JSON (room / floor room / person / per-twist).
//
// Pure builders (no DOM, unit-testable) plus `expectationTip`, which binds the built
// HTML to a window's title rail via the shared `attach` service.

import { attach, esc } from './tip-panel.js';
import type { Tip } from './tip.js';
import type { EditorContext } from '../editors/types.js';
import type { Capability, TipSpec } from '../model/index.js';

/** Normalise a Routes-JSON TipSpec (string | object) into a structured Tip. */
export function normTip(spec: TipSpec): Tip {
  return typeof spec === 'string' ? { lead: spec } : spec;
}

const ACCEPTS_TEXT: Record<string, string> = {
  video: 'video', audio: 'audio', both: 'video + audio', camera: 'one camera',
};

/** Build the accepts/capacity clause from the twist config. */
function expectsClause(ctx: EditorContext): string {
  const c = ctx.twist.config;
  if (!c) return 'signal routed from the matrix';
  const base = c.cameraInput ? 'one camera' : (c.accepts ? ACCEPTS_TEXT[c.accepts] ?? c.accepts : 'signal');
  const cap: string[] = [];
  if (c.inputs?.length) cap.push(`${c.inputs.length} inputs`);
  if (c.maxVideo) cap.push(`${c.maxVideo} video`);
  if (c.maxAudio) cap.push(`${c.maxAudio} audio`);
  return cap.length ? `${base} · up to ${cap.join(', ')}` : base;
}

function routedClause(ctx: EditorContext): string {
  const n = ctx.sources.length;
  if (!n) return `<span class="warn">⚠ Nothing routed yet — drag a source onto an input</span>`;
  const labels = ctx.sources.slice(0, 4).map((f) => esc(f.label)).join(', ');
  return `${n} feed${n > 1 ? 's' : ''} — ${labels}${n > 4 ? ` +${n - 4} more` : ''}`;
}

function operatedClause(ctx: EditorContext, caps: readonly Capability[] | undefined): string {
  if (!caps || !caps.length) return 'open to all roles';
  const held = caps.every((c) => ctx.can(c));
  return `needs ‹${caps.join(', ')}› — ${held ? 'you hold it ✓' : '<span class="bad">view-only ✗</span>'}`;
}

function row(k: string, v: string): string {
  return `<span class="r"><span class="k">${k}</span>${v}</span>`;
}
function noteRow(label: string, spec: TipSpec): string {
  const t = normTip(spec);
  return `<span class="note"><span class="k">${label}</span>${esc(t.lead)}`
    + (t.good ? `<br><span class="g">✓ ${esc(t.good)}</span>` : '')
    + (t.bad ? `<br><span class="bad">✕ ${esc(t.bad)}</span>` : '') + `</span>`;
}

/**
 * Kind A (pure) — build the "Production Expectations" tip HTML + aria text from a
 * context. No DOM; unit-testable. `blurb` is the one-line "what it does"; the rest
 * is read from `ctx` and the Routes JSON (room/person tip on `ctx.production.tip`,
 * per-tool tip on `ctx.twist.config.tip`).
 */
export function expectationHtml(
  ctx: EditorContext,
  opts: { requiredCaps?: readonly Capability[]; blurb?: string },
): { html: string; aria: string } {
  const inProd = esc(ctx.production.name) + (ctx.production.floor ? ` · ${esc(ctx.production.floor)}` : '');
  const others = Math.max(0, ctx.siblings.length - 1);
  const html =
    `<b>${esc(ctx.twist.name)}</b>`
    + (opts.blurb ? `<span class="r">${esc(opts.blurb)}</span>` : '')
    + row('In', inProd)
    + row('Expects', expectsClause(ctx))
    + row('Routed', routedClause(ctx))
    + (others ? row('Shares', `${others} sibling twist${others > 1 ? 's' : ''} of this kind`) : '')
    + row('Operated', operatedClause(ctx, opts.requiredCaps))
    + (ctx.production.tip ? noteRow('Room', ctx.production.tip) : '')
    + (ctx.twist.config?.tip ? noteRow('Tool', ctx.twist.config.tip) : '');
  const aria = `${ctx.twist.name}. ${opts.blurb ?? ''} In ${ctx.production.name}. Expects ${expectsClause(ctx)}.`;
  return { html, aria };
}

/**
 * Kind A — attach the expectation tip to a window's title rail. Re-reads on every
 * call, so it is safe on the overlay title element (reused across editor opens).
 */
export function expectationTip(
  titleEl: HTMLElement,
  ctx: EditorContext,
  opts: { requiredCaps?: readonly Capability[]; blurb?: string },
): void {
  const { html, aria } = expectationHtml(ctx, opts);
  attach(titleEl, html, aria);
}
