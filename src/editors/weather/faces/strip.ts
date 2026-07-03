// src/editors/weather/faces/strip — the ON-AIR broadcast "forecast strip" face
// (audit §2/§3, P2). A fixed, horizontal, left→right timeline for ONE anchor
// city — the graphic a viewer sees, as opposed to the operator `board` grid:
//
//   RIGHT NOW │ THIS EVENING │ TOMORROW AM │ TOMORROW PM │  3-DAY OUTLOOK
//   (anchor)  │  (tonight)   │  (wake-up)  │   (peak)    │  Sun Mon Tue
//
// Pure projection over one Forecast via dayparts() — no extra API shape. Icons
// are the currentColor SVG glyphs from ../icons (not emoji), so the LCARS accent
// + Colour Engine drive them. Severe codes (WMO 95/96/99) raise a red banner.

import { el, addStyles } from '../../../ui/dom.js';
import { svgForCode } from '../icons.js';
import {
  type Forecast, type Location, type Unit, type Daypart,
  fetchForecast, dayparts, decode, toDisplay, round,
  timeInZone, dateInZone, weekdayOf,
} from '../data.js';

const STRIP_CSS = `
.wx-strip{position:relative;display:flex;gap:2px;width:100%;min-height:230px;max-height:56vh;
  border-radius:14px;overflow:hidden;border:1px solid #1d3a52;
  background:linear-gradient(160deg,#0a1a2b 0%,#06101b 60%,#050a12 100%);color:#eaf4ff;}
.wx-p{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:7px;padding:16px 10px;text-align:center;min-width:0;}
.wx-p + .wx-p,.wx-out{border-left:1px solid #12263a;}
.wx-p-lab{font:800 10px 'Courier New',monospace;letter-spacing:2px;color:#4EC0FF;text-transform:uppercase;}
.wx-p-sub{font:700 9px 'Courier New',monospace;letter-spacing:1.5px;color:#7ea6c8;text-transform:uppercase;}
.wx-p-temp{font:200 40px/0.9 'Helvetica Neue',Arial,sans-serif;letter-spacing:-1px;color:#fff;}
.wx-p-cond{font:800 10px 'Courier New',monospace;letter-spacing:1px;color:#cfe6fb;text-transform:uppercase;}
.wx-glyph{color:#dfe8f5;}
/* anchor "right now" panel — the big one on the far left */
.wx-p-now{flex:1.8;align-items:flex-start;justify-content:space-between;
  background:linear-gradient(160deg,rgba(78,192,255,.10),transparent);}
.wx-p-city{font:800 16px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.wx-p-sub2{font:700 9px 'Courier New',monospace;letter-spacing:1.5px;color:#7ea6c8;text-transform:uppercase;margin-top:2px;}
.wx-p-row{display:flex;align-items:center;gap:14px;}
.wx-p-now .wx-p-temp{font-size:74px;}
.wx-p-now .wx-glyph{color:#fff;filter:drop-shadow(0 3px 8px rgba(0,0,0,.5));}
.wx-p-time{font:800 11px 'Courier New',monospace;letter-spacing:1px;color:#4EC0FF;}
/* 3-day outlook cluster on the far right */
.wx-out{flex:1.4;display:flex;align-items:stretch;padding:12px 9px;gap:6px;}
.wx-out-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
  background:#07131f;border:1px solid #12263a;border-radius:9px;padding:9px 4px;min-width:0;}
.wx-out-d{font:800 10px 'Courier New',monospace;letter-spacing:1px;color:#cfe6fb;}
.wx-out-t{font:800 11px 'Courier New',monospace;color:#eaf4ff;white-space:nowrap;}
.wx-out-t .lo{color:#6f92b0;}
.wx-strip-msg{margin:auto;padding:34px;font:700 12px 'Courier New',monospace;letter-spacing:1px;color:#7ea6c8;}
.wx-strip-msg.err{color:#ff9db0;}
/* severe-weather banner (WMO 95/96/99) — glyph+text, never colour alone */
.wx-strip.severe{outline:2px solid #ff5a6e;outline-offset:-2px;}
.wx-strip-banner{position:absolute;left:0;right:0;bottom:0;background:#c8283c;color:#fff;padding:5px;
  font:800 10px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;text-align:center;}
`;

const SEVERE = new Set([95, 96, 99]);

export interface StripDeps {
  signal: AbortSignal;
  getUnit(): Unit;
  publishTemp?(tempC: number): void;
}

export interface StripHandle {
  root: HTMLElement;
  load(): Promise<void>;
  repaint(): void;
  paintTime(): void;
}

/** Build a strip face for one anchor location. Owns its own fetch/repaint,
    driven by the caller's AbortController + unit getter (like makeCard). */
export function makeStrip(loc: Location, deps: StripDeps): StripHandle {
  addStyles('twist-editor-weather-strip', STRIP_CSS);
  const root = el('div', { class: 'wx-strip' });
  root.append(el('div', { class: 'wx-strip-msg' }, ['Loading forecast…']));
  let fc: Forecast | null = null;
  let timeEl: HTMLElement | null = null;

  const glyph = (code: number, isDay: boolean, size: number): SVGElement =>
    svgForCode(code, isDay, { size, title: decode(code, isDay).label });

  const paintTime = (): void => {
    if (!timeEl) return;
    const t = timeInZone(fc?.tz || loc.timezone || '');
    timeEl.textContent = t ? `LOCAL ${t}` : '';
  };

  const midPanel = (dp: Daypart, t: (c: number) => string): HTMLElement => {
    const p = el('div', { class: 'wx-p' }, [el('div', { class: 'wx-p-lab' }, [dp.label])]);
    p.append(
      glyph(dp.code, dp.isDay, 46),
      el('div', { class: 'wx-p-temp' }, [t(dp.tempC)]),
      el('div', { class: 'wx-p-sub' }, [dp.sub]),
    );
    return p;
  };

  const repaint = (): void => {
    if (!fc) return;
    const u = deps.getUnit();
    const t = (c: number): string => `${round(toDisplay(c, u))}°`;
    const dp = dayparts(fc);
    const now = dp.panels[0]!;

    // Panel 1 — the anchor "right now".
    const timeNode = el('div', { class: 'wx-p-time' }, ['']);
    timeEl = timeNode;
    const nowRow = el('div', { class: 'wx-p-row' });
    nowRow.append(glyph(now.code, now.isDay, 76), el('div', { class: 'wx-p-temp' }, [t(now.tempC)]));
    const nowP = el('div', { class: 'wx-p wx-p-now' }, [
      el('div', {}, [
        el('div', { class: 'wx-p-city' }, [loc.name.toUpperCase()]),
        el('div', { class: 'wx-p-sub2' }, [[loc.admin1, loc.country].filter(Boolean).join(' · ').toUpperCase()]),
      ]),
      nowRow,
      el('div', { class: 'wx-p-cond' }, [decode(now.code, now.isDay).label]),
      timeNode,
    ]);

    // Panels 2–4 — evening / tomorrow AM / tomorrow PM.
    const mids = dp.panels.slice(1).map((p) => midPanel(p, t));

    // Panel 5 — the 3-day outlook cluster.
    const todayStr = dateInZone(fc.tz);
    const out = el('div', { class: 'wx-out' });
    for (const d of dp.outlook) {
      const col = el('div', { class: 'wx-out-col' }, [el('div', { class: 'wx-out-d' }, [weekdayOf(d.date, todayStr)])]);
      col.append(glyph(d.code, true, 30));
      const tt = el('div', { class: 'wx-out-t' });
      tt.append(document.createTextNode(t(d.hiC)), el('span', { class: 'lo' }, [`  ${t(d.loC)}`]));
      col.append(tt);
      out.append(col);
    }

    root.replaceChildren(nowP, ...mids, out);

    // Severe-weather affordance: outline + a red glyph+text banner.
    const severe = SEVERE.has(fc.cur.code);
    root.classList.toggle('severe', severe);
    if (severe) root.append(el('div', { class: 'wx-strip-banner' }, ['⚠ Severe thunderstorm warning']));
    paintTime();
  };

  const load = async (): Promise<void> => {
    try {
      fc = await fetchForecast(loc.lat, loc.lon, deps.signal);
      repaint();
      deps.publishTemp?.(fc.cur.tempC);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      timeEl = null;
      root.replaceChildren(el('div', { class: 'wx-strip-msg err' }, ['⚠ Forecast unavailable — check connection']));
    }
  };

  return { root, load, repaint, paintTime };
}
