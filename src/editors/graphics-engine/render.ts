// src/editors/graphics-engine/render — the RENDERER (Layer 4, DOM form).
//
// Pure: (kind, values, reveal) → an .gfx-graphic element. The stage adds `.on`
// to trigger the CSS animate-IN; only transform/opacity animate (GPU-friendly).
// Split out of templates.ts (audit §4.6) — the catalog stays the design layer;
// this is the DOM builder. templates.ts re-exports these so consumers are stable.

import { el } from '../../ui/dom.js';
import { weatherBody } from './weather-module.js';
import type { GfxTemplate, Values } from './templates.js';

const lines = (v: string | undefined): string[] =>
  (v ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

/** Split a credit-roll text into cards on a "----" separator line (≥3 dashes). */
const cardsOf = (v: string | undefined): string[] =>
  (v ?? '').split(/\n\s*-{3,}\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);

export function renderGraphic(tpl: GfxTemplate, values: Values, reveal: number): HTMLElement {
  const g = el('div', { class: `gfx-graphic gfx-${tpl.kind}` });
  switch (tpl.kind) {
    case 'lower-third': {
      g.append(
        el('div', { class: 'gfx-l3-plate' }, [
          el('div', { class: 'gfx-l3-name' }, [values.name || '']),
          el('div', { class: 'gfx-l3-title' }, [values.title || '']),
        ]),
      );
      break;
    }
    case 'name-super': {
      g.append(
        el('div', { class: 'gfx-l3-plate gfx-l3-3tier' }, [
          el('div', { class: 'gfx-l3-name' }, [values.name || '']),
          el('div', { class: 'gfx-l3-title' }, [values.title || '']),
          el('div', { class: 'gfx-l3-loc' }, [values.locator || '']),
        ]),
      );
      break;
    }
    case 'up-next': {
      const panel = el('div', { class: 'gfx-list-panel' }, [
        el('div', { class: 'gfx-list-head' }, [values.heading || 'COMING UP']),
      ]);
      lines(values.items).slice(0, reveal).forEach((txt, i) => {
        panel.append(el('div', { class: 'gfx-list-row', style: `--i:${i}` }, [
          el('span', { class: 'gfx-list-dot' }), el('span', {}, [txt]),
        ]));
      });
      g.append(panel);
      break;
    }
    case 'participant': {
      const panel = el('div', { class: 'gfx-list-panel gfx-people' }, [
        el('div', { class: 'gfx-list-head' }, [values.heading || 'PARTICIPANTS']),
      ]);
      lines(values.people).slice(0, reveal).forEach((line, i) => {
        const [name, role] = line.split('|').map((s) => s.trim());
        panel.append(el('div', { class: 'gfx-person-row', style: `--i:${i}` }, [
          el('div', { class: 'gfx-headshot' }, [(name || '?').charAt(0)]),
          el('div', { class: 'gfx-person-txt' }, [
            el('b', {}, [name || '']), el('span', {}, [role || '']),
          ]),
        ]));
      });
      g.append(panel);
      break;
    }
    case 'bug': {
      g.append(el('div', { class: 'gfx-bug-box' }, [
        el('b', {}, [values.text || 'BUG']),
        el('span', { class: 'gfx-bug-sub' }, [values.sub || '']),
      ]));
      break;
    }
    case 'ticker': {
      const els = lines(values.text);
      const sep = values.sep ?? '•';
      const gap = Math.max(0, parseInt(values.gap ?? '', 10) || 0);
      const crawl = el('div', { class: 'gfx-ticker-crawl' });
      els.forEach((txt, i) => {
        if (i > 0 && sep) crawl.append(el('span', { class: 'gfx-crawl-sep', style: `margin:0 ${gap}px` }, [sep]));
        crawl.append(el('span', { class: 'gfx-crawl-el' }, [txt]));
      });
      g.append(
        el('div', { class: 'gfx-ticker-bar' }, [
          el('div', { class: 'gfx-ticker-tag' }, [values.tag || 'NEWS']),
          el('div', { class: 'gfx-ticker-track' }, [crawl]),
        ]),
      );
      break;
    }
    case 'credits': {
      const cards = cardsOf(values.credits);
      const idx = Math.min(Math.max(0, reveal - 1), Math.max(0, cards.length - 1));
      const card = el('div', { class: 'gfx-credit-card' });
      lines(cards[idx]).forEach((ln) => {
        if (ln.includes('|')) {
          const [role, name] = ln.split('|').map((s) => s.trim());
          card.append(el('div', { class: 'gfx-credit-row' }, [
            el('span', { class: 'gfx-credit-role' }, [role || '']),
            el('span', { class: 'gfx-credit-lead' }),
            el('span', { class: 'gfx-credit-name' }, [name || '']),
          ]));
        } else {
          card.append(el('div', { class: 'gfx-credit-line' }, [ln]));
        }
      });
      g.append(card);
      break;
    }
    case 'fullscreen': {
      g.append(el('div', { class: 'gfx-fs' }, [
        el('div', { class: 'gfx-fs-title' }, [values.title || '']),
        el('div', { class: 'gfx-fs-sub' }, [values.subtitle || '']),
      ]));
      break;
    }
    case 'weather': {
      g.append(weatherBody(values));
      break;
    }
    case 'score': {
      g.append(el('div', { class: 'gfx-score' }, [
        el('div', { class: 'gfx-score-team' }, [
          el('span', { class: 'gfx-score-name' }, [values.home || 'HOME']),
          el('span', { class: 'gfx-score-pts' }, [values.homeScore || '0']),
        ]),
        el('div', { class: 'gfx-score-clock' }, [values.clock || '']),
        el('div', { class: 'gfx-score-team' }, [
          el('span', { class: 'gfx-score-pts' }, [values.awayScore || '0']),
          el('span', { class: 'gfx-score-name' }, [values.away || 'AWAY']),
        ]),
      ]));
      break;
    }
  }
  return g;
}

/** How many reveal-states a template has (for NEXT). Lists = row count; else 1. */
export function stateCount(tpl: GfxTemplate, values: Values): number {
  if (tpl.kind === 'up-next') return Math.max(1, lines(values.items).length);
  if (tpl.kind === 'participant') return Math.max(1, lines(values.people).length);
  if (tpl.kind === 'credits') return Math.max(1, cardsOf(values.credits).length);
  return 1;
}
