// src/editors/iso-recorder — ISO recorders + instant-replay engine.
//
// Faithful TS port of js/editors/iso-recorder.js, driven entirely from the typed
// EditorContext (M3: data-in, no DOM scraping). The legacy channelsFor() walk is
// replaced by ctx.sources, falling back to ctx.twist.config?.inputs, then a
// CAM N default — mirroring the legacy channelsFor(twist, config, 'CAM', 4).

import type { EditorPlugin } from '../types.js';
import type { EditorContext } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { qs } from '../../ui/dom.js';
import { injectIsoRecorderStyles } from './styles.js';

/** A drawable channel: the data each ISO/angle control is built from. */
interface Chan {
  label: string;
  color: string;
}

/** Resolve channels the data-in way (ctx.sources → config.inputs → CAM N). */
function channelsFor(ctx: EditorContext, fallbackPrefix: string, fallbackCount: number): Chan[] {
  if (ctx.sources.length) {
    return ctx.sources.map((f) => ({ label: f.label, color: f.color }));
  }
  const inputs = ctx.twist.config?.inputs;
  if (inputs && inputs.length) {
    return inputs.map((i) => ({ label: i, color: '#4d94ff' }));
  }
  return Array.from({ length: fallbackCount }, (_unused, i) => ({
    label: `${fallbackPrefix} ${i + 1}`,
    color: '#4d94ff',
  }));
}

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
    const sec2 = document.createElement('div');
    sec2.className = 'iso-sec';
    sec2.innerHTML = `<p class="ed-h">INSTANT REPLAY ENGINE — ROLLING BUFFER</p>`;
    const rp = document.createElement('div');
    rp.className = 'rp-wrap';
    const pois = [20, 55, 78];
    rp.innerHTML = `
            <div class="rp-timeline"><div class="rp-buffer"></div>
                ${pois.map((p) => `<div class="rp-poi" style="left:${p}%"></div>`).join('')}
                <div class="rp-play" style="left:60%"></div></div>
            <div class="rp-row">
                <div class="rp-jog"><p class="ed-h">JOG / SHUTTLE</p><input type="range" min="0" max="100" value="60"></div>
                <div><p class="ed-h">POSITION</p><div class="rp-tc">--:--:--:--</div></div>
                <div><p class="ed-h">SPEED</p><div class="rp-speeds">
                    <div class="rp-btn" data-spd>×1</div><div class="rp-btn sel" data-spd>½</div><div class="rp-btn" data-spd>¼</div></div></div>
                <div><p class="ed-h">ANGLE · MULTI-CAM</p><div class="rp-angles"></div></div>
                <div><p class="ed-h">&nbsp;</p><div class="rp-btns">
                    <div class="rp-btn" data-mark>◆ MARK POI</div>
                    <div class="rp-btn" data-play>▶ PLAY</div>
                    <div class="rp-btn air" data-air>TO AIR</div></div></div>
            </div>
            <div class="rp-list"></div>`;
    // Angle · multi-cam: the live take angle is an R/W enum (values = channel labels).
    const ang = qs(rp, '.rp-angles');
    const angBtns: HTMLElement[] = [];
    const selectAngle = (a: HTMLElement): void =>
      ang.querySelectorAll<HTMLElement>('.rp-btn').forEach((x) => x.classList.toggle('sel', x === a));
    chans.forEach((c, i) => {
      const a = document.createElement('div');
      a.className = 'rp-btn' + (i === 0 ? ' sel' : '');
      a.textContent = c.label;
      a.addEventListener('click', () => {
        selectAngle(a);
        ctx.services.publishParam?.('replay_angle', c.label, { throttle: false });
      });
      angBtns.push(a);
      ang.appendChild(a);
    });
    const jog = qs<HTMLInputElement>(rp, '.rp-jog input');
    const tc = qs(rp, '.rp-tc');
    const play = qs<HTMLElement>(rp, '.rp-play');
    const upd = (): void => {
      play.style.left = jog.value + '%';
      tc.textContent = fmt(Math.round(Number(jog.value) * 90));
    };
    // Jog/shuttle position is a continuous drive → throttled (default) publish.
    jog.addEventListener('input', () => {
      upd();
      ctx.services.publishParam?.('replay_position', Number(jog.value));
    });
    upd();
    // Speed · shuttle rate is an R/W enum (values = the ×1 / ½ / ¼ button labels).
    const spdBtns = Array.from(rp.querySelectorAll<HTMLElement>('.rp-speeds .rp-btn'));
    const selectSpeed = (b: HTMLElement): void => spdBtns.forEach((x) => x.classList.toggle('sel', x === b));
    spdBtns.forEach((b) =>
      b.addEventListener('click', () => {
        selectSpeed(b);
        ctx.services.publishParam?.('replay_speed', b.textContent ?? '', { throttle: false });
      }),
    );
    const list = qs(rp, '.rp-list');
    const addClip = (): void => {
      const clip = document.createElement('div');
      clip.className = 'rp-clip';
      clip.textContent = '◆ ' + (tc.textContent ?? '');
      list.appendChild(clip);
    };
    // MARK POI / PLAY are discrete one-shots → publish un-throttled.
    qs(rp, '[data-mark]').addEventListener('click', () => {
      addClip();
      ctx.services.publishParam?.('mark_poi', true, { throttle: false });
    });
    qs(rp, '[data-play]').addEventListener('click', () =>
      ctx.services.publishParam?.('replay_play', true, { throttle: false }),
    );
    const airBtn = qs(rp, '[data-air]');
    const toAir = (): void => {
      airBtn.textContent = '● ON AIR';
      const id = setTimeout(() => {
        airBtn.textContent = 'TO AIR';
      }, 1300);
      ctx.dispose.add(() => clearTimeout(id));
    };
    // TO AIR punches the replay to programme — a discrete R/W take.
    airBtn.addEventListener('click', () => {
      toAir();
      ctx.services.publishParam?.('to_air', true, { throttle: false });
    });
    sec2.appendChild(rp);
    host.appendChild(sec2);

    // Advertise every driveable control as an R/W MQTT param (TWIST→MQTT advertising).
    const specs: ParamSpec[] = chans.map((_c, i) => ({ name: recParam(i), type: 'bool', writable: true }));
    specs.push(
      { name: 'replay_angle', type: 'enum', values: chans.map((c) => c.label), writable: true },
      { name: 'replay_speed', type: 'enum', values: spdBtns.map((b) => b.textContent ?? ''), writable: true },
      { name: 'replay_position', type: 'number', unit: '%', min: 0, max: 100, writable: true },
      { name: 'mark_poi', type: 'bool', writable: true },
      { name: 'replay_play', type: 'bool', writable: true },
      { name: 'to_air', type: 'bool', writable: true },
    );
    ctx.services.advertiseParams?.(specs);

    // Honour inbound writes from the bus / other consoles — apply WITHOUT re-publishing.
    chans.forEach((_c, i) => ctx.services.onParam?.(recParam(i), (v) => recs[i]?.setOn(!!v)));
    ctx.services.onParam?.('replay_angle', (v) => {
      const a = angBtns.find((b) => b.textContent === v);
      if (a) selectAngle(a);
    });
    ctx.services.onParam?.('replay_speed', (v) => {
      const b = spdBtns.find((x) => x.textContent === v);
      if (b) selectSpeed(b);
    });
    ctx.services.onParam?.('replay_position', (v) => {
      if (typeof v === 'number') {
        jog.value = String(v);
        upd();
      }
    });
    ctx.services.onParam?.('mark_poi', (v) => {
      if (v) addClip();
    });
    ctx.services.onParam?.('to_air', (v) => {
      if (v) toAir();
    });
  },
};

export default plugin;
