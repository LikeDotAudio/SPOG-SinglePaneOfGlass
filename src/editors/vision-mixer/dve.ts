// src/editors/vision-mixer/dve — the transform engine ("digital optics", audit §6).
//
// Pure keyframe math (A→B interpolation with ease) + the DVE editor drawer. A DVE
// preset is two 3D poses and a duration; recalling it tweens A→B, the direct
// descendant of the 1981 joystick-and-keyframe workflow the audit §6.1 traces.
// The sim renders a pose as a CSS 3D transform on a keyer's picture-in-picture
// chip — sub-pixel filtering courtesy of the compositor.

import type { DVEKeyframe, DVESnapshot } from '../../model/index.js';
import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { FULL } from './schema.js';

// ---- math -------------------------------------------------------------------

export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function lerpKf(a: DVEKeyframe, b: DVEKeyframe, t: number): DVEKeyframe {
  const m = (ka: number, kb: number): number => ka + (kb - ka) * t;
  return {
    x: m(a.x, b.x), y: m(a.y, b.y), z: m(a.z, b.z), scale: m(a.scale, b.scale),
    rotX: m(a.rotX, b.rotX), rotY: m(a.rotY, b.rotY), rotZ: m(a.rotZ, b.rotZ),
  };
}

/** The pose at wall-time `now` tweening from pose `a` to `snapshot` recalled at `t0`. */
export function poseAt(a: DVEKeyframe, snapshot: DVESnapshot, t0: number, now: number): DVEKeyframe {
  const ms = snapshot.ms ?? 0;
  if (ms <= 0) return snapshot.pose;
  const t = Math.max(0, Math.min(1, (now - t0) / ms));
  return lerpKf(a, snapshot.pose, easeInOut(t));
}

/** Pose → CSS transform. Z pushes back (scales down + perspective via rotate). */
export function poseToCss(k: DVEKeyframe): string {
  const zScale = 1 - k.z / 250;                      // push-back reads as shrink
  return `translate(${k.x * 0.45}%, ${k.y * 0.45}%) ` +
    `scale(${(k.scale / 100) * zScale}) ` +
    `rotateX(${k.rotX}deg) rotateY(${k.rotY}deg) rotateZ(${k.rotZ}deg)`;
}

export function applyPose(el: HTMLElement, k: DVEKeyframe): void {
  el.style.transform = poseToCss(k);
  el.style.clipPath = k.crop ? `inset(${k.crop.t}% ${k.crop.r}% ${k.crop.b}% ${k.crop.l}%)` : 'none';
}

// ---- the DVE editor drawer ----------------------------------------------------

const AXES: ReadonlyArray<{ key: keyof DVEKeyframe; label: string; min: number; max: number; lead: string }> = [
  { key: 'x', label: 'POS X', min: -160, max: 160, lead: 'Horizontal position — % of frame off-centre.' },
  { key: 'y', label: 'POS Y', min: -120, max: 120, lead: 'Vertical position — % of frame off-centre.' },
  { key: 'z', label: 'PUSH Z', min: 0, max: 100, lead: 'Push the picture back into the room — depth.' },
  { key: 'scale', label: 'SCALE', min: 5, max: 200, lead: 'Picture size, % of full-screen.' },
  { key: 'rotX', label: 'PITCH', min: -180, max: 180, lead: 'Rotate about the horizontal axis (lean back/forward).' },
  { key: 'rotY', label: 'YAW', min: -180, max: 180, lead: 'Rotate about the vertical axis (swing left/right).' },
  { key: 'rotZ', label: 'ROLL', min: -180, max: 180, lead: 'Spin in the screen plane.' },
];

import { buildDVEStage } from './dve/stage.js';

export interface DveEditorOpts {
  snapshots(): DVESnapshot[];                    // live snapshot library
  onPreview(kf: DVEKeyframe): void;          // live-follow the sliders
  onPlay(snapshot: DVESnapshot, currentKf: DVEKeyframe): void;  // run current→snapshot on the delegated channel
  onSave(snapshot: DVESnapshot): void;           // add/replace in the library
}

/** Build the DVE editor drawer. Edits the live current pose; PLAY
 *  latches current and tweens to snapshot; SAVE AS stores a named snapshot. */
export function buildDveEditor(opts: DveEditorOpts): HTMLElement {
  let work: DVESnapshot = { ...opts.snapshots()[0]!, pose: { ...opts.snapshots()[0]!.pose } };
  let currentPose: DVEKeyframe = { ...work.pose };

  const root = el('div', { class: 'vm-drawer vm-dve' });
  const sel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  const rebuildSel = (): void => {
    sel.replaceChildren(...opts.snapshots().map((p) => el('option', { value: p.id }, [p.name])));
    sel.value = work.id;
  };
  sel.addEventListener('change', () => {
    const p = opts.snapshots().find((x) => x.id === sel.value);
    if (p) { 
      work = { ...p, pose: { ...p.pose } }; 
      currentPose = { ...p.pose };
      paint(); 
      opts.onPreview(currentPose); 
    }
  });
  tip(sel, { title: 'DVE SNAPSHOT', lead: 'A named 3D pose. Recalling it automatically animates the picture from its current position.' });

  const sliders = AXES.map((ax) => {
    const range = el('input', { class: 'vm-range', type: 'range', min: String(ax.min), max: String(ax.max) }) as HTMLInputElement;
    const val = el('span', { class: 'vm-rangeval' });
    range.addEventListener('input', () => {
      (currentPose as any)[ax.key] = +range.value;
      val.textContent = range.value;
      stage.paint(currentPose);
      opts.onPreview(currentPose);
    });
    tip(range, { title: ax.label, lead: ax.lead });
    return { ax, range, val, row: el('div', { class: 'vm-axis' }, [el('span', { class: 'vm-axislab' }, [ax.label]), range, val]) };
  });

  const ms = el('input', { class: 'vm-num', type: 'number', min: '0', max: '5000', step: '50' }) as HTMLInputElement;
  ms.addEventListener('input', () => { work.ms = Math.max(0, +ms.value || 0); });
  tip(ms, { title: 'DURATION', lead: 'Auto-animation time in milliseconds. 0 = snap straight to pose.' });

  const play = el('button', { class: 'vm-tbtn take', type: 'button' }, ['▶ PLAY']);
  play.addEventListener('click', () => {
    const currentKf = { ...currentPose };
    opts.onPlay({ ...work, pose: { ...work.pose } }, currentKf);
    // After play, the current pose *is* the work pose
    currentPose = { ...work.pose };
    paint();
  });
  tip(play, { title: 'PLAY', lead: 'Run the move live on the delegated keyer — fly the picture to this snapshot.' });

  const save = el('button', { class: 'vm-tbtn', type: 'button' }, ['SAVE AS…']);
  save.addEventListener('click', () => {
    const name = (prompt('Save DVE snapshot as:', work.name) || '').trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    opts.onSave({ ...work, id, name, pose: { ...currentPose } });
    work = { ...work, id, name, pose: { ...currentPose } };
    rebuildSel();
  });
  tip(save, { title: 'SAVE SNAPSHOT', lead: 'Store this 3D pose in the production’s DVE library.' });

  const reset = el('button', { class: 'vm-tbtn', type: 'button' }, ['RESET']);
  reset.addEventListener('click', () => { currentPose = { ...FULL }; paint(); opts.onPreview(currentPose); });
  tip(reset, { title: 'RESET', lead: 'Return to full-screen identity.' });

  const stage = buildDVEStage({
    pose: currentPose,
    onChange: (kf) => {
      currentPose = kf;
      opts.onPreview(kf);
      paintSliders();
    }
  });

  function paintSliders(): void {
    for (const s of sliders) {
      const v = Math.round((currentPose as any)[s.ax.key]);
      s.range.value = String(v);
      s.val.textContent = String(v);
    }
  }

  function paint(): void {
    paintSliders();
    ms.value = String(work.ms ?? 0);
    rebuildSel();
    stage.paint(currentPose);
  }

  root.append(
    el('div', { class: 'vm-drawerhead' }, [
      el('span', { class: 'ed-h vm-h' }, ['DVE SNAPSHOTS']),
      sel,
      el('span', { class: 'vm-axislab' }, ['MS']), ms,
      play, save, reset,
    ]),
    stage.el,
    el('details', { style: 'margin-top: 10px;' }, [
      el('summary', { style: 'cursor: pointer; color: #8fb0d0; font-size: 11px; font-weight: bold; margin-bottom: 8px;' }, ['▸ FINE TUNE']),
      el('div', { class: 'vm-axes' }, sliders.map((s) => s.row))
    ])
  );
  paint();
  return root;
}
