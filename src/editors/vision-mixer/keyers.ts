// src/editors/vision-mixer/keyers — the delegated-M/E keyer row.
//
// rebuildKeyers paints one button per keyer of the delegated bank, each with a
// hold-to-open drawer (type / source / DVE preset) and a SPLIT M/E toggle.
// Extracted from the render closure; shared state flows through `Surface`.

import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { reentryOf, srcLabel, KEYER_TYPES } from './me.js';
import { TIPS } from './tips.js';
import type { Surface } from './surface.js';

/** Build the keyer-row rebuilder over the shared surface. */
export function createKeyers(s: Surface, keyerRow: HTMLElement): () => void {
  const def = s.def;

  function rebuildKeyers(): void {
    keyerRow.replaceChildren(...s.me().keyers.map((k, ki) => {
      const wrapper = el('div', { style: 'position: relative; display: flex; flex-direction: column; gap: 4px;' });
      const b = el('div', { class: `vm-key${k.on ? ' on' : ''}` }, [
        `KEY ${ki + 1} · ${k.type.toUpperCase()}`,
      ]);

      const paramRow = el('div', { class: 'vm-drawer', style: 'position: absolute; top: 100%; left: 0; z-index: 50; width: max-content; margin-top: 5px; flex-direction: column; align-items: stretch; gap: 4px; background: #17233c; padding: 6px; border-radius: 8px;' });
      paramRow.style.display = (s.activeKeyerParam === ki) ? 'flex' : 'none';

      const typeSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
      for (const t of KEYER_TYPES) typeSel.append(el('option', { value: t }, [t.toUpperCase()]));
      typeSel.value = k.type;
      typeSel.addEventListener('change', () => { k.type = typeSel.value as typeof k.type; s.publish(`me.${s.delegate + 1}.key.${ki + 1}.type`, k.type); rebuildKeyers(); });

      const srcSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
      s.allLabels.forEach((l, i) => { if (reentryOf(i, def) !== s.delegate) srcSel.append(el('option', { value: String(i) }, [l])); });
      srcSel.value = String(k.source);
      srcSel.addEventListener('change', () => { k.source = +srcSel.value; s.publish(`me.${s.delegate + 1}.key.${ki + 1}.source`, srcLabel(k.source, def)); s.sync(); });

      const dveSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
      dveSel.append(el('option', { value: '' }, ['DVE · NONE']));
      for (const p of s.dvePresets) dveSel.append(el('option', { value: p.id }, [p.name]));
      dveSel.value = k.dve ?? '';
      dveSel.addEventListener('change', () => {
        if (dveSel.value) k.dve = dveSel.value; else delete k.dve;
        s.publish(`me.${s.delegate + 1}.key.${ki + 1}.dve`, dveSel.value || 'none');
        if (k.dve) s.flights.set(`${s.delegate}:${ki}`, { preset: s.dvePresets.find((p) => p.id === k.dve)!, t0: performance.now() });
        s.sync();
      });

      paramRow.append(
        el('span', { class: 'ed-h vm-h' }, [`KEYER ${ki + 1}`]),
        typeSel, srcSel, dveSel
      );

      let holdTimer: ReturnType<typeof setTimeout>;
      let held = false;
      b.addEventListener('pointerdown', () => {
        held = false;
        holdTimer = setTimeout(() => {
          held = true;
          s.activeKeyerParam = (s.activeKeyerParam === ki) ? null : ki;
          if (s.activeKeyerParam === ki) s.dveTargetKeyer = ki;
          rebuildKeyers();
        }, 500);
      });
      b.addEventListener('pointerup', () => clearTimeout(holdTimer));
      b.addEventListener('pointerleave', () => clearTimeout(holdTimer));
      b.addEventListener('pointercancel', () => clearTimeout(holdTimer));

      b.addEventListener('click', () => {
        if (held) return;
        k.on = !k.on;
        if (k.on && k.dve) s.flights.set(`${s.delegate}:${ki}`, { preset: s.dvePresets.find((p) => p.id === k.dve) ?? s.dvePresets[0]!, t0: performance.now() });
        s.publish(`me.${s.delegate + 1}.key.${ki + 1}.on`, k.on);
        s.sync();
      });

      tip(b, TIPS.keyer!);
      wrapper.append(b, paramRow);
      return wrapper;
    }));
    const splitBtn = el('div', { class: `vm-key split${s.me().split ? ' on' : ''}` }, ['SPLIT M/E']);
    splitBtn.addEventListener('click', () => { s.me().split = !s.me().split; rebuildKeyers(); s.sync(); });
    tip(splitBtn, 'Partition this M/E into two independently-keyed halves.');
    keyerRow.appendChild(splitBtn);
  }

  return rebuildKeyers;
}
