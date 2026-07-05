// src/editors/vision-mixer/looks-scenes — M/E composite looks + scene registers.
//
// Two operator libraries, extracted from the render closure: the "M/E LOOKS" row
// (apply / SAVE a composite of the delegated bank) and the "SCENES" row (recall /
// STORE the whole switcher, plus the ⚙ toggle to the scene editor). Both build
// their own row element and a rebuild fn; all shared state comes through Surface.

import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { applyPreset, capturePreset } from './me.js';
import { captureScene, recallScene, saveUserScenes } from './scenes.js';
import { TIPS } from './tips.js';
import type { Surface } from './surface.js';

export function buildLooks(s: Surface): {
  meRow: HTMLElement;
  sceneRow: HTMLElement;
  rebuildMeRow: () => void;
  rebuildScenes: () => void;
} {
  const { def, state } = s;

  // ---- M/E LOOKS ----------------------------------------------------------------
  const meRow = el('div', { class: 'vm-transrow' });
  const meSave = el('div', { class: 'vm-btn', style: 'color: #ff9c63;' }, ['SAVE LOOK']);

  function rebuildMeRow(): void {
    meRow.replaceChildren(
      ...s.mePresets.map((p) => {
        const b = el('div', { class: 'vm-btn' }, [p.name]);
        b.addEventListener('click', () => {
          applyPreset(s.me(), p, def);
          for (const [ki, k] of s.me().keyers.entries()) {
            if (k.on && k.dve) s.flights.set(`${s.delegate}:${ki}`, { preset: s.dvePresets.find((x) => x.id === k.dve) ?? s.dvePresets[0]!, t0: performance.now() });
          }
          s.rebuildKeyers(); s.sync();
        });
        tip(b, `Apply M/E preset: ${p.name}`);
        return b;
      }),
      meSave,
    );
  }

  meSave.addEventListener('click', () => {
    const name = (prompt('Save this M/E composite as:', `LOOK ${s.mePresets.length + 1}`) || '').trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const p = capturePreset(s.me(), id, name);
    const i = s.mePresets.findIndex((x) => x.id === id);
    if (i >= 0) s.mePresets[i] = p; else s.mePresets.push(p);
    rebuildMeRow();
  });
  tip(meSave, TIPS.meEditor!);

  // ---- SCENES -------------------------------------------------------------------
  const sceneRow = el('div', { class: 'vm-transrow', style: 'position: relative;' });

  function rebuildScenes(): void {
    sceneRow.replaceChildren(
      ...s.scenes.map((sc) => {
        const b = el('button', { class: 'vm-scenebtn', type: 'button' }, [sc.name]);
        b.addEventListener('click', () => {
          recallScene(state, sc, def);
          s.publish('scene.recall', sc.name);
          s.rebuildKeyers(); s.sync();
        });
        tip(b, TIPS.scene!);
        return b;
      }),
    );
    const store = el('button', { class: 'vm-scenebtn', type: 'button' }, ['＋ STORE…']);
    store.addEventListener('click', () => {
      const name = (prompt('Store the whole switcher as scene:', `SCENE ${s.scenes.length + 1}`) || '').trim();
      if (!name) return;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const sc = captureScene(state, id, name);
      const i = s.scenes.findIndex((x) => x.id === id);
      if (i >= 0) s.scenes[i] = sc; else s.scenes.push(sc);
      saveUserScenes(s.ctx.twist.name, s.scenes.filter((x) => !def.scenes.some((d) => d.id === x.id)));
      s.publish('scene.store', name);
      rebuildScenes();
      s.rebuildSceneEditorSel();
    });
    tip(store, TIPS.sceneStore!);
    sceneRow.appendChild(store);
  }

  rebuildMeRow();
  rebuildScenes();
  return { meRow, sceneRow, rebuildMeRow, rebuildScenes };
}
