// src/editors/vision-mixer/buses — the PGM/PVW source buttons.
//
// rebuildBuses paints the program & preview bus rows for the delegated M/E in the
// operator-chosen layout (auto / 12+shift / 24 wide / 2×12 stack). Extracted from
// the render closure; it reads and writes shared switcher state through `Surface`.

import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { reentryOf, srcLabel } from './me.js';
import { effective } from './prefs.js';
import { TIPS } from './tips.js';
import type { Surface } from './surface.js';

/**
 * Build the bus rebuilder over the shared surface. `containers` are the two host
 * divs the program / preview rows are painted into.
 */
export function createBuses(s: Surface, containers: { pgm: HTMLElement; pvw: HTMLElement }): () => void {
  const def = s.def;

  function busButton(kind: 'pgm' | 'pvw', i: number): HTMLElement {
    const re = reentryOf(i, def);
    const input = def.inputs[i];
    const b = el('div', {
      class: `vm-btn${re !== null ? ' reentry' : ''}`,
      ...(re === null && input?.category ? { dataset: { cat: input.category } } : {}),
    }, [srcLabel(i, def)]);
    b.addEventListener('click', () => {
      s.me()[kind] = i;
      s.publish(`me.${s.delegate + 1}.${kind}`, srcLabel(i, def));
      if (s.delegate === 0) s.publish(kind, srcLabel(i, def));   // legacy alias
      s.sync();
    });
    tip(b, re !== null ? TIPS.reentry! : (kind === 'pgm' ? TIPS.busPgm! : TIPS.busPvw!));
    return b;
  }

  function rebuildBuses(): void {
    const layout = effective(def).layout;
    s.busBtns = { pgm: [], pvw: [] };
    for (const kind of ['pgm', 'pvw'] as const) {
      const bus = el('div', { class: `vm-bus ${kind}${layout === 'stack12' ? ' stack' : ''}` });
      // Which source indices this row shows. Re-entries (minus self) always ride
      // at the end; a bank never re-enters itself.
      const reentries = Array.from({ length: def.mes }, (_, m) => def.inputs.length + m)
        .filter((i) => reentryOf(i, def) !== s.delegate);
      const idx = (list: number[]): void => {
        for (const i of list) { const b = busButton(kind, i); s.busBtns[kind][i] = b; bus.appendChild(b); }
      };
      if (layout === 'shift12') {
        const bank = s.shift ? 1 : 0;
        const from = bank * 12;
        idx(Array.from({ length: Math.min(12, def.inputs.length - from) }, (_, k) => from + k));
        const sh = el('div', { class: `vm-btn shiftkey${s.shift ? ' on' : ''}` }, ['⇧']);
        sh.addEventListener('click', () => { s.shift = !s.shift; rebuildBuses(); });
        tip(sh, TIPS.shift!);
        bus.appendChild(sh);
        idx(reentries);
      } else if (layout === 'stack12') {
        const rowA = el('div', { class: 'vm-bank' }), rowB = el('div', { class: 'vm-bank' });
        def.inputs.forEach((_, i) => {
          const b = busButton(kind, i); s.busBtns[kind][i] = b;
          (i < 12 ? rowA : rowB).appendChild(b);
        });
        for (const i of reentries) { const b = busButton(kind, i); s.busBtns[kind][i] = b; rowB.appendChild(b); }
        bus.append(rowA, rowB);
      } else {
        idx(def.inputs.map((_, i) => i));
        idx(reentries);
      }

      if (kind === 'pgm') {
        containers.pgm.replaceChildren(bus);
      } else {
        containers.pvw.replaceChildren(bus);
      }
    }
    s.sync();
  }

  return rebuildBuses;
}
