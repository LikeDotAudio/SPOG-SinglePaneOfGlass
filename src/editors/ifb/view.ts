// src/editors/ifb/view — renders ONE talent IFB strip (the legacy `buildOne`).
//
// Data-in (M3): the MIX-MINUS bus is derived from the sibling's routed feeds via
// routing-core `mixMinus` (program minus the talent's own mic) instead of being
// scraped from the DOM. Animation is registered on the host Disposer, never on a
// module-global timer list.

import type { Disposer } from '../../ui/timers.js';
import type { Sibling, EditorServices } from '../types.js';
import { mixMinus, type RouteGraph } from '../../domain/routing-core/index.js';
import { qs } from '../../ui/dom.js';
import { PRIO, dB, initialState, resolveFeeds, DIAL_PARAM, TALK_VALUES, ROUTE_VALUES, stripPrefix, type DialKey, type IfbRoute } from './state.js';
import { drawFeed, drawDuck } from './painters.js';
import { buildDials } from './dials.js';
import { ifbTemplate } from './template.js';

/** Build one full IFB editor into `body` for a single talent (sibling) twist.
 *  `services` + `idx` scope this strip's MQTT params to the flat `t<N>_…` topics
 *  advertised once by the plugin (audit §4.5). */
export function buildOne(
  body: HTMLElement,
  sib: Sibling,
  dispose: Disposer,
  services: EditorServices,
  idx: number,
): void {
  const s = initialState();

  // This strip's param prefix + publish helpers (guarded — absent w/o MQTT).
  const pfx = stripPrefix(idx);
  const pubDial = (key: DialKey): void =>
    services.publishParam?.(`${pfx}${DIAL_PARAM[key]}`, +s[key].toFixed(3));
  // Talk is a one-shot key press/release — publish un-throttled (discrete event).
  const pubTalk = (): void =>
    services.publishParam?.(`${pfx}talk`, TALK_VALUES[s.talk] ?? 'clear', { throttle: false });
  const subscribe = (name: string, cb: (v: unknown) => void): void => {
    const off = services.onParam?.(name, cb);
    if (off) dispose.add(off);
  };

  // Data-in mix-minus: route every feed into this dest, then drop the talent mic.
  const feeds = resolveFeeds(sib);
  const talent = feeds[0];
  const graph: RouteGraph = {
    sources: new Map(feeds.map((f) => [f.id, f])),
    crosspoints: feeds.map((f) => ({ source: f.id, dest: sib.name })),
  };
  const mm = mixMinus(graph, sib.name, talent ? talent.id : '');
  const mmCaption = `program − ${talent ? talent.label : 'talent mic'} · ${mm.length} feeds`;

  body.innerHTML = ifbTemplate(mmCaption);

  const dialPaint = buildDials(body, s, dispose, pubDial);

  // Inbound encoder writes from the bus / other consoles → set + repaint (no echo).
  for (const key of dialPaint.keys()) {
    subscribe(`${pfx}${DIAL_PARAM[key]}`, (v) => {
      if (typeof v === 'number') {
        s[key] = Math.max(0, Math.min(1, v));
        dialPaint.get(key)?.();
      }
    });
  }

  // ── Delivery split: one mix-minus+interrupt feed, fanned to the wired stage-
  // box return and/or the wireless (RF) IFB leg — the routing decision (§image
  // feedback: "split and fed to both"). Legs light per route; ⚙/📶 open the real
  // stage-box / wireless editors for the physical end of each leg.
  const applyRoute = (publishIt: boolean): void => {
    body.querySelectorAll<HTMLElement>('.ifb-route').forEach((b) =>
      b.classList.toggle('sel', b.dataset.route === s.route));
    body.querySelectorAll<HTMLElement>('.ifb-leg').forEach((l) => {
      const on = s.route === 'split' || s.route === l.dataset.leg;
      l.classList.toggle('on', on);
    });
    if (publishIt) services.publishParam?.(`${pfx}route`, s.route, { throttle: false });
  };
  body.querySelectorAll<HTMLElement>('.ifb-route').forEach((b) => {
    b.addEventListener('click', () => { s.route = b.dataset.route as IfbRoute; applyRoute(true); });
  });
  const legOpen = (leg: string): void => {
    if (leg === 'wireless') services.openWirelessMic?.(`${sib.name} · IFB RF`, '#3FC1C9');
    else services.openStageBox(`${sib.name} · IFB RETURN`, '#F2B74B', [`${sib.name} IFB`]);
  };
  body.querySelectorAll<HTMLElement>('.ifb-leg').forEach((l) => {
    l.querySelector('.open')?.addEventListener('click', (e) => { e.stopPropagation(); legOpen(l.dataset.leg || 'wired'); });
  });
  subscribe(`${pfx}route`, (v) => {
    if (typeof v === 'string' && (ROUTE_VALUES as readonly string[]).includes(v)) { s.route = v as IfbRoute; applyRoute(false); }
  });
  applyRoute(false);

  const talks = qs(body, '.ifb-talks');
  const refresh = (): void => {
    body.querySelectorAll('.ifb-talk').forEach((t, i) => {
      const pr = PRIO[i];
      t.classList.toggle('on', !!pr && pr.p === s.talk);
    });
  };
  for (const pr of PRIO) {
    const t = document.createElement('div');
    t.className = `ifb-talk p${pr.p}`;
    t.innerHTML = `<div class="pr">P${pr.p}</div><div class="nm">${pr.nm}<small>${pr.sub}</small></div>`;
    const down = (): void => {
      s.talk = pr.p;
      refresh();
      pubTalk();
    };
    const up = (): void => {
      if (s.talk === pr.p) {
        s.talk = 0;
        refresh();
        pubTalk();
      }
    };
    t.addEventListener('mousedown', down);
    t.addEventListener('mouseup', up);
    t.addEventListener('mouseleave', up);
    t.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      down();
    });
    t.addEventListener('touchend', up);
    talks.appendChild(t);
  }

  // Inbound interrupt (talk) writes → adopt the named priority + repaint (no echo).
  subscribe(`${pfx}talk`, (v) => {
    const p = TALK_VALUES.indexOf(v as (typeof TALK_VALUES)[number]);
    if (p >= 0) {
      s.talk = p;
      refresh();
    }
  });

  const status = qs<HTMLElement>(body, '.ifb-status');
  const mmMask = qs<HTMLElement>(body, '.ifb-mm .mask');
  const intMask = qs<HTMLElement>(body, '.ifb-int .mask');
  const mmv = qs<HTMLElement>(body, '.ifb-mmv');
  const intv = qs<HTMLElement>(body, '.ifb-intv');
  const feed = qs<HTMLCanvasElement>(body, '.ifb-feed canvas');
  const duck = qs<HTMLCanvasElement>(body, '.ifb-duck canvas');
  const duckHist: number[] = [];

  dispose.interval(() => {
    // program ballistics + ducking
    if (Math.random() < 0.12) s.progTarget = 0.25 + Math.random() * 0.6;
    s.prog += (s.progTarget - s.prog) * 0.2;
    const duckDepth = 6 + s.threshold * 18; // dB
    const duckGain = s.talk ? Math.pow(10, -duckDepth / 20) : 1;
    const progOut = s.prog * s.progGain * duckGain;
    s.intLvl += ((s.talk ? 0.55 + Math.random() * 0.4 : 0) - s.intLvl) * 0.3;
    const intOut = s.intLvl * s.intGain;
    const conf = Math.min(1, progOut + intOut);
    mmMask.style.height = `${100 - progOut * 100}%`;
    intMask.style.height = `${100 - intOut * 100}%`;
    mmv.textContent = dB(progOut);
    intv.textContent = dB(intOut);
    const active = PRIO[s.talk - 1];
    status.textContent = s.talk && active ? `● P${s.talk} ${active.nm} TALKING` : '● CLEAR';
    status.classList.toggle('talk', !!s.talk);
    drawFeed(feed, conf, s.talk);
    duckHist.push(duckGain);
    if (duckHist.length > 120) duckHist.shift();
    drawDuck(duck, duckHist);
  }, 40);
}
