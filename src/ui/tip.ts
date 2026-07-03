// src/ui/tip — the shared "tool tick" hover-help layer for every LCARS window.
//
// Generalises the pattern proven in editors/meter-input (a pointer-following panel
// with ✓ good / ✕ bad guidance) into ONE reusable service. Two entry points mirror
// the two kinds of tip in the audit (docs/Audit /LCARS-Hover-Tooltips-*):
//   • tip()/hint()      — Kind B: "what this control does / how to read it"
//   • expectationTip()  — Kind A: "what the production expects of this window",
//                         DERIVED from the EditorContext (accepts/inputs/routed/
//                         siblings/caps) MERGED with any tip authored in the Routes
//                         JSON (room / floor room / person / per-twist).
//
// One tip panel exists for the whole app; every target shares it. Every tip also
// sets aria-label and answers to focus + touch, so it reaches assistive tech and
// the touch console, not only the mouse. Targets are safe to re-bind (the overlay
// title element is reused across editor opens) — listeners attach once per element
// and read the latest content from a WeakMap.

import { addStyles, el } from './dom.js';
import type { EditorContext } from '../editors/types.js';
import type { Capability, TipSpec } from '../model/index.js';

/** The structured form of a Kind-B tip (a bare string is shorthand for {lead}). */
export interface Tip { title?: string; lead: string; good?: string; bad?: string }

const STYLE_ID = 'tr-tip';
const CSS = `
.tr-tip{position:fixed;z-index:100000;display:none;max-width:340px;pointer-events:none;
  background:#0b1526;border:1px solid #2c4370;border-radius:9px;padding:11px 13px;
  color:#cfe0f2;font:11px/1.55 Arial,Helvetica,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.7);}
.tr-tip.open{display:block;}
.tr-tip b{color:#6FC8F0;letter-spacing:1px;text-transform:uppercase;font-size:11px;}
.tr-tip .r{display:block;margin-top:3px;}
.tr-tip .k{display:inline-block;min-width:74px;color:#7f9ec4;text-transform:uppercase;
  font-size:9px;letter-spacing:.5px;vertical-align:top;}
.tr-tip .g{color:#7fe0a0;font-weight:bold;} .tr-tip .bad{color:#ff9a9a;font-weight:bold;}
.tr-tip .warn{color:#ffcf7a;font-weight:bold;}
.tr-tip .note{display:block;margin-top:7px;padding-top:7px;border-top:1px solid #1c2c48;color:#bcd3ee;}
.has-tip{cursor:help;}
`;

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));

let panel: HTMLElement | null = null;
function ensurePanel(): HTMLElement {
  addStyles(STYLE_ID, CSS);
  if (panel) return panel;
  panel = el('div', { class: 'tr-tip' });
  document.body.appendChild(panel);
  // Any scroll invalidates the anchor point — just hide.
  window.addEventListener('scroll', () => hide(), true);
  return panel;
}
function place(x: number, y: number): void {
  const p = ensurePanel();
  const w = p.offsetWidth, h = p.offsetHeight;
  p.style.left = `${clamp(x + 14, 6, window.innerWidth - w - 6)}px`;
  p.style.top = `${clamp(y + 16, 6, window.innerHeight - h - 6)}px`;
}
function show(html: string): void {
  const p = ensurePanel();
  p.innerHTML = html;
  p.classList.add('open');
}
function hide(): void {
  panel?.classList.remove('open');
}

// Latest content per target — so re-binding the reused overlay title is a no-op
// beyond updating what it shows, never stacking a second set of listeners.
const bound = new WeakSet<HTMLElement>();
const content = new WeakMap<HTMLElement, { html: string; aria: string }>();

function attach(target: HTMLElement, html: string, aria: string): void {
  content.set(target, { html, aria });
  target.setAttribute('aria-label', aria);
  target.classList.add('has-tip');
  if (bound.has(target)) return;
  bound.add(target);
  const cur = (): { html: string; aria: string } | undefined => content.get(target);
  target.addEventListener('mouseenter', (e) => { const c = cur(); if (c) { show(c.html); place(e.clientX, e.clientY); } });
  target.addEventListener('mousemove', (e) => { if (panel?.classList.contains('open')) place(e.clientX, e.clientY); });
  target.addEventListener('mouseleave', hide);
  // Keyboard: if the element is focusable, reading its tip on focus is free a11y.
  target.addEventListener('focus', () => { const c = cur(); if (c) { show(c.html); const r = target.getBoundingClientRect(); place(r.left, r.bottom); } });
  target.addEventListener('blur', hide);
  // Touch console: tap shows the tip near the finger; it clears on the next tap.
  target.addEventListener('touchstart', (e) => {
    const c = cur(); const t = e.touches[0];
    if (c && t) { show(c.html); place(t.clientX, t.clientY); }
  }, { passive: true });
}

function tipHtml(t: Tip): string {
  return (t.title ? `<b>${esc(t.title)}</b>` : '')
    + (t.title ? `<span class="r">${esc(t.lead)}</span>` : esc(t.lead))
    + (t.good ? `<span class="r g">✓ ${esc(t.good)}</span>` : '')
    + (t.bad ? `<span class="r bad">✕ ${esc(t.bad)}</span>` : '');
}
function ariaOf(t: Tip): string {
  return [t.title, t.lead, t.good && `Good: ${t.good}`, t.bad && `Bad: ${t.bad}`].filter(Boolean).join('. ');
}

/** Normalise a Routes-JSON TipSpec (string | object) into a structured Tip. */
export function normTip(spec: TipSpec): Tip {
  return typeof spec === 'string' ? { lead: spec } : spec;
}

/** Kind B — attach a hover-help tip to any control (a title, meter, scope, button). */
export function tip(target: HTMLElement, spec: TipSpec | Tip): void {
  const t = typeof spec === 'string' ? { lead: spec } : spec;
  attach(target, tipHtml(t), ariaOf(t));
}

/** Kind B, terse — a plain one-line tip (the styled replacement for native title=). */
export function hint(target: HTMLElement, text: string): void {
  attach(target, esc(text), text);
}

// ── Kind A: "what the production expects", derived from the EditorContext ───────

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
