// src/editors/audio-mixer/view — the console DOM, built from typed context.
//
// Faithful port of renderAudioMixer: a left LCARS rail (layer switch + deco
// elbows), a scrolling bank of channel strips (EQ / PAN / aux mix-minus + monitor
// sends / mute-solo / fader / VU), and a MASTER tab pinned to the right. Strips are
// built by strip.ts; the full MQTT R/W schema is wired by mqtt.ts. Values live in a
// persistent MixerState (state.ts) — never scraped from the DOM.

import type { EditorContext } from '../types.js';
import { el } from '../../ui/dom.js';
import { buildChannels, buildState, LAYER } from './state.js';
import { stripEl, type StripCtx } from './strip.js';
import { wireMixerParams } from './mqtt.js';

export function renderConsole(host: HTMLElement, ctx: EditorContext): void {
  // Routed sources → one fader each; falls back to input slots / CH N when empty.
  const chans = buildChannels(ctx);
  const state = buildState(chans.length);
  const layers = Math.max(1, Math.ceil(chans.length / LAYER));

  // MQTT plumbing. `controls` maps a param name → its widget setter (for inbound
  // writes to move the knob/fader); `toggles` maps mute/solo params → their button.
  // Both are rebuilt on every layer redraw, so off-layer channels simply reflect on
  // their next mount. Guarded with `?.` — absent when MQTT is disabled.
  const controls = new Map<string, (v: number) => void>();
  const toggles = new Map<string, HTMLButtonElement>();
  const pub = (name: string, value: unknown, opts?: { throttle?: boolean }): void =>
    ctx.services.publishParam?.(name, value, opts);

  // Explicit render context shared with the strip builder (no closure scraping).
  const rc: StripCtx = { ctx, state, controls, toggles, pub };

  const console_ = el('div', { class: 'am-console' });

  // ----- LEFT LCARS RAIL: layer switch (vertical) + decorative elbows -----
  const rail = el('div', { class: 'am-rail' });
  rail.append(el('div', { class: 'am-rail-h', textContent: 'Layers' }));
  const layerBtns: HTMLElement[] = [];
  if (layers > 1) {
    for (let i = 0; i < layers; i++) {
      const b = el('div', {
        class: 'am-layerbtn' + (i === 0 ? ' sel' : ''),
        textContent: `CH ${i * LAYER + 1}–${Math.min((i + 1) * LAYER, chans.length)}`,
      });
      b.addEventListener('click', () => selectLayer(i, true));
      rail.append(b);
      layerBtns.push(b);
    }
  } else {
    rail.append(el('div', { class: 'am-layerbtn sel static', textContent: 'MAIN' }));
  }
  rail.append(
    el('div', { class: 'am-elbow a' }),
    el('div', { class: 'am-elbow b' }),
    el('div', { class: 'am-elbow c' }),
    el('div', { class: 'am-rail-foot' }),
  );
  console_.append(rail);

  const strips = el('div', { class: 'am-strips' });
  console_.append(strips);

  // MASTER lives in its own tab pinned to the right — always visible, never
  // scrolled or swapped by the layer switch (so its controls register once).
  const masterTab = el('div', { class: 'am-master-tab' });
  masterTab.append(el('div', { class: 'am-master-h', textContent: 'Master Out' }));
  masterTab.append(stripEl(rc, { label: 'MASTER', color: '#d8c8ff' }, -1, { master: true }));
  console_.append(masterTab);

  host.append(console_);

  // Switch to layer `i`; publish only when the operator did it (not on inbound write).
  function selectLayer(i: number, publish: boolean): void {
    state.layer = i;
    layerBtns.forEach((x, j) => x.classList.toggle('sel', j === i));
    draw();
    if (publish) pub('layer', i, { throttle: false });
  }

  function draw(): void {
    // Drop the previous layer's per-channel handles; master handles persist.
    for (const key of [...controls.keys()]) if (key.startsWith('ch')) controls.delete(key);
    toggles.clear();
    strips.innerHTML = '';
    for (let i = state.layer * LAYER; i < state.layer * LAYER + LAYER && i < chans.length; i++) {
      strips.append(stripEl(rc, chans[i]!, i, {}));
    }
  }
  draw();

  // ----- MQTT: advertise the full R/W schema, then honour inbound writes. -----
  wireMixerParams(ctx, state, {
    channelCount: chans.length,
    layers,
    controls,
    toggles,
    selectLayer,
  });
}
