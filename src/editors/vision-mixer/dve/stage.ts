import { el } from '../../../ui/dom.js';
import type { DVEKeyframe, DVEPreset } from '../../../model/index.js';
import { applyPose } from '../dve.js';

export interface StageOpts {
  preset: DVEPreset;
  editing: 'a' | 'b';
  onChange: (kf: DVEKeyframe) => void;
}

export function buildDVEStage(opts: StageOpts) {
  const root = el('div', { class: 'vm-dve-stage' });
  const container = el('div', { class: 'vm-dve-frame' });
  const ghost = el('div', { class: 'vm-pip ghost' }, ['A']);
  const solid = el('div', { class: 'vm-pip solid' });
  
  // Create 4 corner scale handles
  const corners = ['tl', 'tr', 'bl', 'br'].map(pos => {
    const handle = el('div', { class: `vm-handle corner ${pos}`, dataset: { pos } });
    solid.append(handle);
    return handle;
  });

  // Move body
  const body = el('div', { class: 'vm-move-body' }, ['B (LIVE)']);
  solid.append(body);

  container.append(ghost, solid);
  root.append(container);

  let activeTarget: 'move' | 'tl' | 'tr' | 'bl' | 'br' | null = null;
  let startX = 0, startY = 0;
  let kfStart = { x: 0, y: 0, scale: 100 };
  let kfRef: DVEKeyframe;

  root.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('vm-move-body')) activeTarget = 'move';
    else if (target.classList.contains('vm-handle')) activeTarget = target.dataset['pos'] as any;
    else return;

    startX = e.clientX;
    startY = e.clientY;
    kfRef = opts.preset[opts.editing];
    kfStart = { x: kfRef.x, y: kfRef.y, scale: kfRef.scale };
    root.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  root.addEventListener('pointermove', (e) => {
    if (!activeTarget) return;
    
    // Calculate deltas in percentage of frame
    const rect = container.getBoundingClientRect();
    const dx = ((e.clientX - startX) / rect.width) * 200; // -100 to 100 domain
    const dy = ((e.clientY - startY) / rect.height) * 200;
    
    if (activeTarget === 'move') {
      kfRef.x = kfStart.x + dx;
      kfRef.y = kfStart.y + dy;
    } else {
      // Corner scaling (uniform)
      const isRight = activeTarget === 'tr' || activeTarget === 'br';
      const isBottom = activeTarget === 'bl' || activeTarget === 'br';
      
      const scaleDx = isRight ? dx : -dx;
      const scaleDy = isBottom ? dy : -dy;
      // Proportional scale driven by primary axis (x for simplicity, or max of both)
      const scaleDelta = (scaleDx + scaleDy) / 2;
      
      let newScale = Math.max(5, Math.min(200, kfStart.scale + scaleDelta));
      const scaleDiff = newScale - kfStart.scale;
      kfRef.scale = newScale;
      
      // Opposite-anchor compensation (approximate for the P0 audit requirement)
      // Moving a corner should ideally hold the opposite corner in place.
      kfRef.x = kfStart.x + (isRight ? scaleDiff / 2 : -scaleDiff / 2);
      kfRef.y = kfStart.y + (isBottom ? scaleDiff / 2 : -scaleDiff / 2);
    }
    
    opts.onChange(kfRef);
  });

  root.addEventListener('pointerup', (e) => {
    activeTarget = null;
    root.releasePointerCapture(e.pointerId);
  });

  function paint(preset: DVEPreset, editing: 'a' | 'b') {
    opts.preset = preset;
    opts.editing = editing;
    applyPose(ghost, preset.a);
    applyPose(solid, preset.b);
    
    if (editing === 'a') {
      ghost.classList.add('armed');
      solid.classList.remove('armed');
      solid.style.pointerEvents = 'none';
      ghost.style.pointerEvents = 'auto';
      // To edit A, we swap the handle mounts to A
      ghost.append(...corners, body);
      body.textContent = 'A (START)';
    } else {
      solid.classList.add('armed');
      ghost.classList.remove('armed');
      ghost.style.pointerEvents = 'none';
      solid.style.pointerEvents = 'auto';
      solid.append(...corners, body);
      body.textContent = 'B (LIVE)';
    }
  }

  paint(opts.preset, opts.editing);

  return { el: root, paint };
}
