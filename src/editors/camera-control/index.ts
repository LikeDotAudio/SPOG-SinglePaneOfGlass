// src/editors/camera-control — the CCU / RCP "Single Pane of Glass" camera
// console (the largest legacy editor). Port of js/editors/camera-control.js plus
// its ./camera/* modules (state / styles / bars / maps / controls); the RGB
// parade + vectorscope come from the shared, already-ported src/ui/scopes.ts.
//
// This file assembles the layout, owns the per-frame loop (registered on
// ctx.dispose), and is driven entirely from the typed EditorContext — NO DOM
// scraping (M3): the routed camera lineage comes from ctx.sources, role gating
// from ctx.can / requiredCaps.

import { VOICE_COMMANDS } from './VOICE.js';
import type { EditorPlugin } from '../types.js';
import { addStyles, qs } from '../../ui/dom.js';
import { CSS } from './styles.js';
import { mkState } from './state.js';
import type { CameraConsole, CamState, UiState } from './state.js';
import { HTML, makeResizable } from './template.js';
import { buildShading, buildJoystick, buildTally, buildPresets, buildFunctions } from './controls.js';
import { buildAxisBridge } from './mqtt-axes.js';
import { buildGlassButtons } from './glass-buttons.js';
import { makeFrame } from './frame.js';

const plugin: EditorPlugin = {
  id: 'camera-control',
  title: 'Camera Control · CCU / RCP',
  order: 6,
  match: (n) => /\bcam\b|camera/i.test(n),
  requiredCaps: ['shade'],
  voiceCommands: VOICE_COMMANDS,
  render(host, ctx) {
    addStyles('cc-styles', CSS);

    // Title + camera number from the typed twist name (legacy scraped .twist-title).
    const titleTxt = ctx.twist.name.replace(/^[^A-Za-z0-9]*/, '').trim() || 'CAM';
    const numMatch = titleTxt.match(/\d+/);
    const myNum = (numMatch ? parseInt(numMatch[0], 10) : 1) || 1;

    // Lineage of the routed camera (parent › child › grandchild) for the badge —
    // resolved from ctx.sources rather than scraped from a .signal-node origin.
    const routed = ctx.sources[0];
    const origin = routed ? (routed.origin || routed.label) : '';
    const parts = origin
      .split(' — ')
      .map((s) => s.trim())
      .filter(Boolean);
    const lineage = (parts.length ? parts : [titleTxt]).join('  ›  ').toUpperCase();

    // Camera bank inheritance: an ASSIGNED camera's tally shows the routed
    // device's name (parent — child lineage in the hover), not a generic CAM n.
    // Siblings carry each CAM twist's own routed feeds.
    const camNames: string[] = Array.from({ length: 8 }, (_, i) => `CAM ${i + 1}`);
    const camTitles: string[] = Array.from({ length: 8 }, (_, i) => `CAM ${i + 1} — unassigned`);
    for (const sib of ctx.siblings) {
      const m = sib.name.match(/\d+/);
      const idx = m ? parseInt(m[0], 10) - 1 : -1;
      const f = sib.sources[0];
      if (idx < 0 || idx > 7 || !f) continue;
      const device = f.label.replace(/\s*-?V$/i, '').trim().toUpperCase();
      camNames[idx] = device || camNames[idx]!;
      camTitles[idx] = (f.origin || f.label).toUpperCase();
    }

    const cams = Array.from({ length: 8 }, mkState);
    const ui: UiState = {
      active: Math.min(7, myNum - 1),
      bars: false,
      autoiris: false,
      autowb: false,
      rec: false,
      drag: false,
      t: 0,
      pendingSave: false,
      vel: { x: 0, y: 0 },
    };

    host.innerHTML = HTML;

    const scene = qs(host, '.cc-scene');
    const subject = qs<HTMLCanvasElement>(host, '.cc-subject');
    // The picture this camera shows is the routed source's faux signal (the person-
    // in-a-room it's shooting); the frame loop paints + reframes it every tick.
    const renderFeed = {
      label: routed?.label ?? titleTxt,
      color: routed?.color ?? ctx.production.color,
      origin: routed?.origin,
      media: routed?.media,
      faulted: routed?.faulted,
    };
    const smpte = qs<HTMLCanvasElement>(host, '.cc-smpte canvas');
    const smpteBox = qs(host, '.cc-smpte');
    const wf = qs<HTMLCanvasElement>(host, '.cc-wf');
    const osd = qs(host, '.cc-osd');
    const vec = qs<HTMLCanvasElement>(host, '.cc-vec');
    const tel = qs(host, '.cc-tel');
    const dvd = qs(host, '.cc-dvd');
    dvd.textContent = lineage;

    makeResizable(qs(host, '.cc-vecbox'), qs(host, '.cc-vecbox .cc-rsz'), { minW: 130, minH: 130, square: true, max: 520 });
    makeResizable(qs(host, '.cc-wfbox'), qs(host, '.cc-wfbox .cc-rsz'), { minW: 220, minH: 110, max: 640 });

    const cc: CameraConsole = {
      cams,
      ui,
      S(): CamState {
        return cams[ui.active]!;
      },
      knobEls: [],
      fly: null,
      body: host,
      $<T extends Element = HTMLElement>(sel: string): T {
        return qs<T>(host, sel);
      },
      shade(): void {
        const s = cams[ui.active]!;
        const bright = 0.45 + s.iris * 0.9 + s.mgain * 0.5 + (ui.autoiris ? 0.1 : 0);
        const hue = (s.rGain - s.bGain) * 40;
        const sat = 0.7 + (Math.abs(s.rGain - 0.5) + Math.abs(s.bGain - 0.5)) * 1.2;
        const contrast = 0.8 + s.gamma * 0.6;
        scene.style.filter = `brightness(${bright.toFixed(2)}) contrast(${contrast.toFixed(2)}) saturate(${sat.toFixed(2)}) hue-rotate(${hue.toFixed(0)}deg)`;
      },
      dvdState: { x: 14, y: 14, dx: 3.6, dy: 2.9, color: '#fff' },
    };

    buildShading(cc);
    const { placePuck, syncAxes } = buildJoystick(cc);
    const syncKnobs = (): void => {
      cc.knobEls.forEach((p) => p());
      cc.shade();
    };
    const syncPresets = buildPresets(cc);

    // Reflect state → control surface (no publish) for an inbound write.
    const reflect = (): void => {
      syncKnobs();
      syncAxes();
      syncPresets();
      placePuck();
    };

    // ── MQTT param bridge (audit §4.5) ─────────────────────────────────────
    // Advertise the PTZ control surface and stream the ACTIVE camera's live pose
    // so an external controller / another console can follow or drive it.
    const { publishState, seedPub, wireInbound } = buildAxisBridge(cc, ctx, reflect);

    // Preset RECALL is a discrete event: buildPresets started a fly-to (sets cc.fly
    // with t=0) on this very click, so publish which preset fired. A SAVE sets no
    // fly, and recalling an empty slot never flies — neither publishes.
    host.querySelectorAll<HTMLElement>('.cc-pre .cc-key').forEach((k, i) => {
      k.addEventListener('click', () => {
        if (cc.fly && cc.fly.t === 0) ctx.services.publishParam?.('preset', i + 1, { throttle: false });
      });
    });

    const syncTally = buildTally(cc, camNames, camTitles, () => {
      syncKnobs();
      syncAxes();
      syncPresets();
      // Selecting a camera swaps the whole pose this surface drives — announce it
      // and push the new active pose out at once.
      ctx.services.publishParam?.('camera', ui.active + 1, { throttle: false });
      publishState(true);
    });
    buildFunctions(cc, syncKnobs);

    // External control — honour writes from the bus / other consoles.
    wireInbound();
    ctx.services.onParam?.('camera', (v) => {
      if (typeof v !== 'number') return;
      const i = Math.round(v) - 1;
      if (i < 0 || i >= cams.length || i === ui.active) return;
      ui.active = i;
      syncTally();
      reflect();
      seedPub();
    });
    ctx.services.onParam?.('preset', (v) => {
      if (typeof v !== 'number') return;
      const s = cc.S();
      const i = Math.round(v) - 1;
      const to = s.presets[i];
      if (i < 0 || i >= s.presets.length || !to) return;
      cc.fly = { from: { pan: s.pan, tilt: s.tilt, zoom: s.zoom, dolly: s.dolly, ped: s.ped }, to, t: 0 };
    });

    // On-glass momentary controls: colour bars, hold-to-engage Auto WB, hold-iris.
    buildGlassButtons(cc);

    // NOTE (M3): the legacy nickname field relabelled every other twist's routed
    // signal node by walking the DOM. That cross-twist mutation has no typed
    // service in EditorServices, so the field renders for parity but is inert.

    const frame = makeFrame(cc, {
      subject, renderFeed, smpte, smpteBox, wf, osd, vec, tel, dvd,
      syncKnobs, placePuck, syncAxes, publishState,
    });

    syncAxes();
    syncPresets();
    placePuck();
    cc.shade();
    publishState(true); // retained initial pose
    ctx.dispose.interval(frame, 33);
  },
};

export default plugin;
