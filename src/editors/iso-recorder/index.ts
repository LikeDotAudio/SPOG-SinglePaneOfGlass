// src/editors/iso-recorder — ISO recorders + instant-replay engine.
//
// Faithful TS port of js/editors/iso-recorder.js, driven entirely from the typed
// EditorContext (M3: data-in, no DOM scraping). The legacy channelsFor() walk is
// replaced by ctx.sources, falling back to ctx.twist.config?.inputs, then a
// CAM N default — mirroring the legacy channelsFor(twist, config, 'CAM', 4).

import type { EditorPlugin } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { qs } from '../../ui/dom.js';
import { injectIsoRecorderStyles } from './styles.js';
import { channelsFor } from './channels.js';
import { buildReplay } from './replay.js';

/** One ISO recorder lane's mutable state + behaviour. */
interface Rec {
  frames: number;
  on: boolean;
  setOn(on: boolean): void;
  tick(): void;
}

const plugin: EditorPlugin = {
  id: 'iso-recorder',
  title: 'ISO RECORDER · INSTANT REPLAY',
  order: 1,
  match: (n) => /\biso\b|replay/i.test(n),
  requiredCaps: ['route'],
  render(host, ctx) {
    injectIsoRecorderStyles();

    const chans = channelsFor(ctx, 'CAM', 4);
    const fps = 100; // 100 frames/second — frames field runs 00..99
    const fmt = (f: number): string =>
      [Math.floor(f / fps / 3600), Math.floor(f / fps / 60) % 60, Math.floor(f / fps) % 60, f % fps]
        .map((x) => String(x).padStart(2, '0'))
        .join(':');

    // ---- ISO recorders ----
    const sec1 = document.createElement('div');
    sec1.className = 'iso-sec';
    sec1.innerHTML = `<p class="ed-h">ISO RECORDERS — CLEAN PER-SOURCE FEEDS</p>`;
    const bar = document.createElement('div');
    bar.className = 'iso-bar';
    const allBtn = document.createElement('div');
    allBtn.className = 'rp-btn';
    allBtn.textContent = '● RECORD ALL';
    const disk = document.createElement('div');
    disk.className = 'iso-disk';
    disk.innerHTML = '<i style="width:38%"></i>';
    const diskLbl = document.createElement('div');
    diskLbl.style.cssText = 'font-size:11px;color:#7e93b5;white-space:nowrap;';
    diskLbl.textContent = 'DISK 38% · 14:22:10 REMAINING';
    bar.append(allBtn, disk, diskLbl);
    sec1.appendChild(bar);

    const cards = document.createElement('div');
    cards.className = 'iso-cards';
    const recs: Rec[] = [];
    // Per-channel record state is an R/W MQTT param — flat indexed name (ch<N>_record)
    // so an external controller can arm/stop any ISO lane (TWIST→MQTT advertising).
    const recParam = (i: number): string => `ch${i + 1}_record`;
    chans.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'iso-card';
      card.innerHTML = `
                <div class="iso-screen"><span class="rec-dot"></span>▣ ${c.label}</div>
                <div class="iso-name" style="color:${c.color}">${c.label}</div>
                <div class="iso-tc">00:00:00:00</div>
                <button class="iso-recbtn">RECORD</button>
                <div class="iso-file">ISO_${c.label.replace(/\s+/g, '')}_001.mov</div>`;
      const tc = qs(card, '.iso-tc');
      const btn = qs(card, '.iso-recbtn');
      const rec: Rec = {
        frames: 0,
        on: false,
        setOn(on: boolean): void {
          rec.on = on;
          card.classList.toggle('rec', on);
          btn.textContent = on ? 'STOP' : 'RECORD';
        },
        tick(): void {
          if (rec.on) {
            rec.frames++;
            tc.textContent = fmt(rec.frames);
          }
        },
      };
      // Record/stop is a discrete one-shot → publish un-throttled on each press.
      btn.addEventListener('click', () => {
        rec.setOn(!rec.on);
        ctx.services.publishParam?.(recParam(i), rec.on, { throttle: false });
      });
      recs.push(rec);
      cards.appendChild(card);
    });
    sec1.appendChild(cards);
    host.appendChild(sec1);
    allBtn.addEventListener('click', () => {
      const any = recs.some((r) => !r.on);
      recs.forEach((r, i) => {
        r.setOn(any);
        ctx.services.publishParam?.(recParam(i), any, { throttle: false });
      });
      allBtn.textContent = any ? '■ STOP ALL' : '● RECORD ALL';
    });
    ctx.dispose.interval(() => recs.forEach((r) => r.tick()), 1000 / fps);

    // ---- Instant replay engine ----
    const replaySpecs = buildReplay(host, ctx, chans, fmt);

    // Advertise every driveable control as an R/W MQTT param (TWIST→MQTT advertising).
    const specs: ParamSpec[] = chans.map((_c, i) => ({ name: recParam(i), type: 'bool', writable: true }));
    specs.push(...replaySpecs);
    ctx.services.advertiseParams?.(specs);

    // Honour inbound writes from the bus / other consoles — apply WITHOUT re-publishing.
    chans.forEach((_c, i) => ctx.services.onParam?.(recParam(i), (v) => recs[i]?.setOn(!!v)));
  },
};

export default plugin;
