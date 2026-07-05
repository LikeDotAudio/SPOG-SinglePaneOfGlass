// src/editors/encoder — port of js/editors/encoder.js (AWS-Elemental-style
// Encoder / Transcoding Engine). The encoder is a routing + formatting hub: a 1:1
// mezzanine "golden source" in, a one-to-many ABR ladder + multi-aspect renditions
// out, a destination "vault" of RTMP/SRT profiles, ST 2022-7 hitless failover,
// AES-128 / DRM and live stream-health monitoring.
//
// Data-in (M3): STREAMS + embedded audio tracks come from ctx.sources (with the
// twist.config.inputs / default fallback), NOT a DOM walk. Stats animate via
// ctx.dispose so the host tears the interval down on close.

import type { EditorPlugin } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { el, qs } from '../../ui/dom.js';
import { injectEncoderStyles } from './styles.js';
import { RENDITIONS, DESTS, deriveFeeds, slug } from './state.js';
import type { TileRef } from './state.js';
import { startHealthMonitor } from './health.js';

const plugin: EditorPlugin = {
  id: 'encoder',
  title: 'ENCODER · TRANSCODING ENGINE',
  order: 10,
  match: (n) => /\bencoder\b|transcod|stream(ing)?\s*(out|engine)|elemental/i.test(n),
  requiredCaps: ['route'],
  render(host, ctx) {
    injectEncoderStyles();

    const { streams, tracks } = deriveFeeds(ctx);
    const destName = DESTS[0] ?? '';
    const ui = { dest: 0, drm: true, failPrimary: true };

    host.innerHTML = `
      <div class="enc">
        <div class="enc-col">
          <div class="enc-card"><h4>Inputs · 1:1 Mezzanine · ${streams.length} stream${streams.length > 1 ? 's' : ''}</h4>
            <div class="enc-streams"></div>
            <div class="enc-aud"></div>
            <div class="enc-meta">
              <span class="enc-badge on">SCTE-35</span><span class="enc-badge on">CC 608/708</span><span class="enc-badge on">LTC TC</span><span class="enc-badge on">SMPTE 2110</span>
            </div>
          </div>
        </div>

        <div class="enc-card" style="display:flex;flex-direction:column;overflow:auto">
          <h4>Output Map · One-to-Many ABR Ladder</h4>
          <div class="enc-grid"></div>
        </div>

        <div class="enc-col">
          <div class="enc-card"><h4>Destination Vault</h4><div class="enc-dest"></div></div>
          <div class="enc-card"><h4>Hitless Failover · ST 2022-7</h4>
            <div class="enc-fo"><div class="pill prim on">PRIMARY</div><div class="pill sec">SECONDARY</div></div>
            <div class="enc-key drm on">AES-128 / DRM</div>
          </div>
          <div class="enc-card"><h4>Stream Health</h4><div class="enc-health"></div></div>
        </div>
      </div>`;

    // input streams — one mini 1:1 mezzanine per routed video
    const strm = qs(host, '.enc-streams');
    streams.forEach((s, si) => {
      const item = el('div', { class: 'enc-strm' });
      item.innerHTML = `<div class="pic"></div><div class="nm">STREAM ${si + 1}<small>${s.label}</small></div>`;
      strm.appendChild(item);
    });

    // embedded audio tracks (auto-populated from routed audio)
    const aud = qs(host, '.enc-aud');
    const audBars: HTMLElement[] = [];
    tracks.forEach((a) => {
      const row = el('div', { class: 'enc-arow' });
      row.innerHTML = `<div class="lab">${a.n} <small>[${a.t}]</small></div><div class="m"><i style="width:40%"></i></div>`;
      aud.appendChild(row);
      const bar = row.querySelector<HTMLElement>('i');
      if (bar) audBars.push(bar);
    });

    // output map — the ABR ladder, one bank per video stream
    const grid = qs(host, '.enc-grid');
    const tiles: TileRef[] = [];
    streams.forEach((s, si) => {
      if (streams.length > 1) {
        const h = el('div', { class: 'enc-shead', textContent: `STREAM ${si + 1} · ${s.label} → ABR LADDER` });
        grid.appendChild(h);
      }
      RENDITIONS.forEach((r) => {
        const tile = el('div', { class: 'enc-tile' });
        const sq: [number, number] = r.ar === '1:1' ? [18, 18] : r.ar === '9:16' ? [12, 20] : [24, 14];
        tile.innerHTML =
          `<div class="led"></div><div class="ar"><span class="arbox" style="width:${sq[0]}px;height:${sq[1]}px"></span><div><b>${r.name}</b><div class="codec">${r.ar} · ${r.codec}</div></div></div>` +
          `<div class="br">${(r.kbps / 1000).toFixed(1)} Mbps</div><div class="dest">${destName}</div>`;
        const param = (streams.length > 1 ? `s${si + 1}_` : '') + slug(r.name);
        const ref: TileRef = { kbps: r.kbps, name: r.name, param, on: true, err: false, el: tile };
        tile.addEventListener('click', () => {
          armRung(ref, !ref.on);
          // Discrete start/stop of an ABR rung — one-shot, don't throttle.
          ctx.services.publishParam?.(ref.param, ref.on, { throttle: false });
        });
        grid.appendChild(tile);
        tiles.push(ref);
      });
    });

    // destination vault
    const dest = qs(host, '.enc-dest');
    // Reflect a destination selection to the DOM (shared by the click handler and
    // inbound MQTT writes so an external console can re-point the egress).
    const selectDest = (i: number): void => {
      ui.dest = i;
      dest.querySelectorAll('.enc-d').forEach((x, j) => x.classList.toggle('sel', j === i));
    };
    DESTS.forEach((d, i) => {
      const item = el('div', { class: 'enc-d' + (i === 0 ? ' sel' : '') });
      item.innerHTML = `<span class="lk">🔒</span><div class="nm">${d}</div><span class="pr">${/SRT/.test(d) ? 'SRT' : 'RTMP'}</span>`;
      item.addEventListener('click', () => {
        selectDest(i);
        ctx.services.publishParam?.('destination', DESTS[i], { throttle: false });
      });
      dest.appendChild(item);
    });

    // hitless failover PRIMARY / SECONDARY toggle
    const fo = qs(host, '.enc-fo');
    const applyFailover = (primary: boolean): void => {
      ui.failPrimary = primary;
      qs(host, '.enc-fo .prim').classList.toggle('on', primary);
      qs(host, '.enc-fo .sec').classList.toggle('on', !primary);
    };
    fo.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const p = target?.closest('.pill');
      if (!p) return;
      applyFailover(p.classList.contains('prim'));
      ctx.services.publishParam?.('failover', ui.failPrimary ? 'primary' : 'secondary', { throttle: false });
    });

    // AES-128 / DRM toggle
    const drmKey = qs(host, '.enc-key.drm');
    const applyDrm = (on: boolean): void => {
      ui.drm = on;
      drmKey.classList.toggle('on', on);
    };
    drmKey.addEventListener('click', () => {
      applyDrm(!ui.drm);
      ctx.services.publishParam?.('drm', ui.drm, { throttle: false });
    });

    // live stream-health monitoring + random packet-drop simulation
    startHealthMonitor(host, ctx, audBars, tiles, ui);

    // ── MQTT param bridge (audit §4.5) ──────────────────────────────────────
    // Arm/stop an ABR rung (bitrate + codec + resolution are fixed rendition
    // attributes, so the driveable value is the rung's start/stop enable).
    function armRung(ref: TileRef, on: boolean): void {
      ref.on = on;
      ref.el.classList.toggle('off', !on);
    }

    // Advertise the operator-driveable schema: destination + failover + DRM are
    // R/W enums/bools; each ABR rung is a start/stop bool; egress is read-only.
    const specs: ParamSpec[] = [
      { name: 'destination', type: 'enum', values: [...DESTS], writable: true, cap: 'route' },
      { name: 'failover', type: 'enum', values: ['primary', 'secondary'], writable: true },
      { name: 'drm', type: 'bool', writable: true },
      ...tiles.map((t): ParamSpec => ({ name: t.param, type: 'bool', writable: true, cap: 'route' })),
      { name: 'egress_mbps', type: 'number', unit: 'Mbps', writable: false },
    ];
    ctx.services.advertiseParams?.(specs);

    // Publish current state once (retained) so the bus reflects power-on config.
    const pub = ctx.services.publishParam;
    if (pub) {
      pub('destination', DESTS[ui.dest]);
      pub('failover', ui.failPrimary ? 'primary' : 'secondary');
      pub('drm', ui.drm);
      for (const t of tiles) pub(t.param, t.on);
    }

    // Honour inbound writes from the bus / other consoles — apply to state + DOM
    // WITHOUT re-publishing (the apply helpers never call publishParam).
    ctx.services.onParam?.('destination', (v) => {
      const i = DESTS.indexOf(String(v));
      if (i >= 0) selectDest(i);
    });
    ctx.services.onParam?.('failover', (v) => {
      if (v === 'primary' || v === 'secondary') applyFailover(v === 'primary');
    });
    ctx.services.onParam?.('drm', (v) => applyDrm(!!v));
    for (const t of tiles) ctx.services.onParam?.(t.param, (v) => armRung(t, !!v));
  },
};

export default plugin;
