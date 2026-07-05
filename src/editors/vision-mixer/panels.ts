// src/editors/vision-mixer/panels — small self-contained panel builders.
//
// Pure-ish DOM factories lifted out of the render closure: the AUX router panel
// and the MACRO record/play row. Each takes the shared `Surface` and returns the
// element(s) the console assembly and sync loop need.

import { el } from '../../ui/dom.js';
import { srcLabel } from './me.js';
import type { Surface } from './surface.js';

/** The AUX panel: one source select per aux bus. Returns the selects for sync. */
export function buildAuxRow(s: Surface): { auxRow: HTMLElement; auxSelects: HTMLSelectElement[] } {
  const def = s.def;
  const auxRow = el('div', { class: 'vm-transrow', style: 'flex-direction: column; align-items: stretch; gap: 8px;' });
  const auxSelects: HTMLSelectElement[] = [];
  s.state.auxes.forEach((_, i) => {
    const row = el('div', { style: 'display: flex; gap: 8px; align-items: center;' });
    row.append(el('span', { class: 'ed-h', style: 'margin: 0; min-width: 50px;' }, [`AUX ${i + 1}`]));

    const srcSel = el('select', { class: 'vm-sel', style: 'flex: 1' }) as HTMLSelectElement;
    s.allLabels.forEach((l, idx) => srcSel.append(el('option', { value: String(idx) }, [l])));
    srcSel.value = String(s.state.auxes[i]);

    srcSel.addEventListener('change', () => {
      s.state.auxes[i] = +srcSel.value;
      s.publish(`aux.${i + 1}.source`, srcLabel(+srcSel.value, def));
      s.sync();
    });
    auxSelects.push(srcSel);
    row.append(srcSel);
    auxRow.append(row);
  });
  return { auxRow, auxSelects };
}

/** The MACRO row: record / select / play over the surface's macro recorder. */
export function buildMacroRow(s: Surface): { macroRow: HTMLElement } {
  const macroRow = el('div', { class: 'vm-transrow' });
  const recBtn = el('button', { class: 'vm-tbtn', type: 'button', style: 'color: #f55' }, ['⏺ RECORD']);
  const macroSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  const playBtn = el('button', { class: 'vm-tbtn', type: 'button' }, ['▶ PLAY']);
  const rebuildMacroSel = () => { macroSel.replaceChildren(...s.macroRecorder.macros.map(m => el('option', { value: m.id }, [m.name]))); };
  rebuildMacroSel();

  recBtn.addEventListener('click', () => {
    if (s.macroRecorder.recording) {
      s.macroRecorder.stopRecording();
      recBtn.textContent = '⏺ RECORD';
      rebuildMacroSel();
    } else {
      const name = prompt('Macro name:', `MACRO ${s.macroRecorder.macros.length + 1}`);
      if (!name) return;
      s.macroRecorder.startRecording(name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name);
      recBtn.textContent = '⏹ STOP';
    }
  });

  playBtn.addEventListener('click', () => {
    if (macroSel.value) s.macroRecorder.playMacro(macroSel.value, s.rawPublish);
  });
  macroRow.append(recBtn, macroSel, playBtn);
  return { macroRow };
}
