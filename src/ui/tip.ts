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
//
// This file is the BARREL: the panel/attach plumbing lives in ./tip-panel and the
// Kind-A expectation builders in ./tip-expectation; both are re-exported here so
// every importer keeps loading the same names from './tip'.

import { attach, esc } from './tip-panel.js';
import type { TipSpec } from '../model/index.js';

export * from './tip-panel.js';
export * from './tip-expectation.js';

/** The structured form of a Kind-B tip (a bare string is shorthand for {lead}). */
export interface Tip { title?: string; lead: string; good?: string; bad?: string }

function tipHtml(t: Tip): string {
  return (t.title ? `<b>${esc(t.title)}</b>` : '')
    + (t.title ? `<span class="r">${esc(t.lead)}</span>` : esc(t.lead))
    + (t.good ? `<span class="r g">✓ ${esc(t.good)}</span>` : '')
    + (t.bad ? `<span class="r bad">✕ ${esc(t.bad)}</span>` : '');
}
function ariaOf(t: Tip): string {
  return [t.title, t.lead, t.good && `Good: ${t.good}`, t.bad && `Bad: ${t.bad}`].filter(Boolean).join('. ');
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
