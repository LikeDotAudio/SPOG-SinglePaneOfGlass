// src/editors/graphics-engine/weather-module — WEATHER as a CG template renderer.
//
// Weather is "just another dataset that fits the CG engine": this makes the live
// forecast a template the graphics engine hosts (rail entry + data fields +
// TAKE/OUT transport), rather than a standalone editor. It reuses the tested,
// editor-agnostic weather library — geocode + the on-air strip face + the SVG
// glyph set — as its render layer. City comes from the template's data field.
//
// renderGraphic() is synchronous & pure, but a forecast needs an async
// geocode+fetch; so this returns a container that self-populates. Reloads are
// debounced and stale paints bail via `isConnected`, so typing a city name
// doesn't spam the geocoding API.

import { el, addStyles } from '../../ui/dom.js';
import { geocode, type GeoMatch, type Location, type Unit } from '../weather/data.js';
import { makeStrip } from '../weather/faces/strip.js';

const GFX_WX_CSS = `
.gfx-weather{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:4.5% 3.5%;}
.gfx-weather .wx-strip{width:100%;max-height:none;height:100%;}
.gfx-weather .wx-strip-msg{margin:auto;}
`;

// City → geocode hit (or null), so re-paints on unrelated field edits and TAKEs
// don't re-hit the geocoder for a place we already resolved this session.
const geoCache = new Map<string, GeoMatch | null>();
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** The self-populating weather graphic body (appended inside the .gfx-weather graphic). */
export function weatherBody(values: Record<string, string>): HTMLElement {
  addStyles('gfx-weather', GFX_WX_CSS);
  const host = el('div', { class: 'gfx-weather-body' });
  host.style.width = '100%';
  host.style.height = '100%';
  host.append(el('div', { class: 'wx-strip-msg' }, ['Loading forecast…']));

  const city = (values.city || 'Toronto').trim();
  const unit: Unit = (values.unit || 'C').toUpperCase() === 'F' ? 'F' : 'C';
  const ac = new AbortController();

  void (async () => {
    await wait(320);                    // debounce keystroke-driven reloads
    if (!host.isConnected) return;      // a newer paint superseded this one
    try {
      const key = city.toLowerCase();
      let m = geoCache.get(key);
      if (m === undefined) {
        const matches = await geocode(city, ac.signal);
        m = matches[0] ?? null;
        geoCache.set(key, m);
      }
      if (!host.isConnected) return;
      if (!m) { host.replaceChildren(el('div', { class: 'wx-strip-msg err' }, [`No match for “${city}”`])); return; }
      const loc: Location = {
        key: 'gfx', name: m.name, admin1: m.admin1, country: m.country,
        lat: m.lat, lon: m.lon, timezone: m.timezone,
      };
      const strip = makeStrip(loc, { signal: ac.signal, getUnit: () => unit });
      host.replaceChildren(strip.root);
      await strip.load();
    } catch (e) {
      if ((e as Error).name !== 'AbortError' && host.isConnected) {
        host.replaceChildren(el('div', { class: 'wx-strip-msg err' }, ['⚠ Forecast unavailable']));
      }
    }
  })();

  return host;
}
