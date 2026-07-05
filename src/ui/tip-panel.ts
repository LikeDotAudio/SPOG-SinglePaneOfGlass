// src/ui/tip-panel — the one tip panel and the `attach` service behind it.
//
// A single pointer-following overlay exists for the whole app; every target shares
// it. `attach` binds the mouse/focus/touch listeners once per element and reads the
// latest content from a WeakMap, so re-binding the reused overlay title is a no-op
// beyond updating what it shows. `esc` (HTML-escape) is shared by both tip kinds.

import { addStyles, el } from './dom.js';

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
export const esc = (s: string): string =>
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

let delayTimer: ReturnType<typeof setTimeout> | null = null;
function clearDelay() { if (delayTimer) { clearTimeout(delayTimer); delayTimer = null; } }

export function attach(target: HTMLElement, html: string, aria: string): void {
  content.set(target, { html, aria });
  target.setAttribute('aria-label', aria);
  target.classList.add('has-tip');
  if (bound.has(target)) return;
  bound.add(target);
  const cur = (): { html: string; aria: string } | undefined => content.get(target);

  target.addEventListener('mouseenter', (e) => {
    clearDelay();
    if (target.closest('.tips-disabled')) {
      delayTimer = setTimeout(() => {
        const c = cur(); if (c) { show(c.html); place(e.clientX, e.clientY); }
      }, 5000);
      return;
    }
    const c = cur(); if (c) { show(c.html); place(e.clientX, e.clientY); }
  });

  target.addEventListener('mousemove', (e) => { if (panel?.classList.contains('open')) place(e.clientX, e.clientY); });

  target.addEventListener('mouseleave', () => { clearDelay(); hide(); });

  // Keyboard: if the element is focusable, reading its tip on focus is free a11y.
  target.addEventListener('focus', () => {
    clearDelay();
    if (target.closest('.tips-disabled')) {
      delayTimer = setTimeout(() => {
        const c = cur(); if (c) { show(c.html); const r = target.getBoundingClientRect(); place(r.left, r.bottom); }
      }, 5000);
      return;
    }
    const c = cur(); if (c) { show(c.html); const r = target.getBoundingClientRect(); place(r.left, r.bottom); }
  });

  target.addEventListener('blur', () => { clearDelay(); hide(); });

  // Touch console: tap shows the tip near the finger; it clears on the next tap.
  target.addEventListener('touchstart', (e) => {
    clearDelay();
    const t = e.touches[0];
    if (!t) return;
    const x = t.clientX, y = t.clientY;
    if (target.closest('.tips-disabled')) {
      delayTimer = setTimeout(() => {
        const c = cur();
        if (c && !panel?.classList.contains('open')) { show(c.html); place(x, y); }
      }, 5000);
      return;
    }
    const c = cur();
    if (c && !panel?.classList.contains('open')) { show(c.html); place(x, y); }
  }, { passive: true });
}
