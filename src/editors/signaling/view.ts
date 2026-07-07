// src/editors/signaling/view — builds the SIGNALING surface and wires its
// interactions. Faithful port of js/editors/signaling.js render(): a studio-state
// column (On-Air / mode), a tally bus (PGM red / PVW green / ISO amber + TAKE),
// and a GPI/SCTE trigger "panel maker" with a live log. Data-in only: the cam
// grid is driven from ctx.sources (see state.ts camsFor); no DOM scraping.

import { el, qs } from '../../ui/dom.js';
import type { EditorContext } from '../types.js';
import {
  camsFor,
  initialState,
  DEFAULT_TRIGS,
  type SignalingState,
  type Trig,
} from './state.js';
import { wireSignalingParams } from './mqtt.js';
import { mountStudioTsg } from './tsg-frame.js';

// A trigger's label → snake_case MQTT param name ('GPI 1' → 'gpi_1',
// 'SCTE-35 Ad Cue' → 'scte_35_ad_cue'). Triggers are momentary GPI/SCTE pulses.
function trigParam(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function renderSignaling(host: HTMLElement, ctx: EditorContext): void {
  const cams = camsFor(ctx);
  const ui: SignalingState = initialState(cams.length);

  host.innerHTML = `
      <div class="sg">
        <div class="sg-col">
          <div class="sg-card"><h4>Studio State</h4>
            <div class="sg-onair">OFF AIR</div>
            <div class="sg-mode"><div class="b sel" data-mode="live">Live</div><div class="b" data-mode="reh">Rehearsal</div></div>
          </div>
          <div class="sg-card"><h4>On-Air Light</h4>
            <div class="sg-onlight" style="text-align:center;font:900 14px sans-serif;letter-spacing:2px;padding:18px;border-radius:10px;">DOOR LIGHT</div>
          </div>
          <div class="sg-card"><h4>Studio Test Signal</h4>
            <div class="sg-tsg" title="Studio test pattern — tap to choose the Test Signal Generator output" style="cursor:pointer;border:2px solid #2c4a6e;border-radius:10px;overflow:hidden;">
              <canvas class="sg-tsg-cvs" style="display:block;width:100%;aspect-ratio:16/9;background:#000;"></canvas>
              <div class="sg-tsg-cap" style="font:700 10px/1 sans-serif;letter-spacing:1px;color:#9fb6cc;padding:6px 8px;background:rgba(6,12,22,.85);">▦ <span class="sg-tsg-name">TEST SIGNAL</span> · TAP TO CONFIGURE ↗</div>
            </div>
          </div>
        </div>

        <div class="sg-card sg-bus"><h4>Tally Bus · Switcher Program / Preview</h4>
          <button class="sg-take">▶ TAKE / CUT</button>
          <div class="sg-grid"></div>
        </div>

        <div class="sg-card sg-col"><h4>Production Triggers · GPI / SCTE</h4>
          <div class="sg-trigs"></div>
          <div class="sg-log"></div>
        </div>
      </div>`;

  const grid = qs<HTMLElement>(host, '.sg-grid');
  const onair = qs<HTMLElement>(host, '.sg-onair');
  const onlight = qs<HTMLElement>(host, '.sg-onlight');
  const logEl = qs<HTMLElement>(host, '.sg-log');

  // The studio TEST SIGNAL frame (live preview + tap-to-open the TSG editor).
  mountStudioTsg(host, ctx);

  function log(msg: string): void {
    ui.log.unshift(msg);
    ui.log = ui.log.slice(0, 8);
    logEl.innerHTML = ui.log.map((l) => l).join('<br>');
  }

  // Tally is DISCRETE state: publish every cam's PGM (red) / PVW (green) / ISO
  // (amber) bool as a one-shot (throttle:false) so the tally mirrors instantly to
  // the bus + other consoles. PGM/PVW are single-select — publish the WHOLE grid on
  // any change so the exclusive de-selection of the previous cam propagates too.
  function publishTally(): void {
    const p = ctx.services.publishParam;
    if (!p) return;
    cams.forEach((_cam, i) => {
      p(`ch${i + 1}_pgm`, i === ui.pgm, { throttle: false });
      p(`ch${i + 1}_pvw`, i === ui.pvw, { throttle: false });
      p(`ch${i + 1}_iso`, ui.iso.has(i), { throttle: false });
    });
  }

  // ---- tally cams ----
  const camEls: HTMLElement[] = [];
  cams.forEach((cam, i) => {
    const cell = el('div', { class: 'sg-cam' });
    cell.innerHTML = `<div class="nm">${cam.label}</div><div class="st"></div>
            <div class="row"><button class="pgmb">PGM</button><button class="pvwb">PVW</button><button class="isob">ISO</button></div>`;
    qs<HTMLButtonElement>(cell, '.pgmb').addEventListener('click', () => {
      ui.pgm = i;
      paint();
      publishTally();
      log(`<b>CUT</b> → ${cam.label} on Program`);
    });
    qs<HTMLButtonElement>(cell, '.pvwb').addEventListener('click', () => {
      ui.pvw = i;
      paint();
      publishTally();
    });
    qs<HTMLButtonElement>(cell, '.isob').addEventListener('click', () => {
      if (ui.iso.has(i)) ui.iso.delete(i);
      else ui.iso.add(i);
      paint();
      publishTally();
    });
    grid.append(cell);
    camEls.push(cell);
  });

  qs<HTMLButtonElement>(host, '.sg-take').addEventListener('click', () => {
    const t = ui.pgm;
    ui.pgm = ui.pvw;
    ui.pvw = t;
    paint();
    publishTally();
    log(`<b>TAKE</b> → ${cams[ui.pgm]?.label ?? `CAM ${ui.pgm + 1}`} live (was preview)`);
  });

  function paint(): void {
    camEls.forEach((cell, i) => {
      cell.classList.toggle('pgm', i === ui.pgm);
      cell.classList.toggle('pvw', i === ui.pvw);
      cell.classList.toggle('iso', ui.iso.has(i) && i !== ui.pgm && i !== ui.pvw);
      qs<HTMLElement>(cell, '.st').textContent =
        i === ui.pgm ? '● PROGRAM' : i === ui.pvw ? '● PREVIEW' : ui.iso.has(i) ? '● ISO REC' : 'STANDBY';
    });
    const live = ui.mode === 'live';
    onair.className = 'sg-onair ' + (live ? 'live' : 'reh');
    onair.textContent = live ? 'ON AIR' : 'REHEARSAL';
    onlight.style.background = live ? '#3a0808' : '#3a2c08';
    onlight.style.color = live ? '#ff6a6a' : '#ffd76b';
    onlight.style.boxShadow = live ? '0 0 16px rgba(255,43,43,.5)' : '0 0 12px rgba(255,212,0,.35)';
    onlight.textContent = live ? 'DOOR LIGHT · RED (LIVE)' : 'DOOR LIGHT · AMBER (REH)';
  }

  const modeBtns = Array.from(host.querySelectorAll<HTMLElement>('.sg-mode .b'));
  modeBtns.forEach((b) => {
    b.addEventListener('click', () => {
      ui.mode = b.dataset['mode'] === 'reh' ? 'reh' : 'live';
      modeBtns.forEach((x) => x.classList.toggle('sel', x === b));
      paint();
      ctx.services.publishParam?.('mode', ui.mode, { throttle: false });
      log(`Mode → <b>${ui.mode === 'live' ? 'LIVE' : 'REHEARSAL'}</b>`);
    });
  });

  // ---- trigger panel ("buttons on a panel maker") ----
  const trigsHost = qs<HTMLElement>(host, '.sg-trigs');
  const addBtn = el('div', { class: 'sg-add' }, ['＋ ADD TRIGGER']);

  function addTrig(t: Trig): void {
    const name = trigParam(t.l);
    const b = el('div', { class: 'sg-trig ' + (t.c || '') }, [t.l]);
    // A trigger is a momentary GPI/SCTE pulse: flash + log, and (when local)
    // publish a discrete one-shot `true`. `publish=false` for inbound writes so a
    // bus/other-console fire doesn't echo back.
    const fire = (publish: boolean): void => {
      b.classList.add('fire');
      ctx.dispose.add(() => b.classList.remove('fire'));
      setTimeout(() => b.classList.remove('fire'), 400);
      log(`⦿ TRIGGER · <b>${t.l}</b> fired`);
      if (publish) ctx.services.publishParam?.(name, true, { throttle: false });
    };
    b.addEventListener('click', () => fire(true));
    ctx.services.onParam?.(name, (v) => { if (v) fire(false); });
    trigsHost.insertBefore(b, addBtn);
  }

  // addBtn must be a child BEFORE addTrig() inserts before it (insertBefore
  // requires the ref node to already be a child).
  trigsHost.append(addBtn);
  DEFAULT_TRIGS.forEach((t) => addTrig(t));
  addBtn.addEventListener('click', () => {
    const l = prompt('Trigger button label:', 'Custom Cue');
    if (l) addTrig({ l, c: '' });
  });

  // Advertise the operator-driven signals as writable params + honour inbound
  // writes from the bus / other consoles (see mqtt.ts). Triggers subscribe
  // per-button in addTrig above.
  wireSignalingParams(ctx, ui, cams, modeBtns, paint, trigParam);

  paint();
  // Seed the retained bus with the initial studio + tally state on open.
  ctx.services.publishParam?.('mode', ui.mode, { throttle: false });
  publishTally();
  log('Signaling online · tally distributed via GPI / NMOS IS-07');

  // Legacy kept a heartbeat timer alive while the panel was open; preserve it
  // via the disposer so the host clears it on close (no manual teardown).
  ctx.dispose.interval(() => {}, 1000);
}
