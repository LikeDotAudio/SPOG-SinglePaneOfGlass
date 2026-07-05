// src/editors/vision-mixer/scene-editor — the JSON scene-editing drawer.
//
// A power-user drawer to select / capture / hand-edit whole-switcher scene
// registers as JSON. Extracted from the render closure; the scene library and
// the scene-panel rebuild flow through `Surface`.

import { el } from '../../ui/dom.js';
import { captureScene } from './scenes.js';
import type { Surface } from './surface.js';

/**
 * Build the scene-editor drawer + its toolbar toggle. Returns `rebuildSel` so the
 * render closure can refresh the select when scenes change elsewhere.
 */
export function buildSceneEditor(s: Surface): {
  sceneEditorDrawer: HTMLElement;
  sceneEdToggle: HTMLElement;
  rebuildSel: () => void;
} {
  const sceneEditorDrawer = el('div', { class: 'vm-drawer', style: 'display:none; padding: 16px; background: #0a0f1c; border-radius: 8px; margin-bottom: 16px; gap: 16px; flex-direction: column;' });
  const sceneEdSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  const sceneEdJson = el('textarea', { style: 'width: 100%; height: 300px; background: #000; color: #0f0; font-family: monospace; padding: 8px; border-radius: 8px;' }) as HTMLTextAreaElement;
  const sceneEdApply = el('button', { class: 'vm-tbtn', type: 'button' }, ['SAVE SCENE']);
  const sceneEdCapture = el('button', { class: 'vm-tbtn', type: 'button' }, ['CAPTURE CURRENT STATE']);

  const rebuildSel = () => {
    sceneEdSel.replaceChildren(
      el('option', { value: '' }, ['-- SELECT SCENE TO EDIT --']),
      ...s.scenes.map(sc => el('option', { value: sc.id }, [sc.name]))
    );
  };
  rebuildSel();

  sceneEdSel.addEventListener('change', () => {
    const sc = s.scenes.find(x => x.id === sceneEdSel.value);
    if (sc) {
      sceneEdJson.value = JSON.stringify(sc, null, 2);
    } else {
      sceneEdJson.value = '';
    }
  });

  sceneEdCapture.addEventListener('click', () => {
    const name = prompt('Scene Name:', `SCENE ${s.scenes.length + 1}`);
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const sc = captureScene(s.state, id, name);
    sceneEdJson.value = JSON.stringify(sc, null, 2);
    sceneEdSel.value = '';
  });

  sceneEdApply.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(sceneEdJson.value);
      if (parsed && parsed.id) {
        const i = s.scenes.findIndex(x => x.id === parsed.id);
        if (i >= 0) s.scenes[i] = parsed;
        else s.scenes.push(parsed);
        s.rebuildScenes();
        rebuildSel();
        sceneEdSel.value = parsed.id;
      }
    } catch(e) {
      alert('Invalid JSON: ' + (e as Error).message);
    }
  });

  sceneEditorDrawer.append(
    el('div', { class: 'ed-h vm-h' }, ['SCENE EDITOR']),
    el('div', { style: 'display:flex; gap: 8px;' }, [sceneEdSel, sceneEdCapture]),
    sceneEdJson,
    el('div', { style: 'display:flex; gap: 8px;' }, [sceneEdApply])
  );

  const sceneEdToggle = el('button', { class: 'vm-tbtn', type: 'button' }, ['SCENE EDITOR']);
  sceneEdToggle.addEventListener('click', () => {
    sceneEditorDrawer.style.display = sceneEditorDrawer.style.display === 'none' ? 'flex' : 'none';
  });

  return { sceneEditorDrawer, sceneEdToggle, rebuildSel };
}
