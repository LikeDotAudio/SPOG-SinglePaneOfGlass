// src/editors/iso-recorder/replay — instant-replay engine (rolling buffer).

import type { EditorContext } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { qs } from '../../ui/dom.js';
import type { Chan } from './channels.js';

/**
 * Build the instant-replay engine section, wire its bus publish/subscribe, and
 * return the ParamSpec[] it contributes so the caller can advertise them.
 */
export function buildReplay(
  host: HTMLElement,
  ctx: EditorContext,
  chans: Chan[],
  fmt: (f: number) => string,
): ParamSpec[] {
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

  // Honour inbound writes from the bus / other consoles — apply WITHOUT re-publishing.
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

  // The R/W MQTT params this section advertises (TWIST→MQTT advertising).
  return [
    { name: 'replay_angle', type: 'enum', values: chans.map((c) => c.label), writable: true },
    { name: 'replay_speed', type: 'enum', values: spdBtns.map((b) => b.textContent ?? ''), writable: true },
    { name: 'replay_position', type: 'number', unit: '%', min: 0, max: 100, writable: true },
    { name: 'mark_poi', type: 'bool', writable: true },
    { name: 'replay_play', type: 'bool', writable: true },
    { name: 'to_air', type: 'bool', writable: true },
  ];
}
