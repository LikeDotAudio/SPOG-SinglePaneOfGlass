// src/editors/wysiwyg/view — DOM build + the 60fps top-down pre-viz render loop.
//
// Faithful port of js/editors/wysiwyg.js: floor grid, foot-candle heat map, beam
// cones, camera frustum, virtual talent + ray-traced shadow, and per-fixture tally
// glow. Reads only the typed context; the animation loop runs through ctx.dispose.

import type { EditorContext } from '../types.js';
import { injectWysiwygStyles } from './styles.js';
import { buildFixtures } from './state.js';
import type { UiState } from './state.js';
import { paintFrame } from './render.js';

export function renderWysiwyg(host: HTMLElement, ctx: EditorContext): void {
  injectWysiwygStyles();

  const fx = buildFixtures(ctx);
  const ui: UiState = { heat: true, beams: true, frustum: true, talentRot: 0.5 };

  host.innerHTML = `
      <div class="wy">
        <div class="wy-card" style="display:flex;flex-direction:column">
          <h4>Studio Pre-Viz · sACN / Art-Net mirror</h4>
          <div class="wy-stage"><canvas></canvas></div>
        </div>
        <div class="wy-right">
          <div class="wy-card"><h4>Overlays</h4><div class="wy-toggles">
            <div class="wy-tg on" data-t="heat">Foot-Candle Heat Map</div>
            <div class="wy-tg on" data-t="beams">Beam Cones</div>
            <div class="wy-tg on" data-t="frustum">Camera Frustum</div>
          </div><div class="wy-leg" style="margin-top:10px">LOW <i></i> HIGH</div></div>
          <div class="wy-card"><h4>Fixtures · DMX</h4><div class="wy-fx"></div></div>
          <div class="wy-card"><h4>Virtual Talent</h4>
            <div class="wy-fxr"><div class="nm">Face</div><input id="wy-rot" type="range" min="0" max="1" step="0.01" value="0.5"></div>
            <div class="wy-tag"></div>
          </div>
        </div>
      </div>`;

  const cv = host.querySelector<HTMLCanvasElement>('.wy-stage canvas');
  const tag = host.querySelector<HTMLElement>('.wy-tag');
  const fxHost = host.querySelector<HTMLElement>('.wy-fx');
  if (!cv || !tag || !fxHost) return;

  // G5 — guard the 2D context once, not per frame.
  const g = cv.getContext('2d');
  if (!g) return;

  // The three boolean overlay keys — advertised + driven over MQTT below.
  const OVERLAY_KEYS = ['heat', 'beams', 'frustum'] as const;
  const toggleEls = new Map<(typeof OVERLAY_KEYS)[number], HTMLElement>();

  host.querySelectorAll<HTMLElement>('.wy-tg').forEach((t) => {
    const key = t.dataset['t'] as (typeof OVERLAY_KEYS)[number] | undefined;
    if (key) toggleEls.set(key, t);
    t.addEventListener('click', () => {
      if (!key) return;
      ui[key] = !ui[key];
      t.classList.toggle('on', ui[key]);
      // Discrete toggle → publish un-throttled so the state edge is never coalesced.
      ctx.services.publishParam?.(key, ui[key], { throttle: false });
    });
  });

  // Keep each fixture's slider so inbound writes can reflect back into the DOM.
  const fxInputs: HTMLInputElement[] = [];
  fx.forEach((f, i) => {
    const r = document.createElement('div');
    r.className = 'wy-fxr';
    r.innerHTML = `<div class="nm">${f.k}</div><input type="range" min="0" max="1" step="0.01" value="${f.on}">`;
    const input = r.querySelector<HTMLInputElement>('input');
    if (input) {
      fxInputs[i] = input;
      input.addEventListener('input', (e) => {
        f.on = +(e.target as HTMLInputElement).value;
        // Fader drag → throttled (default) so the slider loop stays cheap.
        ctx.services.publishParam?.(`fx${i + 1}_intensity`, f.on);
      });
    }
    fxHost.appendChild(r);
  });

  const rot = host.querySelector<HTMLInputElement>('#wy-rot');
  if (rot) rot.addEventListener('input', (e) => {
    ui.talentRot = +(e.target as HTMLInputElement).value;
    ctx.services.publishParam?.('talent_rot', ui.talentRot);
  });

  // Advertise every operator-driveable control as a read/write param (audit CR.6):
  // the three overlay toggles, the talent facing, and one intensity per fixture.
  ctx.services.advertiseParams?.([
    { name: 'heat', type: 'bool', writable: true },
    { name: 'beams', type: 'bool', writable: true },
    { name: 'frustum', type: 'bool', writable: true },
    { name: 'talent_rot', type: 'number', min: 0, max: 1, writable: true },
    ...fx.map((_, i) => ({
      name: `fx${i + 1}_intensity`, type: 'number' as const, min: 0, max: 1, writable: true,
    })),
  ]);

  // Honour writes from the bus / other consoles: mutate state + reflect the control;
  // the 60fps loop repaints from ui/fx, so no explicit re-render is needed here.
  OVERLAY_KEYS.forEach((key) => {
    ctx.services.onParam?.(key, (v) => {
      ui[key] = !!v;
      toggleEls.get(key)?.classList.toggle('on', ui[key]);
    });
  });
  ctx.services.onParam?.('talent_rot', (v) => {
    if (typeof v === 'number') { ui.talentRot = v; if (rot) rot.value = String(v); }
  });
  fx.forEach((f, i) => {
    ctx.services.onParam?.(`fx${i + 1}_intensity`, (v) => {
      if (typeof v !== 'number') return;
      f.on = v;
      const inp = fxInputs[i];
      if (inp) inp.value = String(v);
    });
  });

  // Seed the retained topics with current values so late subscribers see live state.
  OVERLAY_KEYS.forEach((k) => ctx.services.publishParam?.(k, ui[k], { throttle: false }));
  ctx.services.publishParam?.('talent_rot', ui.talentRot, { throttle: false });
  fx.forEach((f, i) => ctx.services.publishParam?.(`fx${i + 1}_intensity`, f.on, { throttle: false }));

  ctx.dispose.raf(() => paintFrame(g, cv, ui, fx, tag));
}
