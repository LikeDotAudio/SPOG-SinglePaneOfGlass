// src/editors/camera-control/controls — the tactile control-surface builders:
// rotary encoders (incl. the RGB-Venn), the 5-axis joystick, the camera tally
// bank, presets, and the function keys. Port of js/editors/camera/controls.js,
// each taking the shared, typed CameraConsole.

import type { CameraConsole, PtzPose } from './state.js';
import { el, qs } from '../../ui/dom.js';
import { deviceEmoji } from '../../ui/sources/format.js';

// fmt / buildDial / buildShading moved to ./dial.js in the 200-line split.
// buildShading is re-exported here so index.ts's existing
// `import { buildShading } from './controls.js'` stays byte-identical.
export { buildShading } from './dial.js';

/** The PTZ axes wired to the vertical sliders / dolly rail. */
type AxisKey = 'ped' | 'zoom' | 'dolly';

export function buildJoystick(cc: CameraConsole): { placePuck: () => void; syncAxes: () => void } {
  const stick = cc.$('.cc-stick');
  const puck = qs<HTMLElement>(stick, '.puck');
  const cs = (v: number): number => Math.max(-1, Math.min(1, v)); // signed clamp
  // VELOCITY joystick: the puck shows DEFLECTION (a pan/tilt rate command), which
  // the frame loop integrates at s.rate. Released, it springs back to centre.
  const placePuck = (): void => {
    const travel = stick.getBoundingClientRect().width / 2 - 37;
    const v = cc.ui.vel;
    puck.style.left = `calc(50% + ${(v.x * travel).toFixed(1)}px)`;
    puck.style.top = `calc(50% + ${(-v.y * travel).toFixed(1)}px)`;
  };
  const setVel = (clientX: number, clientY: number): void => {
    const r = stick.getBoundingClientRect();
    const m = r.width / 2;
    const px = clientX - r.left - m;
    const py = clientY - r.top - m;
    cc.ui.vel = { x: cs(px / m), y: cs(-py / m) }; // up = +y
    placePuck();
  };
  const down = (clientX: number, clientY: number): void => {
    cc.ui.drag = true;
    stick.style.cursor = 'grabbing';
    setVel(clientX, clientY);
  };
  const up = (): void => {
    cc.ui.drag = false;
    stick.style.cursor = 'grab';
  }; // frame loop springs vel→0
  stick.addEventListener('mousedown', (e) => down(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => {
    if (cc.ui.drag) setVel(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', up);
  stick.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      if (t) down(t.clientX, t.clientY);
    },
    { passive: true },
  );
  stick.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (t) setVel(t.clientX, t.clientY);
    },
    { passive: true },
  );
  stick.addEventListener('touchend', up);

  cc.body.querySelectorAll<HTMLInputElement>('[data-ax]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const ax = inp.dataset['ax'] as AxisKey | undefined;
      if (!ax) return;
      cc.S()[ax] = parseFloat(inp.value);
    });
  });
  // RATE slider — scales how fast the PTZ pans / tilts / recalls.
  const rate = cc.$<HTMLInputElement>('.cc-rate input');
  const ratev = cc.$('.cc-ratev');
  const updRate = (): void => {
    cc.S().rate = parseFloat(rate.value);
    ratev.textContent = parseFloat(rate.value).toFixed(1) + '×';
  };
  rate.addEventListener('input', updRate);
  updRate();
  const syncAxes = (): void => {
    cc.body.querySelectorAll<HTMLInputElement>('[data-ax]').forEach((inp) => {
      const ax = inp.dataset['ax'] as AxisKey | undefined;
      if (!ax) return;
      inp.value = String(cc.S()[ax]);
    });
    rate.value = String(cc.S().rate);
    placePuck();
  };
  return { placePuck, syncAxes };
}

export function buildTally(cc: CameraConsole, names: string[], titles: string[], onSelect: () => void): () => void {
  const t = cc.$('.cc-tallies');
  for (let i = 0; i < 8; i++) {
    const name = names[i] || `CAM ${i + 1}`;
    const assigned = name !== `CAM ${i + 1}`;
    const b = el('div', {
      class: 'cc-tally' + (assigned ? ' named' : '') + (i === cc.ui.active ? ' sel' : '') + (i === 0 ? ' live' : i === 1 ? ' pvw' : ''),
      title: titles[i] || name,
    });
    b.innerHTML = `${assigned ? deviceEmoji(titles[i] || name) : ''}${name}<span class="st"></span>`;
    b.addEventListener('click', () => {
      cc.ui.active = i;
      sync();
      onSelect();
    });
    t.appendChild(b);
  }
  const sync = (): void => {
    Array.from(t.children).forEach((b, i) => b.classList.toggle('sel', i === cc.ui.active));
  };
  return sync;
}

export function buildPresets(cc: CameraConsole): () => void {
  const host = cc.$('.cc-pre');
  for (let i = 0; i < 6; i++) {
    const k = el('div', { class: 'cc-key', textContent: 'P' + (i + 1) });
    k.addEventListener('click', () => {
      const s = cc.S();
      const pose: PtzPose = { pan: s.pan, tilt: s.tilt, zoom: s.zoom, dolly: s.dolly, ped: s.ped };
      if (cc.ui.pendingSave) {
        s.presets[i] = pose;
        cc.ui.pendingSave = false;
        cc.$('[data-act="save"]').classList.remove('on');
        sync();
      } else {
        const p = s.presets[i];
        if (p) cc.fly = { from: pose, to: p, t: 0 };
      }
    });
    host.appendChild(k);
  }
  const sync = (): void => {
    Array.from(host.children).forEach((k, i) => k.classList.toggle('set', !!cc.S().presets[i]));
  };
  return sync;
}

export function buildFunctions(cc: CameraConsole, syncKnobs: () => void): void {
  cc.body.querySelectorAll<HTMLElement>('.cc-key[data-act]').forEach((k) =>
    k.addEventListener('click', () => {
      const a = k.dataset['act'];
      const s = cc.S();
      const glass = cc.$('.cc-glass');
      if (a === 'bars') {
        cc.ui.bars = !cc.ui.bars;
        k.classList.toggle('on', cc.ui.bars);
        qs(glass, '.cc-smpte').classList.toggle('on', cc.ui.bars);
        qs(glass, '.cc-dvd').classList.toggle('on', cc.ui.bars);
        qs(glass, '.cc-wf-tag').textContent = cc.ui.bars ? 'RGB PARADE · COLOUR BARS' : 'RGB PARADE · IRE';
      } else if (a === 'autoiris') {
        cc.ui.autoiris = !cc.ui.autoiris;
        k.classList.toggle('on', cc.ui.autoiris);
      } else if (a === 'wb') {
        s.rGain = 0.5;
        s.gGain = 0.5;
        s.bGain = 0.5;
        syncKnobs();
      } else if (a === 'save') {
        cc.ui.pendingSave = !cc.ui.pendingSave;
        k.classList.toggle('on', cc.ui.pendingSave);
      } else if (a === 'path') {
        cc.ui.rec = !cc.ui.rec;
        k.classList.toggle('on', cc.ui.rec);
        qs(glass, '.cc-rec').classList.toggle('on', cc.ui.rec);
      } else if (a === 'lookat') {
        k.classList.toggle('on');
      }
    }),
  );
}
