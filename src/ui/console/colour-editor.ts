// src/ui/console/colour-editor — the lazy COLOUR & VISION editor overlay.
// Built on demand (openColourEditor) from the palette launcher: presets, the
// vision/chroma/face axes, the palette gallery, and a live LCARS preview. Drives
// the engine (setScheme/getScheme); the data tables live in colour-palettes.ts.

import { addStyles, el } from '../dom.js';
import { openOverlay } from '../../platform/overlay.js';
import { getScheme, setScheme, sameScheme } from './colour-engine.js';
import { PALETTES, PRESETS, AXES } from './colour-palettes.js';
import { STYLE_ID, CSS } from './colour-editor-css.js';
import { isLcarsPulseOn, setLcarsPulse } from './lcars-pulse.js';

/** Build the editor body: presets, the vision/chroma axes, the palette gallery, and a live preview. */
function buildEditor(body: HTMLElement): void {
  addStyles(STYLE_ID, CSS);

  body.append(el('p', { class: 'cse-note' }, [
    'Presentation modes for colour-vision accessibility. Every mode keeps meaning readable ',
    'without relying on hue — signal category is coded by shape (video ▱ / audio ▽), and ',
    'state by glyph. Choose a preset, tune the axes, or pick a palette below. Changes apply ',
    'live and persist on this device.',
  ]));

  // ── PRESETS ──────────────────────────────────────────────────────────────
  const presetRow = el('div', { class: 'cse-presets' });
  const presetBtns = PRESETS.map((p) => {
    const btn = el('button', { class: 'cse-preset', type: 'button', title: p.hint }, [
      el('span', { class: 'g' }, [p.glyph]),
      el('span', {}, [p.label]),
      el('span', { class: 'h' }, [p.hint]),
      el('span', { class: 'sel' }, ['']),
    ]);
    btn.addEventListener('click', () => { setScheme({ ...p.scheme, face: getScheme().face }); sync(); });
    return { p, btn };
  });
  presetRow.append(...presetBtns.map((x) => x.btn));
  const presetSec = el('div', { class: 'cse-sec' }, [el('h3', { class: 'ed-h' }, ['Presets']), presetRow]);

  // ── FINE CONTROL (vision + chroma) ─────────────────────────────────────────
  const axisSec = el('div', { class: 'cse-sec' }, [el('h3', { class: 'ed-h' }, ['Fine control'])]);
  const segBtns: Array<{ axisIdx: number; v: string; btn: HTMLButtonElement }> = [];
  AXES.forEach((axis, axisIdx) => {
    const seg = el('div', { class: 'cse-seg' });
    axis.opts.forEach((o) => {
      const b = el('button', { type: 'button' }, [o.label]);
      b.addEventListener('click', () => { setScheme(axis.set(getScheme(), o.v)); sync(); });
      seg.append(b);
      segBtns.push({ axisIdx, v: o.v, btn: b });
    });
    axisSec.append(el('div', { class: 'cse-row' }, [
      el('span', { class: 'cse-lab' }, [axis.label]),
      seg,
      el('span', { class: 'cse-hint' }, [axis.hint]),
    ]));
  });

  const hueInput = el('input', { class: 'cse-hue-slider', type: 'range', min: '-180', max: '180', step: '1', value: String(getScheme().monoHue ?? -8) }) as HTMLInputElement;
  const hueRow = el('div', { class: 'cse-hue-row' }, [
    el('span', { class: 'cse-lab' }, ['Mono Hue']),
    hueInput,
    el('span', { class: 'cse-hint' }, ['Adjust phosphor tint (only applies in Mono mode)']),
  ]);
  hueInput.addEventListener('input', () => {
    const s = getScheme();
    s.monoHue = parseInt(hueInput.value);
    setScheme(s);
    sync(); // Sync updates the hint state if needed, though mostly we just want live update
  });
  axisSec.append(hueRow);

  // ── PALETTE GALLERY ────────────────────────────────────────────────────────
  const palRow = el('div', { class: 'cse-pals' });
  const palBtns = PALETTES.map((p) => {
    const dots = el('span', { class: 'cse-dots' }, [
      el('i', { style: `background:${p.t.video}` }),
      el('i', { style: `background:${p.t.audio}` }),
      el('i', { style: `background:${p.t.program}` }),
    ]);
    const btn = el('button', { class: 'cse-pal', type: 'button', title: p.blurb }, [
      el('span', { class: 'selmark' }, ['']),
      dots,
      el('span', { class: 'nm' }, [p.name]),
      el('span', { class: `safe${p.cvdSafe ? '' : ' no'}` }, ['✓ CVD-safe']),
    ]);
    btn.addEventListener('click', () => { setScheme({ ...getScheme(), cvd: p.id }); sync(); });
    return { p, btn };
  });
  palRow.append(...palBtns.map((x) => x.btn));
  const palSec = el('div', { class: 'cse-sec' }, [
    el('h3', { class: 'ed-h' }, ['Palette']),
    el('p', { class: 'cse-note', style: 'margin-bottom:12px' }, [
      'The three swatches are the video · audio · program signal colours. Palettes tagged ',
      'CVD-safe stay distinguishable for colour-blind operators.',
    ]),
    palRow,
  ]);

  // ── LIVE PREVIEW ─────────────────────────────────────────────────────────
  // Sample LCARS windows: a mini elbow frame per signal colour, painted via the
  // live tokens — picking a palette repaints them instantly.
  const sampleWin = (label: string, token: string, fallback: string, states = false): HTMLElement =>
    el('div', { class: 'cse-win', style: `--wc:var(${token},${fallback})` }, [
      el('div', { class: 'cse-win-rail' }, [label]),
      el('div', { class: 'cse-win-spine' }),
      el('div', { class: 'cse-win-elbow' }),
      el('div', { class: 'cse-win-body' }, [
        el('i', { style: 'width:86%' }),
        el('i', { style: 'width:58%' }),
        states
          ? el('span', { class: 'cse-win-states' }, [
              el('b', { class: 'd-alarm' }), el('b', { class: 'd-ok' }), el('b', { class: 'd-onair' })])
          : el('i', { style: 'width:72%' }),
      ]),
    ]);
  const prevSec = el('div', { class: 'cse-sec' }, [
    el('h3', { class: 'ed-h' }, ['Live preview']),
    el('div', { class: 'cse-prev' }, [
      el('div', { class: 'cse-node cse-vid' }, ['VIDEO']),
      el('div', { class: 'cse-node cse-aud' }, ['AUDIO']),
      el('div', { class: 'cse-node cse-prog' }, ['PGM']),
      el('div', { class: 'cse-chip cse-fault' }, [el('span', { class: 'g' }, ['⚠']), 'FAULT']),
      el('div', { class: 'cse-chip cse-ok' }, [el('span', { class: 'g' }, ['✓']), 'OK']),
      el('div', { class: 'cse-chip cse-onair' }, [el('span', { class: 'g' }, ['●']), 'ON-AIR']),
      el('div', { class: 'cse-wins' }, [
        sampleWin('VIDEO', '--sig-video', '#CC99CC'),
        sampleWin('AUDIO', '--sig-audio', '#FF9C63'),
        sampleWin('PROGRAM', '--sig-program', '#646DCC', true),
      ]),
    ]),
  ]);

  // ── DISPLAY EXTRAS ─────────────────────────────────────────────────────────
  const hbCheck = el('input', { class: 'cse-hb-check', type: 'checkbox' }) as HTMLInputElement;
  hbCheck.checked = isLcarsPulseOn();
  hbCheck.addEventListener('change', () => setLcarsPulse(hbCheck.checked));
  const displaySec = el('div', { class: 'cse-sec' }, [
    el('h3', { class: 'ed-h' }, ['Display']),
    el('label', { class: 'cse-row', style: 'cursor:pointer;align-items:center;gap:12px;' }, [
      hbCheck,
      el('span', { class: 'cse-lab' }, ['Heartbeat monitor']),
      el('span', { class: 'cse-hint' }, ['Animated LCARS data-pulse column down the screen edge. Off by default.']),
    ]),
  ]);

  body.append(presetSec, axisSec, palSec, displaySec, prevSec);

  /** Reflect the current scheme onto every control's pressed state. */
  function sync(): void {
    const cur = getScheme();
    for (const { p, btn } of presetBtns) {
      const on = sameScheme(cur, { ...p.scheme, face: cur.face });
      btn.setAttribute('aria-pressed', String(on));
      (btn.querySelector('.sel') as HTMLElement).textContent = on ? '✓ SELECTED' : '';
    }
    for (const { axisIdx, v, btn } of segBtns) {
      btn.setAttribute('aria-pressed', String(AXES[axisIdx]!.get(cur) === v));
    }
    for (const { p, btn } of palBtns) {
      const on = cur.cvd === p.id;
      btn.setAttribute('aria-pressed', String(on));
      (btn.querySelector('.selmark') as HTMLElement).textContent = on ? '✓' : '';
    }
    if (cur.chroma === 'mono') {
      hueRow.classList.add('active');
    } else {
      hueRow.classList.remove('active');
    }
    hueInput.value = String(cur.monoHue ?? -8);
  }
  sync();
}

/** Open the COLOUR & VISION editor overlay. */
export function openColourEditor(): void {
  openOverlay(
    { title: 'Colour & Vision', color: '#CC79A7', prodName: 'system', twistName: 'colour' },
    (bodyEl) => buildEditor(bodyEl),
  );
}
