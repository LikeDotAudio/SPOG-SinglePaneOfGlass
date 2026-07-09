// src/editors/vision-mixer/preroute — the graphics PRE-ROUTE panel.
//
// The control room's graphics are HARD-WIRED into the switcher (each DSK ships with
// a fixed `def.dsks[i].source`) and are always present. This panel is the operator's
// way to *shift* which graphic feeds each downstream keyer AFTER it's presented —
// the M/E has no native way to re-route these, so it sits as its own module beside
// the M/E. Choosing a source stamps `state.dskSrc[i]` and relabels the DSK button.
//
// A source is flagged ⬡ GFX when it is one of the switcher's hard-wired graphics
// inputs (the pool positions the DSKs default to).

import { el } from '../../ui/dom.js';
import { srcLabel } from './me.js';
import type { Surface } from './surface.js';

const srcOf = (d: { source?: number }): number => d.source ?? 0;

/** The set of input indices that are the switcher's hard-wired graphics feeds. */
export function graphicsInputs(s: Surface): Set<number> {
  return new Set(s.def.dsks.map(srcOf));
}

/** Effective source feeding DSK i (operator override, else the hard-wired default). */
export function dskSource(s: Surface, i: number): number {
  return s.state.dskSrc?.[i] ?? srcOf(s.def.dsks[i]!);
}

/** Label for a DSK button: its name, plus the re-routed feed when shifted off default. */
export function dskLabel(s: Surface, i: number): string {
  const d = s.def.dsks[i]!;
  const eff = dskSource(s, i);
  const head = d.name.split('·')[0]!.trim();
  return eff === srcOf(d) ? d.name : `${head} ⟵ ${srcLabel(eff, s.def)}`;
}

/** Build the PRE-ROUTE panel: one graphic→DSK source select per downstream keyer. */
export function buildPreRoute(
  s: Surface,
  dskBtns: HTMLElement[],
): { preRow: HTMLElement; preSelects: HTMLSelectElement[] } {
  const def = s.def;
  const gfx = graphicsInputs(s);
  if (!s.state.dskSrc) s.state.dskSrc = def.dsks.map(srcOf);

  const preRow = el('div', { class: 'vm-transrow', style: 'flex-direction:column;align-items:stretch;gap:8px;' });
  preRow.append(el('p', { class: 'ed-h', style: 'margin:0 0 2px;opacity:.7;font-size:10px;' },
    ['⬡ control-room graphics are hard-wired — shift which one feeds each DSK']));
  const preSelects: HTMLSelectElement[] = [];

  def.dsks.forEach((d, i) => {
    const row = el('div', { style: 'display:flex;gap:8px;align-items:center;' });
    row.append(el('span', { class: 'ed-h', style: 'margin:0;min-width:52px;' }, [`DSK ${i + 1}`]));

    const sel = el('select', { class: 'vm-sel', style: 'flex:1;' }) as HTMLSelectElement;
    s.allLabels.forEach((l, idx) => sel.append(el('option', { value: String(idx) }, [`${gfx.has(idx) ? '⬡ ' : ''}${l}`])));
    sel.value = String(dskSource(s, i));
    sel.addEventListener('change', () => {
      (s.state.dskSrc ??= def.dsks.map(srcOf))[i] = +sel.value;
      dskBtns[i]!.textContent = dskLabel(s, i);
      s.publish(`dsk.${i + 1}.source`, srcLabel(+sel.value, def));
      s.sync();
    });
    preSelects.push(sel);
    row.append(sel);
    preRow.append(row);
  });
  return { preRow, preSelects };
}
