// src/editors/lighting/view — the DMX console render (data-in, no DOM scraping).
//
// Faithful port of js/editors/lighting.js render(): the top-down rig diagram with
// clickable fixtures, the LED fixture strips (intensity + colour-temp sliders),
// the live subject beam, and the scenes/cues panel. Animation (the DMX heartbeat)
// is registered on ctx.dispose so the host tears it down on close.
//
// Every operator-driven control is advertised + published as an R/W MQTT param so
// an external lighting controller / another console can drive the rig too: per-
// fixture intensity (%) + colour temp (K), scene recall, and cue triggers.

import { addStyles, qs, el } from '../../ui/dom.js';
import type { EditorContext } from '../types.js';
import { CSS } from './styles.js';
import { initialFixtures, SCENES, CUES, tempK } from './state.js';

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
/** Invert tempK() — map a Kelvin value back onto the 0..1 colour-temp slider. */
const kToTemp = (k: number): number => clamp((k - 3200) / 2400, 0, 1);

export function renderLighting(host: HTMLElement, ctx: EditorContext): void {
  addStyles('lt-styles', CSS);
  const st = initialFixtures();
  let sel = 0;

  host.innerHTML = `
      <div class="lt">
        <div class="lt-card" style="display:flex;flex-direction:column">
          <h4>Three / Four-Point Rig · Top-Down</h4>
          <div class="lt-stage"><div class="lt-beam"></div><div class="lt-subj"></div></div>
        </div>
        <div class="lt-rcol">
          <div class="lt-card lt-strips">
            <h4>LED Fixtures · DMX</h4>
            <div class="lt-list"></div>
            <div class="lt-dmx"></div>
          </div>
          <div class="lt-card">
            <h4>Scenes · Recall · Cues</h4>
            <div class="lt-scenes"></div>
            <div class="lt-cues"></div>
          </div>
        </div>
      </div>`;

  const stage = qs(host, '.lt-stage');
  const beam = qs(host, '.lt-beam');
  const list = qs(host, '.lt-list');
  const dmx = qs(host, '.lt-dmx');

  const fixEls = st.map((f, i) => {
    const e = el('div', { class: 'lt-fix', style: `left:${f.x}%;top:${f.y}%` });
    e.innerHTML = `${f.k}<div class="lbl">${f.sub}</div>`;
    e.addEventListener('click', () => {
      sel = i;
      paintSel();
    });
    stage.appendChild(e);
    return e;
  });

  // Keep the slider refs per fixture so inbound MQTT writes can reflect state → DOM.
  const intInputs: HTMLInputElement[] = [];
  const ctInputs: HTMLInputElement[] = [];

  const strips = st.map((f, i) => {
    const e = el('div', { class: 'lt-strip' });
    e.innerHTML = `<div class="nm">${f.k}<small>${f.sub}</small></div>
            <input class="int" type="range" min="0" max="1" step="0.01" value="${f.intensity}">
            <div class="pc"></div>
            <input class="ct" type="range" min="0" max="1" step="0.01" value="${f.temp}"><div class="kv"></div>`;
    e.addEventListener('mousedown', () => {
      sel = i;
      paintSel();
    });
    const intInput = qs<HTMLInputElement>(e, '.int');
    const ctInput = qs<HTMLInputElement>(e, '.ct');
    intInputs[i] = intInput;
    ctInputs[i] = ctInput;
    intInput.addEventListener('input', () => {
      f.intensity = +intInput.value;
      paint();
      // throttled — safe for the drag loop.
      ctx.services.publishParam?.(`fix${i + 1}_intensity`, Math.round(f.intensity * 100));
    });
    ctInput.addEventListener('input', () => {
      f.temp = +ctInput.value;
      paint();
      ctx.services.publishParam?.(`fix${i + 1}_temp`, tempK(f.temp));
    });
    list.appendChild(e);
    return e;
  });

  function paint(): void {
    st.forEach((f, i) => {
      const fixEl = fixEls[i];
      const strip = strips[i];
      if (!fixEl || !strip) return;
      const k = tempK(f.temp);
      const warm = `hsl(${38 - f.temp * 30},90%,${55 + f.intensity * 20}%)`;
      fixEl.style.background = warm;
      fixEl.style.color = warm;
      fixEl.style.opacity = (0.35 + f.intensity * 0.65).toFixed(2);
      qs(strip, '.pc').textContent = Math.round(f.intensity * 100) + '%';
      qs(strip, '.kv').textContent = k + 'K';
    });
    // subject illumination = sum of intensities, tinted by the key
    const key = st[0];
    const fill = st[1];
    if (key && fill) {
      const lum = 0.3 + (key.intensity * 0.5 + fill.intensity * 0.3);
      beam.style.background = `radial-gradient(circle at ${30 + (key.intensity - fill.intensity) * 20}% 42%, rgba(255,240,210,${(lum * 0.5).toFixed(2)}), transparent 60%)`;
    }
    const ch = st.reduce((a, f) => a + (f.intensity > 0.01 ? 2 : 0), 0);
    const keyK = key ? tempK(key.temp) : 0;
    dmx.textContent = `DMX Universe 1 · ${ch} channels active · ${st.length} fixtures · ${keyK}K key`;
  }

  function paintSel(): void {
    strips.forEach((s, i) => s.classList.toggle('sel', i === sel));
    fixEls.forEach((e, i) => e.classList.toggle('sel', i === sel));
  }

  // ---- scenes / recall + cue triggers into the console ----
  const scHost = qs(host, '.lt-scenes');
  const sceneBtns = new Map<string, HTMLButtonElement>();
  /** Apply a scene's per-fixture intensity set to state + sliders (no publish). */
  function applyScene(nm: string, set: readonly number[]): void {
    set.forEach((v, i) => {
      const f = st[i];
      const strip = strips[i];
      if (f && strip) {
        f.intensity = v;
        qs<HTMLInputElement>(strip, '.int').value = String(v);
      }
    });
    paint();
    scHost.querySelectorAll('.lt-scene').forEach((x) => x.classList.remove('on'));
    sceneBtns.get(nm)?.classList.add('on');
  }
  SCENES.forEach(([nm, set]) => {
    const b = el('button', { class: 'lt-scene', textContent: nm }) as HTMLButtonElement;
    sceneBtns.set(nm, b);
    b.addEventListener('click', () => {
      applyScene(nm, set);
      // Discrete recall + the resulting per-fixture intensities.
      ctx.services.publishParam?.('scene', nm, { throttle: false });
      set.forEach((v, i) => ctx.services.publishParam?.(`fix${i + 1}_intensity`, Math.round(v * 100)));
    });
    scHost.appendChild(b);
  });

  const cueHost = qs(host, '.lt-cues');
  const cueBtns = new Map<string, HTMLButtonElement>();
  /** Fire a cue button's flash (shared by local click + inbound trigger). */
  function flashCue(l: string): void {
    const b = cueBtns.get(l);
    if (!b) return;
    b.classList.add('fire');
    setTimeout(() => b.classList.remove('fire'), 350);
  }
  CUES.forEach((l) => {
    const b = el('button', { class: 'lt-cue', textContent: l }) as HTMLButtonElement;
    cueBtns.set(l, b);
    b.addEventListener('click', () => {
      flashCue(l);
      ctx.services.publishParam?.('cue', l, { throttle: false }); // one-shot trigger
    });
    cueHost.appendChild(b);
  });

  // Advertise every driveable control as a read/write param (audit CR.6 full R/W).
  // Intensity in % (0..100), colour temp in Kelvin (3200..5600 via tempK()).
  const params = st.flatMap((f, i) => [
    { name: `fix${i + 1}_intensity`, type: 'number' as const, unit: '%', min: 0, max: 100, writable: true, cap: 'shade' as const },
    { name: `fix${i + 1}_temp`, type: 'number' as const, unit: 'K', min: 3200, max: 5600, writable: true, cap: 'shade' as const },
  ]);
  ctx.services.advertiseParams?.([
    ...params,
    { name: 'scene', type: 'enum', values: SCENES.map(([nm]) => nm), writable: true, cap: 'shade' },
    { name: 'cue', type: 'enum', values: [...CUES], writable: true, cap: 'shade' },
  ]);

  // External control: honour writes from the bus / other consoles (apply, no echo).
  st.forEach((f, i) => {
    ctx.services.onParam?.(`fix${i + 1}_intensity`, (v) => {
      if (typeof v !== 'number') return;
      f.intensity = clamp(v / 100, 0, 1);
      const inp = intInputs[i];
      if (inp) inp.value = String(f.intensity);
      paint();
    });
    ctx.services.onParam?.(`fix${i + 1}_temp`, (v) => {
      if (typeof v !== 'number') return;
      f.temp = kToTemp(v);
      const inp = ctInputs[i];
      if (inp) inp.value = String(f.temp);
      paint();
    });
  });
  ctx.services.onParam?.('scene', (v) => {
    const hit = SCENES.find(([nm]) => nm === v);
    if (hit) applyScene(hit[0], hit[1]);
  });
  ctx.services.onParam?.('cue', (v) => {
    if (typeof v === 'string') flashCue(v);
  });

  paint();
  paintSel();
  ctx.dispose.interval(() => {
    /* live DMX heartbeat */
  }, 1000);
}
