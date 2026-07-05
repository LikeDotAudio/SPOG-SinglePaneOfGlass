// src/editors/camera-control/frame — the 33ms console loop: eases fly-tos,
// integrates the velocity joystick, drives auto modes, repaints the scene / OSD /
// telemetry / scopes / maps, and streams the pose to MQTT. Extracted from index.ts.

import { clamp } from './state.js';
import type { CameraConsole } from './state.js';
import { drawSMPTE, stepDVD } from './bars.js';
import { updateMaps } from './maps.js';
import { drawParade, drawVectorscope } from '../../ui/scopes.js';

/** The robotics keys a fly-to interpolation eases between. */
const FLY_KEYS = ['pan', 'tilt', 'zoom', 'dolly', 'ped'] as const;
/** The RGB gains auto-white-balance trims toward neutral. */
const RGB_GAINS = ['rGain', 'gGain', 'bGain'] as const;

/** The scene/scope elements + control-surface syncs the loop drives each tick. */
export interface FrameDeps {
  scene: HTMLElement;
  subject: HTMLElement;
  smpte: HTMLCanvasElement;
  smpteBox: HTMLElement;
  wf: HTMLCanvasElement;
  osd: HTMLElement;
  vec: HTMLCanvasElement;
  tel: HTMLElement;
  dvd: HTMLElement;
  syncKnobs: () => void;
  placePuck: () => void;
  syncAxes: () => void;
  publishState: (force?: boolean) => void;
}

/** Build the per-frame tick (registered on ctx.dispose.interval at 33ms). */
export function makeFrame(cc: CameraConsole, deps: FrameDeps): () => void {
  const { scene, subject, smpte, smpteBox, wf, osd, vec, tel, dvd, syncKnobs, placePuck, syncAxes, publishState } = deps;
  const ui = cc.ui;
  return (): void => {
    ui.t += 0.05;
    const s = cc.S();
    if (ui.autoiris) {
      const tgt = 0.6 + Math.sin(ui.t * 0.6) * 0.05;
      s.iris += (tgt - s.iris) * 0.07;
      syncKnobs();
    }
    if (ui.autowb) {
      for (const k of RGB_GAINS) s[k] += (0.5 - s[k]) * 0.1;
      syncKnobs();
    }
    // Velocity joystick: integrate pan/tilt from the puck deflection at RATE.
    const v = ui.vel;
    if (!ui.drag) {
      v.x *= 0.55;
      v.y *= 0.55;
      if (Math.abs(v.x) < 0.004) v.x = 0;
      if (Math.abs(v.y) < 0.004) v.y = 0;
    }
    if (v.x || v.y) {
      s.pan = clamp(s.pan + v.x * s.rate * 0.02);
      s.tilt = clamp(s.tilt + v.y * s.rate * 0.02);
      placePuck();
    }
    const fly = cc.fly;
    if (fly) {
      fly.t = Math.min(1, fly.t + 0.04 * (s.rate || 1));
      const e = fly.t < 0.5 ? 2 * fly.t * fly.t : 1 - Math.pow(-2 * fly.t + 2, 2) / 2;
      for (const k of FLY_KEYS) s[k] = fly.from[k] + (fly.to[k] - fly.from[k]) * e;
      placePuck();
      syncAxes();
      if (fly.t >= 1) cc.fly = null;
    }
    scene.style.setProperty('--sx', 50 + (s.pan - 0.5) * 60 + '%');
    subject.style.setProperty('--subx', 50 - (s.pan - 0.5) * 80 + '%');
    const zs = 0.7 + s.zoom * 2.6 + s.dolly * 0.4;
    const ty = (s.tilt - 0.5) * -40 + (s.ped - 0.5) * -30;
    subject.style.transform = `translate(-50%,-50%) scale(${zs.toFixed(2)}) translateY(${ty}px)`;
    if (ui.bars) {
      drawSMPTE(smpte);
      stepDVD(dvd, smpteBox, cc.dvdState);
    }
    drawParade(wf, s, ui.bars);
    drawVectorscope(vec, s, ui.bars);
    updateMaps(cc.body, s);
    const focal = Math.round(8 + s.zoom * 280);
    const fstop = (1.8 + (1 - s.iris) * 14).toFixed(1);
    osd.innerHTML = `CAM ${ui.active + 1} &nbsp; LIVE &nbsp; f/${fstop} &nbsp; ${focal}mm`;
    tel.innerHTML =
      `Focal&nbsp; <b>${focal}mm</b><br>Iris&nbsp;&nbsp; <b>f/${fstop}</b><br>Zoom&nbsp; <b>${Math.round(s.zoom * 100)}%</b><br>` +
      `Pan&nbsp;&nbsp; <b>${Math.round((s.pan - 0.5) * 340)}°</b> &nbsp; Tilt <b>${Math.round((s.tilt - 0.5) * 120)}°</b><br>` +
      `Dolly <b>${Math.round(s.dolly * 100)}%</b> &nbsp; Ped <b>${Math.round(s.ped * 100)}%</b>`;
    // Stream the active pose — every driven axis reaches MQTT here (§4.5).
    publishState();
  };
}
