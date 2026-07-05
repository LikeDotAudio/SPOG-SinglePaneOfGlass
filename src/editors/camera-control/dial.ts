// src/editors/camera-control/dial — the rotary shading encoders: value
// formatting, a single draggable dial, and the full shading bank (mono column +
// RGB-Venn). Extracted from controls.ts so each file stays under the 200-line
// rule; controls.ts re-exports buildShading for its existing importer.

import { clamp } from './state.js';
import type { CamState, CameraConsole } from './state.js';
import { el } from '../../ui/dom.js';

/** Every numeric (non-`presets`) key of CamState — the set a dial can drive. */
type NumKey = Exclude<keyof CamState, 'presets'>;

export function fmt(key: keyof CamState, v: number): string {
  if (key === 'iris') return 'f/' + (1.8 + (1 - v) * 14).toFixed(1);
  if (key === 'shutter') return '1/' + Math.round(50 + v * 950);
  if (key === 'zoom') return Math.round(v * 100) + '%';
  if (/Gain|Blk|mblack|mgain|gamma/.test(key)) return (v >= 0.5 ? '+' : '') + Math.round((v - 0.5) * 200);
  return Math.round(v * 100) + '';
}

export function buildDial(cc: CameraConsole, key: NumKey, label: string, color?: string): HTMLElement {
  const wrap = el('div', { class: 'cc-kn' });
  const dial = el('div', { class: 'cc-dial' });
  dial.innerHTML = '<i class="ptr"></i>';
  if (color) dial.style.setProperty('--c', color);
  const val = el('b');
  const lab = el('span', { textContent: label });
  wrap.append(dial, val, lab);
  const paint = (): void => {
    const v = cc.S()[key];
    dial.style.setProperty('--p', v * 100 + '%');
    dial.style.setProperty('--rot', v * 270 - 135 + 'deg');
    val.textContent = fmt(key, v);
  };
  let sy = 0;
  let sv = 0;
  let dr = false;
  const start = (y: number): void => {
    dr = true;
    sy = y;
    sv = cc.S()[key];
  };
  const move = (y: number): void => {
    if (!dr) return;
    cc.S()[key] = clamp(sv + (sy - y) / 130);
    paint();
    cc.shade();
  };
  dial.addEventListener('mousedown', (e) => {
    start(e.clientY);
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => move(e.clientY));
  window.addEventListener('mouseup', () => {
    dr = false;
  });
  dial.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      if (t) start(t.clientY);
    },
    { passive: true },
  );
  window.addEventListener(
    'touchmove',
    (e) => {
      if (!dr) return;
      const t = e.touches[0];
      if (t) move(t.clientY);
    },
    { passive: true },
  );
  window.addEventListener('touchend', () => {
    dr = false;
  });
  cc.knobEls.push(paint);
  paint();
  return wrap;
}

export function buildShading(cc: CameraConsole): void {
  const mono = cc.$('.cc-mono');
  const mains: Array<[NumKey, string]> = [
    ['iris', 'Iris'],
    ['mblack', 'M.Black'],
    ['gamma', 'Gamma'],
    ['shutter', 'Shutter'],
    ['mgain', 'M.Gain'],
  ];
  mains.forEach(([k, l]) => mono.appendChild(buildDial(cc, k, l)));
  const venn = cc.$('.cc-venn');
  const place = (key: NumKey, label: string, color: string, x: number, y: number, blk?: boolean): void => {
    const slot = el('div', { class: 'slot' + (blk ? ' blk' : '') });
    slot.style.left = x + 'px';
    slot.style.top = y + 'px';
    slot.appendChild(buildDial(cc, key, label, color));
    venn.appendChild(slot);
  };
  place('rGain', 'R Gain', '#ff4d4d', 105, 52);
  place('gGain', 'G Gain', '#28e04a', 395, 52);
  place('bGain', 'B Gain', '#4d83ff', 250, 134);
  place('rBlk', 'R', '#ff7a7a', 205, 92, true);
  place('gBlk', 'G', '#74ef8a', 250, 92, true);
  place('bBlk', 'B', '#86acff', 295, 92, true);
}
