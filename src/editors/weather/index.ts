// src/editors/weather — the WEATHER / FORECAST editor (a graphics source).
//
// Opened when a WEATHER feed (extraClass:"weather-source") is routed onto a
// twist, or a twist is literally named "Weather". Renders a broadcast weather
// board for one or more locations: a LARGE current temperature, the condition,
// today's upcoming hourly temps, sunrise / sunset, and a 5-day forecast.
//
// REAL DATA — unlike the front-end-simulation sources elsewhere, this pulls live
// observations from Open-Meteo (https://open-meteo.com): a free, keyless,
// CORS-enabled API (OpenWeatherMap needs a secret key that a pure front-end can't
// hold). Locations come from the routed feed labels (e.g. "TORONTO, ON") AND from
// a live province / city search box; each is geocoded, then the forecast is
// fetched for its coordinates in its own local time zone.
//
// The data layer (geocode/fetch/model/units/time helpers/dayparts) lives in
// ./data.ts and the on-air glyph set in ./icons.ts, so this file is just the
// operator `board` face + editor chrome (audit §7).

import type { EditorPlugin } from '../types.js';
import { el, addStyles } from '../../ui/dom.js';
import {
  type Unit, type GeoMatch, type Forecast, type Location,
  toDisplay, windDisplay, round, decode,
  geocode, fetchForecast,
  clockOf, weekdayOf, timeInZone, dateInZone, isDaytimeHour, hourLabel,
  seedQueries,
} from './data.js';
import { makeStrip } from './faces/strip.js';

type Mode = 'board' | 'strip';

const CSS = `
.wx{display:flex;flex-direction:column;gap:12px;height:100%;min-height:0;color:#dfe8f5;}
.wx-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;}
.wx-bar h4{margin:0 6px 0 0;color:#4EC0FF;font:700 11px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.wx-seg{display:inline-flex;border:1px solid #234;border-radius:9px;overflow:hidden;}
.wx-btn{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:7px 13px;border:none;
  background:#0e1926;color:#9dc4e6;cursor:pointer;}
.wx-btn.on{background:#4EC0FF;color:#04121e;}
.wx-search{display:inline-flex;align-items:center;gap:6px;position:relative;}
.wx-search input{background:#08131f;border:1px solid #234;border-radius:8px;color:#dfe8f5;
  font:700 11px 'Courier New',monospace;letter-spacing:1px;padding:8px 11px;width:220px;}
.wx-search input::placeholder{color:#5a7a99;}
.wx-go{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:8px 14px;border:none;
  border-radius:8px;background:#16324a;color:#bfe2ff;cursor:pointer;}
.wx-go:hover{background:#1d4260;}
.wx-hint{color:#5a7a99;font:600 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;}
.wx-menu{position:absolute;top:100%;left:0;margin-top:4px;z-index:20;min-width:260px;
  background:#08131f;border:1px solid #2b4a66;border-radius:10px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.6);}
.wx-menu button{display:block;width:100%;text-align:left;border:none;background:none;color:#cfe6fb;cursor:pointer;
  font:700 11px 'Courier New',monospace;letter-spacing:.5px;padding:9px 12px;}
.wx-menu button:hover{background:#122b40;}
.wx-menu .wx-mi-sub{color:#6f92b0;font-weight:600;font-size:10px;}

.wx-grid{flex:1;min-height:0;overflow:auto;display:grid;gap:16px;padding:2px;
  grid-template-columns:repeat(auto-fill,minmax(340px,1fr));align-content:start;}
.wx-card{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px 16px 14px;
  border-radius:16px;border:1px solid #1d3a52;background:linear-gradient(160deg,#0a1a2b 0%,#06101b 60%,#050a12 100%);
  box-shadow:inset 0 0 40px rgba(78,192,255,.06);}
.wx-x{position:absolute;top:10px;right:10px;width:24px;height:24px;border:none;border-radius:6px;cursor:pointer;
  background:#0e1c2b;color:#6f92b0;font:800 12px monospace;line-height:1;}
.wx-x:hover{background:#3a1420;color:#ff9db0;}
.wx-city{font:800 14px 'Courier New',monospace;letter-spacing:2px;color:#eaf4ff;text-transform:uppercase;}
.wx-sub{font:700 10px 'Courier New',monospace;letter-spacing:1.5px;color:#7ea6c8;text-transform:uppercase;margin-top:2px;}
.wx-localtime{font:800 12px 'Courier New',monospace;letter-spacing:1px;color:#4EC0FF;margin-top:3px;}

.wx-now{display:flex;align-items:center;gap:14px;}
.wx-icon{font-size:56px;line-height:1;filter:drop-shadow(0 3px 8px rgba(0,0,0,.5));}
.wx-temp{font:200 72px/0.9 'Helvetica Neue',Arial,sans-serif;color:#fff;letter-spacing:-2px;
  text-shadow:0 2px 18px rgba(78,192,255,.35);}
.wx-temp sup{font-size:26px;vertical-align:top;color:#9dc4e6;font-weight:400;margin-left:2px;}
.wx-cond{display:flex;flex-direction:column;gap:3px;}
.wx-cond .wx-desc{font:800 12px 'Courier New',monospace;letter-spacing:1px;color:#cfe6fb;text-transform:uppercase;}
.wx-cond .wx-feels{font:700 10px 'Courier New',monospace;letter-spacing:1px;color:#7ea6c8;text-transform:uppercase;}

.wx-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.wx-stat{background:#07131f;border:1px solid #14283a;border-radius:10px;padding:7px 6px;text-align:center;}
.wx-stat .k{font:700 9px 'Courier New',monospace;letter-spacing:1px;color:#6f92b0;text-transform:uppercase;}
.wx-stat .v{font:800 13px 'Courier New',monospace;letter-spacing:.5px;color:#eaf4ff;margin-top:2px;}

.wx-sec{font:700 9px 'Courier New',monospace;letter-spacing:2px;color:#4EC0FF;text-transform:uppercase;
  border-top:1px solid #12263a;padding-top:9px;}
.wx-hours{display:flex;gap:6px;overflow-x:auto;padding-bottom:3px;}
.wx-hr{flex:0 0 auto;min-width:52px;background:#07131f;border:1px solid #14283a;border-radius:9px;
  padding:7px 4px;text-align:center;display:flex;flex-direction:column;gap:3px;align-items:center;}
.wx-hr .h{font:700 9px 'Courier New',monospace;letter-spacing:.5px;color:#7ea6c8;}
.wx-hr .i{font-size:19px;line-height:1;}
.wx-hr .t{font:800 12px 'Courier New',monospace;color:#eaf4ff;}

.wx-days{display:flex;flex-direction:column;gap:5px;}
.wx-day{display:grid;grid-template-columns:52px 30px 1fr auto;align-items:center;gap:10px;
  background:#07131f;border:1px solid #12263a;border-radius:9px;padding:7px 11px;}
.wx-day .d{font:800 11px 'Courier New',monospace;letter-spacing:1px;color:#cfe6fb;text-transform:uppercase;}
.wx-day .di{font-size:20px;line-height:1;text-align:center;}
.wx-day .dc{font:700 10px 'Courier New',monospace;letter-spacing:.5px;color:#7ea6c8;text-transform:uppercase;}
.wx-day .dt{font:800 12px 'Courier New',monospace;letter-spacing:.5px;color:#eaf4ff;white-space:nowrap;}
.wx-day .dt .lo{color:#6f92b0;}

.wx-msg{padding:22px 14px;text-align:center;font:700 11px 'Courier New',monospace;letter-spacing:1px;color:#7ea6c8;}
.wx-msg.err{color:#ff9db0;}
.wx-empty{margin:auto;text-align:center;color:#5a7a99;font:700 12px 'Courier New',monospace;letter-spacing:1px;}
.wx-striphost{flex:1;min-height:0;overflow:auto;display:flex;}
`;

let uid = 0;
const nextKey = (): string => `loc-${++uid}`;

const plugin: EditorPlugin = {
  id: 'weather',
  title: 'WEATHER · FORECAST',
  order: 9,
  blurb: 'Live weather source — current temp, today’s hourly, sunrise/sunset and a 5-day forecast for any province/city (Open-Meteo, no key).',
  match: (n) => /weather|forecast/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-weather', CSS);

    let unit: Unit = 'C';
    let mode: Mode = 'board';
    const locations: Location[] = [];
    const cards = new Map<string, ReturnType<typeof makeCard>>();
    let activeStrip: ReturnType<typeof makeStrip> | null = null;
    // A shared abort controller for all in-flight fetches; aborted on close.
    const ac = new AbortController();
    ctx.dispose.add(() => ac.abort());

    // ---------- controls ----------
    const cBtn = el('button', { class: 'wx-btn on' }, ['°C']);
    const fBtn = el('button', { class: 'wx-btn' }, ['°F']);
    const setUnit = (u: Unit, publish = true): void => {
      unit = u;
      cBtn.classList.toggle('on', u === 'C');
      fBtn.classList.toggle('on', u === 'F');
      for (const card of cards.values()) card.repaint();
      activeStrip?.repaint();
      if (publish) ctx.services.publishParam?.('unit', u, { throttle: false });
    };
    cBtn.addEventListener('click', () => setUnit('C'));
    fBtn.addEventListener('click', () => setUnit('F'));

    // Board (operator grid) vs Strip (on-air single-anchor timeline).
    const bBtn = el('button', { class: 'wx-btn on' }, ['▤ Board']);
    const sBtn = el('button', { class: 'wx-btn' }, ['▭ Strip']);
    const setMode = (m: Mode, publish = true): void => {
      mode = m;
      bBtn.classList.toggle('on', m === 'board');
      sBtn.classList.toggle('on', m === 'strip');
      grid.style.display = m === 'board' ? '' : 'none';
      stripHost.style.display = m === 'strip' ? '' : 'none';
      if (m === 'strip') renderStrip();
      if (publish) ctx.services.publishParam?.('mode', m, { throttle: false });
    };
    bBtn.addEventListener('click', () => setMode('board'));
    sBtn.addEventListener('click', () => setMode('strip'));

    // The on-air strip renders the ANCHOR city (locations[0]).
    function renderStrip(): void {
      const anchor = locations[0];
      if (!anchor) {
        activeStrip = null;
        stripHost.replaceChildren(el('div', { class: 'wx-empty' }, ['No location yet — add a city to build the on-air strip.']));
        return;
      }
      activeStrip = makeStrip(anchor, {
        signal: ac.signal,
        getUnit: () => unit,
        publishTemp: (c) => ctx.services.publishParam?.(`temp.${anchor.key}`, round(c), { throttle: true }),
      });
      stripHost.replaceChildren(activeStrip.root);
      void activeStrip.load();
    }

    const input = el('input', { type: 'text', placeholder: 'City, Province / Country…' }) as HTMLInputElement;
    const goBtn = el('button', { class: 'wx-go' }, ['＋ Add']);
    const menu = el('div', { class: 'wx-menu' });
    menu.style.display = 'none';
    const closeMenu = (): void => { menu.style.display = 'none'; menu.replaceChildren(); };

    // Resolve a typed query: one hit → add it; several → offer a pick list.
    const runSearch = async (): Promise<void> => {
      const q = input.value.trim();
      if (!q) return;
      closeMenu();
      goBtn.textContent = '…';
      try {
        const matches = await geocode(q, ac.signal);
        goBtn.textContent = '＋ Add';
        if (!matches.length) { flash('No match for that place'); return; }
        if (matches.length === 1) { addLocation(matches[0]!); input.value = ''; return; }
        for (const m of matches) {
          const b = el('button', {}, []);
          b.append(
            document.createTextNode(m.name),
            el('span', { class: 'wx-mi-sub' }, [`  ${[m.admin1, m.country].filter(Boolean).join(', ')}`]),
          );
          b.addEventListener('click', () => { addLocation(m); input.value = ''; closeMenu(); });
          menu.append(b);
        }
        menu.style.display = 'block';
      } catch (e) {
        goBtn.textContent = '＋ Add';
        if ((e as Error).name !== 'AbortError') flash('Search failed — offline?');
      }
    };
    goBtn.addEventListener('click', () => void runSearch());
    input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') void runSearch(); });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target as Node) && e.target !== input) closeMenu(); });
    ctx.dispose.add(() => closeMenu());

    // "My location" — browser geolocation → forecast straight from coordinates.
    const geoBtn = el('button', { class: 'wx-go' }, ['📍 My Location']);
    geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) { flash('Geolocation unavailable'); return; }
      geoBtn.textContent = '…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geoBtn.textContent = '📍 My Location';
          addLocation({ name: 'My Location', lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => { geoBtn.textContent = '📍 My Location'; flash('Location permission denied'); },
        { timeout: 8000 },
      );
    });

    const hint = el('div', { class: 'wx-hint' }, ['']);
    let hintTimer = 0;
    function flash(msg: string): void {
      hint.textContent = msg;
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => { hint.textContent = ''; }, 4000);
    }

    const grid = el('div', { class: 'wx-grid' });
    const empty = el('div', { class: 'wx-empty' }, ['No locations yet — search a city or add one above.']);
    grid.append(empty);
    const stripHost = el('div', { class: 'wx-striphost' });
    stripHost.style.display = 'none';

    host.append(el('div', { class: 'wx' }, [
      el('div', { class: 'wx-bar' }, [
        el('h4', {}, ['Weather']),
        el('div', { class: 'wx-seg' }, [bBtn, sBtn]),
        el('div', { class: 'wx-seg' }, [cBtn, fBtn]),
        el('div', { class: 'wx-search' }, [input, goBtn, menu]),
        geoBtn,
        hint,
      ]),
      grid,
      stripHost,
    ]));

    // ---------- one weather card ----------
    function makeCard(loc: Location) {
      const root = el('div', { class: 'wx-card' });
      const x = el('button', { class: 'wx-x', title: 'Remove' }, ['✕']);
      x.addEventListener('click', () => removeLocation(loc.key));

      const cityEl = el('div', { class: 'wx-city' }, [loc.name.toUpperCase()]);
      const subEl = el('div', { class: 'wx-sub' }, [[loc.admin1, loc.country].filter(Boolean).join(' · ').toUpperCase()]);
      const timeEl = el('div', { class: 'wx-localtime' }, ['']);
      const body = el('div', {}, [el('div', { class: 'wx-msg' }, ['Loading forecast…'])]);
      root.append(x, cityEl, subEl, timeEl, body);

      let fc: Forecast | null = null;

      const paintTime = (): void => {
        const tz = fc?.tz || loc.timezone || '';
        const t = timeInZone(tz);
        timeEl.textContent = t ? `LOCAL ${t}` : '';
      };

      const repaint = (): void => {
        if (!fc) return;
        const u = unit;
        const cur = decode(fc.cur.code, fc.cur.isDay);
        const now = el('div', { class: 'wx-now' }, [
          el('div', { class: 'wx-icon' }, [cur.icon]),
          el('div', { class: 'wx-temp' }, [String(round(toDisplay(fc.cur.tempC, u)))]),
          el('div', { class: 'wx-cond' }, [
            el('div', { class: 'wx-desc' }, [cur.label]),
            el('div', { class: 'wx-feels' }, [`Feels ${round(toDisplay(fc.cur.feelsC, u))}°`]),
          ]),
        ]);
        (now.querySelector('.wx-temp') as HTMLElement).append(el('sup', {}, [`°${u}`]));

        const today = fc.days[0];
        const stats = el('div', { class: 'wx-stats' }, [
          stat('Sunrise', today ? clockOf(today.sunrise) : '—'),
          stat('Sunset', today ? clockOf(today.sunset) : '—'),
          stat('Humidity', `${round(fc.cur.humidity)}%`),
          stat('Wind', windDisplay(fc.cur.windKmh, u)),
        ]);

        const hours = el('div', { class: 'wx-hours' });
        for (const hp of fc.today) {
          const dec = decode(hp.code, isDaytimeHour(hp.hour, fc));
          hours.append(el('div', { class: 'wx-hr' }, [
            el('div', { class: 'h' }, [hourLabel(hp.hour)]),
            el('div', { class: 'i' }, [dec.icon]),
            el('div', { class: 't' }, [`${round(toDisplay(hp.tempC, u))}°`]),
          ]));
        }

        const todayStr = dateInZone(fc.tz);
        const days = el('div', { class: 'wx-days' });
        for (const dp of fc.days) {
          const dec = decode(dp.code, true);
          days.append(el('div', { class: 'wx-day' }, [
            el('div', { class: 'd' }, [weekdayOf(dp.date, todayStr)]),
            el('div', { class: 'di' }, [dec.icon]),
            el('div', { class: 'dc' }, [dec.label]),
            el('div', { class: 'dt' }, [
              document.createTextNode(`${round(toDisplay(dp.hiC, u))}°`),
              el('span', { class: 'lo' }, [`  ${round(toDisplay(dp.loC, u))}°`]),
            ]),
          ]));
        }

        body.replaceChildren(
          now, stats,
          el('div', { class: 'wx-sec' }, ['Upcoming today']), hours,
          el('div', { class: 'wx-sec' }, ['5-day forecast']), days,
        );
        paintTime();
      };

      const load = async (): Promise<void> => {
        try {
          const data = await fetchForecast(loc.lat, loc.lon, ac.signal);
          fc = data;
          repaint();
          // Publish this location's live current temp for external consumers.
          ctx.services.publishParam?.(`temp.${loc.key}`, round(fc.cur.tempC), { throttle: true });
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
          body.replaceChildren(el('div', { class: 'wx-msg err' }, ['⚠ Forecast unavailable — check connection']));
        }
      };

      return { root, load, repaint, paintTime };
    }

    const stat = (k: string, v: string): HTMLElement =>
      el('div', { class: 'wx-stat' }, [el('div', { class: 'k' }, [k]), el('div', { class: 'v' }, [v])]);

    // ---------- location lifecycle ----------
    function addLocation(m: GeoMatch): void {
      const key = nextKey();
      const loc: Location = {
        key, name: m.name, admin1: m.admin1, country: m.country,
        lat: m.lat, lon: m.lon, timezone: m.timezone,
      };
      locations.push(loc);
      empty.remove();
      const card = makeCard(loc);
      cards.set(key, card);
      grid.append(card.root);
      void card.load();
      publishLocationList();
      // Build the on-air strip once the first (anchor) city lands.
      if (mode === 'strip' && !activeStrip) renderStrip();
    }
    function removeLocation(key: string): void {
      const i = locations.findIndex((l) => l.key === key);
      if (i >= 0) locations.splice(i, 1);
      cards.get(key)?.root.remove();
      cards.delete(key);
      if (!locations.length) grid.append(empty);
      publishLocationList();
      // The anchor may have changed — re-point the strip at the new locations[0].
      if (mode === 'strip') renderStrip();
    }
    function publishLocationList(): void {
      ctx.services.publishParam?.('locations', locations.map((l) => l.name).join(' | '), { throttle: false });
    }

    // ---------- seed from routed feeds ----------
    async function seed(): Promise<void> {
      const queries = seedQueries(ctx.sources);
      for (const q of queries) {
        try {
          const matches = await geocode(q, ac.signal);
          if (matches[0]) addLocation(matches[0]);
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
        }
      }
    }
    void seed();

    // ---------- MQTT surface ----------
    ctx.services.advertiseParams?.([
      { name: 'unit', type: 'string', writable: true },
      { name: 'mode', type: 'string', writable: true },
      { name: 'locations', type: 'string', writable: false },
    ]);
    ctx.services.onParam?.('unit', (v) => { if (v === 'C' || v === 'F') setUnit(v, false); });
    ctx.services.onParam?.('mode', (v) => { if (v === 'board' || v === 'strip') setMode(v, false); });
    ctx.services.publishParam?.('unit', unit, { throttle: false });
    ctx.services.publishParam?.('mode', mode, { throttle: false });

    // ---------- live clocks + periodic refresh ----------
    ctx.dispose.interval(() => {
      for (const c of cards.values()) c.paintTime();
      activeStrip?.paintTime();
    }, 1000);
    ctx.dispose.interval(() => {
      for (const c of cards.values()) void c.load();
      if (mode === 'strip') void activeStrip?.load();
    }, 10 * 60 * 1000);
  },
};

export default plugin;
