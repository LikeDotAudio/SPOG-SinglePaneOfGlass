// src/editors/vision-mixer/layout-drawer — the SCREEN LAYOUT configuration drawer.
//
// The operator's control surface over the dashboard: per-module show/hide
// checkboxes, layout presets (built-in + user-saved), a live JSON view/editor,
// and the drag-unlock toggle. Extracted from the render closure; it drives the
// shared `Dashboard` object.

import { el } from '../../ui/dom.js';
import type { Dashboard } from './dashboard.js';

/** Build the layout drawer + its toolbar toggle over the dashboard. */
export function buildLayoutDrawer(d: Dashboard): { lmDrawer: HTMLElement; lmToggle: HTMLElement } {
  const lmDrawer = el('div', { class: 'vm-drawer', style: 'display:none; padding: 16px; background: #0a0f1c; border-radius: 8px; margin-bottom: 16px; gap: 16px; flex-direction: column;' });
  const lmChecks = el('div', { style: 'display:flex; gap:16px; flex-wrap:wrap;' });
  const rebuildLmChecks = () => {
    lmChecks.replaceChildren(...Object.keys(d.modules).map(id => {
      const lbl = el('label', { style: 'cursor:pointer; display:flex; align-items:center; gap:4px; font-weight:bold; color: #cfe0ff;' }, [id.toUpperCase()]);
      const chk = el('input', { type: 'checkbox', checked: !d.layout.hidden.includes(id) }) as HTMLInputElement;
      chk.addEventListener('change', () => {
        if (chk.checked) d.layout.hidden = d.layout.hidden.filter(x => x !== id);
        else d.layout.hidden.push(id);
        d.applyLayout();
      });
      lbl.prepend(chk);
      return lbl;
    }));
  };
  rebuildLmChecks();

  const lmPresetSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  const rebuildLmPresetSel = () => {
    lmPresetSel.replaceChildren(
      el('option', { value: '' }, ['LOAD PRESET...']),
      el('option', { value: '__classic' }, ['Default (All)']),
      el('option', { value: '__compact' }, ['Compact']),
      ...Object.keys(d.userPresets).map(k => el('option', { value: k }, [k]))
    );
  };
  rebuildLmPresetSel();

  lmPresetSel.addEventListener('change', () => {
    const v = lmPresetSel.value;
    if (!v) return;
    if (v === '__classic') {
      d.layout.hidden = [];
    } else if (v === '__compact') {
      d.layout.hidden = ['macros', 'scenes', 'keyers', 'dsks', 'me', 'aux'];
    } else if (d.userPresets[v]) {
      d.layout = JSON.parse(JSON.stringify(d.userPresets[v]));
    }
    d.applyLayout();
    rebuildLmChecks();
    lmPresetSel.value = '';
  });

  const lmSaveBtn = el('button', { class: 'vm-tbtn', type: 'button' }, ['SAVE AS PRESET']);
  lmSaveBtn.addEventListener('click', () => {
    const name = prompt('Preset name:', `Layout ${Object.keys(d.userPresets).length + 1}`);
    if (!name) return;
    d.userPresets[name] = JSON.parse(JSON.stringify(d.layout));
    localStorage.setItem(d.presetsKey, JSON.stringify(d.userPresets));
    rebuildLmPresetSel();
  });

  const jsonView = el('textarea', { style: 'width: 100%; height: 150px; background: #000; color: #0f0; font-family: monospace; padding: 8px; border-radius: 8px;' }) as HTMLTextAreaElement;
  d.jsonView = jsonView;
  jsonView.value = JSON.stringify(d.layout, null, 2);

  const applyJsonBtn = el('button', { class: 'vm-tbtn', type: 'button' }, ['APPLY JSON']);
  applyJsonBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(jsonView.value);
      if (parsed && typeof parsed === 'object') {
        d.layout = parsed;
        if (!d.layout.positions) d.layout.positions = {};
        if (!d.layout.sizes) d.layout.sizes = {};
        d.applyLayout();
        rebuildLmChecks();
      }
    } catch(e) {
      alert('Invalid JSON: ' + (e as Error).message);
    }
  });

  const layoutLockBtn = el('button', { class: 'vm-tbtn', type: 'button' }, ['🔒 UNLOCK LAYOUT DRAG']);
  layoutLockBtn.addEventListener('click', () => {
    d.locked = !d.locked;
    layoutLockBtn.textContent = d.locked ? '🔒 UNLOCK LAYOUT DRAG' : '🔓 LOCK LAYOUT DRAG';
    layoutLockBtn.style.background = d.locked ? '' : 'var(--state-alarm,#ff3b3b)';
    layoutLockBtn.style.color = d.locked ? '' : '#fff';
    d.el.classList.toggle('tips-disabled', d.locked);
    Object.values(d.modules).forEach(mod => {
      mod.style.resize = d.locked ? 'none' : 'both';
    });
  });

  lmDrawer.append(
    el('div', { class: 'ed-h vm-h', style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      'SCREEN LAYOUT CONFIGURATION', layoutLockBtn
    ]),
    lmChecks,
    el('div', { style: 'display:flex; gap: 8px; margin-top: 8px;' }, [lmPresetSel, lmSaveBtn]),
    el('div', { class: 'ed-h vm-h', style: 'margin-top: 16px;' }, ['VIEW / EDIT JSON']),
    jsonView,
    el('div', { style: 'display:flex; gap: 8px; margin-top: 8px;' }, [applyJsonBtn])
  );

  const lmToggle = el('button', { class: 'vm-tbtn', type: 'button' }, ['SCREEN LAYOUT']);
  lmToggle.addEventListener('click', () => {
    lmDrawer.style.display = lmDrawer.style.display === 'none' ? 'flex' : 'none';
  });

  return { lmDrawer, lmToggle };
}
