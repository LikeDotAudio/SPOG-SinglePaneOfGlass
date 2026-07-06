// src/editors/audio-positioner/index.ts — the CMDP 3D AUDIO POSITIONER.
// Re-integrates the original CMDP circular fader UI into the center,
// with Left/Right POVs and Height (Z-axis) control via the wheel (potentiometers).

import { VOICE_COMMANDS } from './VOICE.js';
import type { EditorPlugin } from '../types.js';
import { el } from '../../ui/dom.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { injectAudioPositionerStyles } from './styles.js';
import { NEAR_RADIUS, FAR_RADIUS, Fader, buildGroups } from './fader.js';
import { drawFace, drawPOVs } from './draw.js';
import { clamp, newInteractionState, createInteraction, type Geom } from './interaction.js';

const plugin: EditorPlugin = {
  id: 'audio-positioner',
  title: 'CMDP · SPATIAL AUDIO PANNER',
  order: 5,
  match: (n) => /audio\s*position|positioner|\bCMDP\b|surround\s*pan/i.test(n),
  requiredCaps: ['audio'],
  voiceCommands: VOICE_COMMANDS,
  render(host, ctx) {
    injectAudioPositionerStyles();
    const { groups, chans } = buildGroups(ctx);

    const wrap = el('div', { class: 'ap-wrap' });

    // HEADER
    const header = el('div', { class: 'ap-header' }, [
      el('div', { class: 'ap-title' }, ['CMDP · SPATIAL AUDIO PANNER']),
      el('div', { class: 'ap-toolbar' }, [
        el('select', { class: 'ap-select' }, [
          el('option', { value: '9.1.4' }, ['Target: 9.1.4']),
          el('option', { value: '5.1.2' }, ['Target: 5.1.2']),
          el('option', { value: 'stereo' }, ['Target: Stereo']),
        ])
      ])
    ]);
    wrap.append(header);

    // MAIN AREA (POVs and CMDP)
    const main = el('div', { class: 'ap-main' });

    // POV 1 (Top)
    const pov1Wrap = el('div', { class: 'ap-pov' }, [el('div', { class: 'ap-pov-title' }, ['POV 1 (TOP)'])]);
    const cvsTop = el('canvas') as HTMLCanvasElement;
    pov1Wrap.append(cvsTop);

    // CMDP Center
    const centerWrap = el('div', { class: 'ap-center' });
    const canvas = el('canvas') as HTMLCanvasElement;
    centerWrap.append(canvas);

    // POV 2 (Side)
    const pov2Wrap = el('div', { class: 'ap-pov' }, [el('div', { class: 'ap-pov-title' }, ['POV 2 (SIDE - HEIGHT)'])]);
    const cvsSide = el('canvas') as HTMLCanvasElement;
    pov2Wrap.append(cvsSide);

    main.append(pov1Wrap, centerWrap, pov2Wrap);
    wrap.append(main);

    // BOTTOM METERS
    const bottom = el('div', { class: 'ap-bottom' });
    const inputMeters = el('div', { class: 'ap-meters' }, [el('div', { class: 'ap-meters-title' }, ['INPUT (VU)'])]);
    const inBox = el('div', { class: 'ap-meters-box' });
    chans.forEach((ch, i) => {
      if (i > 7) return;
      inBox.append(el('div', { class: 'ap-meter', title: ch.label }, [
        el('div', { class: 'ap-meter-fill', style: `height: ${40 + Math.random() * 40}%; background: ${ch.color}` }),
        el('div', { class: 'ap-meter-label' }, [`CH${i+1}`])
      ]));
    });
    inputMeters.append(inBox);

    const outputMeters = el('div', { class: 'ap-meters', style: 'flex: 2;' }, [el('div', { class: 'ap-meters-title' }, ['OUTPUT (9.1.4 FOLDDOWN)'])]);
    const outBox = el('div', { class: 'ap-meters-box' });
    ['L', 'C', 'R', 'Lw', 'Rw', 'Ls', 'Rs', 'Lrs', 'Rrs', 'LFE', 'Ltf', 'Rtf', 'Ltr', 'Rtr'].forEach(lbl => {
      outBox.append(el('div', { class: 'ap-meter' }, [
        el('div', { class: 'ap-meter-fill', style: `height: ${20 + Math.random() * 60}%` }),
        el('div', { class: 'ap-meter-label' }, [lbl])
      ]));
    });
    outputMeters.append(outBox);
    bottom.append(inputMeters, outputMeters);
    wrap.append(bottom);

    // FOOTER (Controls)
    wrap.append(el('div', { class: 'ap-footer' }, [
      'Control Mode: ', el('strong', {}, ['POTENTIOMETERS ASSIGNED TO HEIGHT (Z-AXIS)']), ' | CMDP Left-Drag: Depth | Alt-Drag: Azimuth | Wheel: Height'
    ]));

    if (!ctx.sources.length) {
      wrap.append(el('div', { class: 'ap-empty' }, ['No audio bundle routed. Test mode active.']));
    }

    host.append(wrap);

    const c = canvas.getContext('2d');
    if (!c) return;

    // Build faders
    const faders: Fader[] = [];
    const total = Math.max(1, chans.length);
    let a = -90;
    groups.forEach((g, gi) => {
      const items = chans.filter((ch) => ch.group === gi);
      const span = 360 * (items.length / total);
      items.forEach((ch, k) => {
        const ang = a + span * ((k + 0.5) / Math.max(1, items.length));
        faders.push(new Fader(ch.label, ang, ch.color, gi, 20 + ((k * 37) % 70), 60 + ((k * 23) % 30), 40 + ((k * 15) % 60)));
      });
      a += span;
    });

    ctx.services.advertiseParams?.(faders.flatMap((_, i): ParamSpec[] => {
      const n = i + 1;
      return [
        { name: `ch${n}_azimuth`, type: 'number', unit: 'deg', min: 0, max: 360, writable: true },
        { name: `ch${n}_level`, type: 'number', unit: '%', min: 0, max: 100, writable: true },
        { name: `ch${n}_depth`, type: 'number', unit: '%', min: 0, max: 100, writable: true },
        { name: `ch${n}_height`, type: 'number', unit: '%', min: 0, max: 100, writable: true },
      ];
    }));

    const pubFader = (f: Fader): void => {
      const p = ctx.services.publishParam; if (!p) return;
      const i = faders.indexOf(f); if (i < 0) return;
      const n = i + 1;
      let az = f.angle % 360; if (az < 0) az += 360;
      p(`ch${n}_azimuth`, +az.toFixed(1));
      p(`ch${n}_level`, +f.rot.toFixed(1));
      p(`ch${n}_depth`, +f.val.toFixed(1));
      p(`ch${n}_height`, +f.height.toFixed(1));
    };

    let W = 0, H = 0;
    const geom: Geom = { cx: 0, cy: 0 };
    const fit = (): void => {
      const w = centerWrap.clientWidth, h = centerWrap.clientHeight;
      if (w === W && h === H) return;
      W = w; H = h; canvas.width = w; canvas.height = h; geom.cx = w / 2; geom.cy = h / 2;
      faders.forEach((f) => f.updatePosition(geom.cx, geom.cy));
      cvsTop.width = pov1Wrap.clientWidth; cvsTop.height = pov1Wrap.clientHeight;
      cvsSide.width = pov2Wrap.clientWidth; cvsSide.height = pov2Wrap.clientHeight;
    };

    const state = newInteractionState();
    const { onDown, onMove, onUp, onWheel } = createInteraction(canvas, faders, state, geom, pubFader);

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', onMove);
    window.addEventListener('window:mouseup', onUp);
    ctx.dispose.add(() => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); });

    faders.forEach((f, i) => {
      const n = i + 1;
      ctx.services.onParam?.(`ch${n}_azimuth`, (v) => { if (typeof v === 'number') { f.angle = v; f.updatePosition(geom.cx, geom.cy); } });
      ctx.services.onParam?.(`ch${n}_level`, (v) => { if (typeof v === 'number') f.rot = clamp(v); });
      ctx.services.onParam?.(`ch${n}_depth`, (v) => { if (typeof v === 'number') f.val = clamp(v); });
      ctx.services.onParam?.(`ch${n}_height`, (v) => { if (typeof v === 'number') f.height = clamp(v); });
    });
    faders.forEach(pubFader);

    const ctxTop = cvsTop.getContext('2d')!;
    const ctxSide = cvsSide.getContext('2d')!;

    ctx.dispose.raf(() => {
      fit();
      c.fillStyle = '#181818'; c.fillRect(0, 0, W, H);
      drawFace(c, geom.cx, geom.cy, state.active || state.hovered);
      c.strokeStyle = '#f4902c'; c.setLineDash([5, 5]); c.lineWidth = 2;
      c.beginPath(); c.arc(geom.cx, geom.cy, NEAR_RADIUS, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(geom.cx, geom.cy, FAR_RADIUS, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#f4902c'; c.font = 'bold 12px Arial'; c.textAlign = 'center';
      c.fillText('NEAR', geom.cx, geom.cy - NEAR_RADIUS - 10); c.fillText('FAR', geom.cx, geom.cy - FAR_RADIUS - 10);
      faders.forEach((f) => f.render(c, geom.cx, geom.cy));
      drawPOVs(ctxTop, ctxSide, cvsTop, cvsSide, faders, state.active, state.hovered);
    });
  },
};

export default plugin;
