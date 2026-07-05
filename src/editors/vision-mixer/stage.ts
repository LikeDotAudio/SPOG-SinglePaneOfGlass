// src/editors/vision-mixer/stage — the PGM | T-bar | PVW monitor stage.
//
// Pure presentational DOM: the program & preview monitors (feed / source / PIP
// hosts), the bus containers, the DSK strip and the T-bar control. No state, no
// handlers — the render closure wires behaviour onto the returned refs (the T-bar
// input handler, sync updates, RAF flight chips). Extracted from the closure.

import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { TIPS } from './tips.js';

export interface Stage {
  pgmFeed: HTMLElement;
  pgmSrc: HTMLElement;
  pgmPips: HTMLElement;
  pgmBusContainer: HTMLElement;
  pvwFeed: HTMLElement;
  pvwSrc: HTMLElement;
  pvwPips: HTMLElement;
  pvwMon: HTMLElement;
  pvwBusContainer: HTMLElement;
  busesMod: HTMLElement;
  dskRow: HTMLElement;
  pgmFeedNext: HTMLElement;
  pgmMon: HTMLElement;
  tbar: HTMLInputElement;
  pct: HTMLElement;
  tbarWrap: HTMLElement;
}

/** Build the monitor stage + T-bar. All refs are returned for the closure to drive. */
export function buildStage(): Stage {
  const pgmFeed = el('div', { class: 'vm-feed' });
  const pgmSrc = el('span', { class: 'vm-src' });
  const pgmPips = el('div');
  const pgmBusContainer = el('div');

  const pvwFeed = el('div', { class: 'vm-feed' });
  const pvwSrc = el('span', { class: 'vm-src' });
  const pvwPips = el('div');
  const pvwMon = el('div', { class: 'vm-mon pvw', style: 'flex: none; aspect-ratio: auto; width: 300px; height: 300px; min-width: 150px; min-height: 150px;' }, [
    el('span', { class: 'vm-tag' }, ['PREVIEW']), pvwSrc, pvwFeed, pvwPips,
  ]);
  tip(pvwMon, TIPS.pvwMon!);

  const pvwBusContainer = el('div');

  const busesMod = el('div', { class: 'vm-sec', style: 'flex: 1 1 auto; min-width: 300px; max-width: 100%; padding-bottom: 24px;' }, [
    el('p', { class: 'ed-h' }, ['PROGRAM BUS']), pgmBusContainer,
    el('p', { class: 'ed-h', style: 'margin-top: 16px;' }, ['PREVIEW BUS']), pvwBusContainer
  ]);

  const dskRow = el('div', { class: 'vm-dskrow' });
  const pgmFeedNext = el('div', { class: 'vm-feed', style: 'position:absolute; inset:0; opacity:0; pointer-events:none; z-index:1;' });
  const pgmMon = el('div', { class: 'vm-mon pgm', style: 'flex: none; aspect-ratio: auto; width: 300px; height: 300px; min-width: 150px; min-height: 150px;' }, [
    el('span', { class: 'vm-tag' }, ['PROGRAM']), pgmSrc, pgmFeed, pgmFeedNext, pgmPips, dskRow,
  ]);
  tip(pgmMon, TIPS.pgmMon!);

  const tbar = el('input', { class: 'vm-tbar', type: 'range', min: '0', max: '100', value: '0' }) as HTMLInputElement;
  const pct = el('div', { class: 'vm-pct' }, ['0%']);
  tip(tbar, TIPS.tbar!);
  const tbarWrap = el('div', { class: 'vm-tbar-wrap' }, [
    el('p', { class: 'ed-h vm-h' }, ['T-BAR']),
    el('div', { class: 'vm-tbar-stage' }, [
      el('div', { class: 'vm-tbar-ends' }, [
        el('span', { class: 'pvw' }, ['PVW ▲']), el('span', { class: 'pgm' }, ['PGM ▼']),
      ]),
      tbar,
    ]),
    pct,
  ]);

  return {
    pgmFeed, pgmSrc, pgmPips, pgmBusContainer,
    pvwFeed, pvwSrc, pvwPips, pvwMon, pvwBusContainer, busesMod,
    dskRow, pgmFeedNext, pgmMon, tbar, pct, tbarWrap,
  };
}
