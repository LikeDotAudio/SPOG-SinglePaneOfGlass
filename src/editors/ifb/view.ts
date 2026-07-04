// src/editors/ifb/view — renders ONE talent IFB strip (the legacy `buildOne`).
//
// Data-in (M3): the MIX-MINUS bus is derived from the sibling's routed feeds via
// routing-core `mixMinus` (program minus the talent's own mic) instead of being
// scraped from the DOM. Animation is registered on the host Disposer, never on a
// module-global timer list.

import type { Disposer } from '../../ui/timers.js';
import type { Sibling, EditorServices } from '../types.js';
import type { Feed, RouteGraph } from '../../domain/routing-core/index.js';
import { mixMinus } from '../../domain/routing-core/index.js';
import { qs } from '../../ui/dom.js';
import { PRIO, dB, initialState, DIAL_PARAM, TALK_VALUES, ROUTE_VALUES, stripPrefix, type DialKey, type IfbRoute } from './state.js';

/** Resolve the feeds for this IFB — sources, then config.inputs, then a default. */
function resolveFeeds(sib: Sibling): Feed[] {
  if (sib.sources.length) return sib.sources;
  const inputs = sib.config?.inputs;
  if (inputs && inputs.length) {
    return inputs.map((label, i) => ({ id: `in${i}`, label, color: '#4d94ff' }));
  }
  return Array.from({ length: 4 }, (_, i) => ({
    id: `ifb${i + 1}`,
    label: `IFB ${i + 1}`,
    color: '#4d94ff',
  }));
}

/** Confidence-feed waveform — exactly what the earpiece hears. */
function drawFeed(cv: HTMLCanvasElement, level: number, talk: number): void {
  const w = (cv.width = cv.clientWidth);
  const h = (cv.height = cv.clientHeight);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = talk ? 'rgba(255,120,120,.9)' : 'rgba(90,224,140,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const t = (x / w) * Math.PI * 2 * 6;
    const y =
      h / 2 +
      Math.sin(t + performance.now() * 0.004) * level * (h * 0.42) * (0.6 + Math.random() * 0.4);
    if (x) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

/** Ducker history — program gain over time while a talk key is held. */
function drawDuck(cv: HTMLCanvasElement, hist: readonly number[]): void {
  const w = (cv.width = cv.clientWidth);
  const h = (cv.height = cv.clientHeight);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(80,110,150,.25)';
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(w, 6);
  ctx.stroke();
  ctx.strokeStyle = '#ffd400';
  ctx.lineWidth = 2;
  ctx.beginPath();
  hist.forEach((g, i) => {
    const x = (i / 120) * w;
    const y = h - 4 - g * (h - 10);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.stroke();
}

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

  body.innerHTML = `
      <div class="ifb">
        <div class="ifb-card ifb-ins">
          <div>
            <div class="ifb-strip"><div class="ifb-meter ifb-mm"><div class="mask"></div></div>
              <div class="ifb-stripinfo"><b>MIX-MINUS</b><span>${mmCaption}</span><span class="ifb-mmv"></span></div></div>
          </div>
          <div>
            <div class="ifb-strip"><div class="ifb-meter ifb-int"><div class="mask"></div></div>
              <div class="ifb-stripinfo"><b>IFB INPUT</b><span>interrupt bus</span><span class="ifb-intv"></span></div></div>
          </div>
        </div>

        <div class="ifb-conf">
          <div class="ifb-cap">TALENT CONFIDENCE FEED — what the earpiece hears</div>
          <div class="ifb-feed"><canvas></canvas><div class="ifb-status">● CLEAR</div></div>
          <div class="ifb-duckwrap"><div class="ifb-cap">DUCKER — program ↓ while talking</div><div class="ifb-duck"><canvas></canvas></div></div>
        </div>

        <div class="ifb-right">
          <div class="ifb-card"><h4>IFB Encoders</h4><div class="ifb-knobs"></div></div>
          <div class="ifb-card"><h4>Interrupt Hierarchy · Hold to Talk</h4><div class="ifb-talks"></div></div>
          <div class="ifb-card"><h4>Delivery · Feed Split</h4>
            <div class="ifb-routes">
              <button class="ifb-route" data-route="wired">WIRED</button>
              <button class="ifb-route" data-route="wireless">RF</button>
              <button class="ifb-route" data-route="split">SPLIT</button>
            </div>
            <div class="ifb-leg" data-leg="wired"><span class="led"></span>
              <div class="nm">STAGE BOX RETURN<small>wired earpiece feed</small></div>
              <button class="open">⚙ OPEN</button></div>
            <div class="ifb-leg" data-leg="wireless"><span class="led"></span>
              <div class="nm">WIRELESS IFB<small>RF beltpack / IEM</small></div>
              <button class="open">📶 OPEN</button></div>
          </div>
        </div>
      </div>`;

  const knobs = qs(body, '.ifb-knobs');
  const dialDefs: ReadonlyArray<[DialKey, string, string]> = [
    ['progGain', 'Program', '#39d353'],
    ['intGain', 'Interrupt', '#ff6a6a'],
    ['threshold', 'Threshold', '#ffd400'],
  ];
  const dialPaint = new Map<DialKey, () => void>();
  for (const [key, label, c] of dialDefs) {
    const kn = document.createElement('div');
    kn.className = 'ifb-kn';
    kn.innerHTML = `<div class="ifb-dial" style="--c:${c}"><i></i></div><b></b><span>${label}</span>`;
    const dial = qs<HTMLElement>(kn, '.ifb-dial');
    const val = qs<HTMLElement>(kn, 'b');
    const paint = (): void => {
      const v = s[key];
      dial.style.setProperty('--p', `${v * 100}%`);
      dial.style.setProperty('--rot', `${v * 270 - 135}deg`);
      val.textContent =
        key === 'threshold'
          ? `-${Math.round(6 + v * 18)}dB`
          : `${v >= 0.5 ? '+' : ''}${Math.round((v - 0.5) * 24)}dB`;
    };
    let sy = 0;
    let sv = 0;
    let dr = false;
    dial.addEventListener('mousedown', (e: MouseEvent) => {
      dr = true;
      sy = e.clientY;
      sv = s[key];
      e.preventDefault();
    });
    const onMove = (e: MouseEvent): void => {
      if (!dr) return;
      s[key] = Math.max(0, Math.min(1, sv + (sy - e.clientY) / 130));
      paint();
      pubDial(key); // throttled — safe inside the drag loop
    };
    const onUp = (): void => {
      dr = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    dispose.add(() => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    });
    knobs.appendChild(kn);
    dialPaint.set(key, paint);
    paint();
  }

  // Inbound encoder writes from the bus / other consoles → set + repaint (no echo).
  for (const [key] of dialDefs) {
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
