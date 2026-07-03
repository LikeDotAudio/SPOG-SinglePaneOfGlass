# Weather Forecast Strip — Broadcast Face & Icon Library Audit

**Status:** proposal · **Date:** 2026-07-03 · **Author:** production
**Subject:** turn the operator‑facing WEATHER dashboard into an **on‑air Chyron‑style
forecast strip** graphics source, with a season‑complete icon library and a
WYSIWYG city‑API editor.

---

## 0. TL;DR

A live WEATHER source already exists (`src/editors/weather/index.ts`, on branch
`worktree-weather-graphic`). It is a **control‑room dashboard**: a responsive grid
of city *cards*, each a vertical stack (big temp → stat quad → hourly scroller →
5‑day list). It pulls **real** data from Open‑Meteo (keyless, CORS, no secret) and
already publishes to the MQTT bus.

The brief in this ticket is a **different graphic** that shares the same data:
a fixed, horizontal, **left‑to‑right broadcast timeline** —

```
┌──────────────┬───────────┬───────────┬───────────┬───────────────┐
│  RIGHT NOW   │  EVENING  │  TMRW AM  │  TMRW PM  │  3‑DAY OUTLOOK │
│  (anchor)    │  (tonight)│  (low)    │  (high)   │  Sun Mon Tue   │
│  28° ☀       │  19° 🌙   │  15° 🌤   │  31° ☀    │  ▢  ▢  ▢       │
│  WHITBY, ON  │  9 PM     │  wake‑up  │  peak     │  hi/lo + icon  │
└──────────────┴───────────┴───────────┴───────────┴───────────────┘
```

**Recommendation:** don't fork. Extend the existing source with a **render‑mode
switch** — `board` (the current operator grid) vs `strip` (the new on‑air face) —
factor the data + icon layers into shared modules, and give the editor an on‑air
preview. The data pipe is done; the work is a **face**, an **icon set**, and
**editor chrome**. Est. 3–4 focused days.

> **Why one editor, not a second plugin:** editor dispatch is **first‑match on the
> twist *name*** (`plugin.match(twistName)` in `registry.ts`), **not** on
> `extraClass`. The weather plugin already claims `/weather|forecast/i` at
> `order: 9`, so a separate "strip" editor would either collide or have to steal a
> narrower name — and every new plugin also forces a bump to the
> `PLUGINS.length` assertion in `src/editors/dispatch.test.ts`. A **mode inside the
> existing plugin** sidesteps all of that: no dispatch ambiguity, no test churn,
> and the two faces share one data fetch.

---

## 1. What exists today (reuse inventory)

`src/editors/weather/index.ts` (510 LOC), route `006_Graphics/005_Weather.json`
(`kind:"video"`, `extraClass:"weather-source"`). Reusable as‑is:

| Layer | Symbol | Reuse verdict |
|---|---|---|
| Geocode | `geocode(query, signal)` → Open‑Meteo geocoding | **Keep** — this is the "connect to an API by city" |
| Forecast fetch | `fetchForecast(lat, lon, signal)` — current + hourly + daily, `timezone:auto` | **Keep** — already returns everything the strip needs |
| Data model | `Forecast { cur, today[], days[] }`, `HourPt`, `DayPt` | **Keep**, extend (see §3) |
| Condition decode | `WMO: Record<number, {t,d,n?}>`, `decode(code, isDay)` | **Promote** to a shared icon module (§4) |
| Time/zone helpers | `timeInZone`, `dateInZone`, `clockOf`, `weekdayOf`, `isDaytimeHour` | **Keep** |
| Units | `toDisplay`, `windDisplay` (C/F, km/h/mph) | **Keep** |
| Seed from routed feeds | `seedQueries(ctx.sources)` — feed labels like `"TORONTO, ON"` become cities | **Keep** |
| MQTT surface | `advertiseParams`/`publishParam`/`onParam` for `unit`, `locations`, `temp.<key>` | **Keep**, extend (§6) |

**The gap** is purely presentational + authoring:
1. There is **no horizontal, panel‑partitioned on‑air layout.**
2. Icons are **emoji** (`☀️ 🌙 ⛅`) — fine on a dashboard, **wrong for air**
   (renders differently per OS/font, no brand control, no colour‑engine hook).
3. The editor is a *data console*, not an *on‑air designer* — no framing/safe‑area,
   no per‑panel toggles, no "what goes to the switcher" preview.

---

## 2. The delta at a glance

| | Board (built) | Strip (this proposal) |
|---|---|---|
| Audience | operator / meteorologist | **viewer at home** |
| Geometry | auto‑fill card grid, scrolls | **fixed 5 panels, 16:9, no scroll** |
| Time model | now + 10 hourly + 5 daily, all shown | **curated dayparts**: now, tonight, tmrw‑AM, tmrw‑PM, +3 day |
| Icons | emoji | **inline SVG library**, colour‑engine aware |
| Motion | none | optional panel **reveal / wipe** (left→right) |
| Editor | search + add cities | **on‑air preview + framing + panel toggles** |

---

## 3. Data → panel mapping (no new API calls)

`fetchForecast` already pulls `hourly.temperature_2m/weather_code` and
`daily.*`. The five panels are pure selections over that payload — add one
derivation helper, `dayparts(fc, tz)`:

| Panel | Source field | Derivation |
|---|---|---|
| **1 · Right Now** | `fc.cur` | current temp + `decode(cur.code, cur.isDay)`, city + local clock. The anchor: 2× type size. |
| **2 · Later This Evening** | `fc.today[]` hourly | pick the hourly point nearest **21:00 local** (fallback: last point today). Force **night icon** (`decode(code,false)`). Label = `"TONIGHT"` / `"9 PM"`. |
| **3 · Tomorrow Morning** | `fc.days[1].loC` + hourly | tomorrow's **low**, icon from ~08:00 hourly slot. Label `"TMRW AM"` / `"WAKE‑UP"`. |
| **4 · Tomorrow Afternoon** | `fc.days[1].hiC` + `days[1].code` | tomorrow's **high** + daily icon (day). Label `"TMRW PM"` / `"PEAK"`. |
| **5 · 3‑Day Outlook** | `fc.days[2..4]` | three stacked mini‑columns: weekday, icon, `hi° / lo°`. |

To fill panels 2–3 cleanly, widen the hourly window (currently the *next 10 hours*
from now) to **~36 hours** so an 08:00‑tomorrow slot is always present:

```ts
// fetchForecast: forecast_days already 6; today[] slice 10 → 36 is enough
const today: HourPt[] = times.slice(start, start + 36).map(...)   // rename → hourly[]
```

`dayparts()` then does `pickHourNear(hourly, tz, 21)`, `pickHourNear(hourly, tz, 8, +1day)`.
No schema break — `board` keeps reading `hourly[0..10]`.

---

## 4. The seasonal icon library (the meat of the ticket)

**Decision: ship inline, single‑colour‑controllable SVG, not emoji or raster.**
Rationale: crisp at any broadcast resolution, one source of truth, and it plugs
straight into the **Colour Engine** (low‑vis/high‑vis/grey/mono modes) and the
already‑shape‑coded design language. Emoji stay as the dashboard fallback.

New module: `src/editors/weather/icons.ts`

```ts
export type WxGlyph =
  | 'clear-day' | 'clear-night'
  | 'partly-day' | 'partly-night'
  | 'overcast' | 'fog'
  | 'wind'
  | 'drizzle' | 'rain' | 'rain-heavy' | 'showers'
  | 'freezing-rain' | 'sleet'          // mixed precip
  | 'thunder' | 'thunder-severe'
  | 'flurries' | 'snow' | 'snow-heavy' | 'blowing-snow'
  | 'ice' | 'hail';

/** WMO code (+ day/night + severity flags) → one canonical glyph. */
export function glyphFor(code: number, isDay: boolean): WxGlyph { … }

/** The glyph as an inline <svg>, single `currentColor` path so the
    Colour Engine + LCARS palette drive its stroke/fill. */
export function svgFor(g: WxGlyph, opts?: { size?: number; night?: boolean }): SVGElement { … }
```

### 4.1 Coverage matrix — the brief's icon list → glyph → WMO trigger

| Brief icon | `WxGlyph` | WMO codes (day/night) | Season |
|---|---|---|---|
| Clear / Sunny | `clear-day` | 0,1 (day) | year‑round |
| Clear (night) | `clear-night` | 0,1 (night) | year‑round |
| Partly cloudy | `partly-day` / `partly-night` | 2 | year‑round |
| Overcast | `overcast` | 3 | year‑round |
| Fog / haze | `fog` | 45,48 | year‑round |
| Wind / breezy | `wind` | (derived: `wind_speed_10m` > 40 km/h overlays onto base) | year‑round |
| Light rain / showers | `drizzle` / `showers` | 51,53,80 | spring·summer |
| Heavy rain | `rain-heavy` | 55,63,65,81 | spring·summer |
| Thunderstorms | `thunder` | 95 | summer |
| Severe storms | `thunder-severe` | 96,99 (+ **red alert banner**, §4.3) | summer |
| Flurries | `flurries` | 71,77,85 | fall·winter |
| Snow | `snow` / `snow-heavy` | 73,75,86 | winter |
| Mixed / sleet | `sleet` | 66,67 | winter |
| Freezing rain | `freezing-rain` | 56,57 | winter |
| Blowing snow / blizzard | `blowing-snow` | 75 + wind>40 | winter |
| Ice | `ice` | (derived: temp<0 & precip) | winter |

**21 glyphs** covers a full Canadian year. Each glyph is composed from **shared
primitives** (`sun`, `moon`, `cloud`, `raindrop`, `flake`, `bolt`, `motion‑lines`,
`fog‑bars`) so the set is ~8 base shapes recombined — small code, consistent line
weight, matches the "category already shape‑coded" design finding.

### 4.2 Day/night & season are *data‑driven*, not manual
- Day/night from `cur.is_day` and per‑hour sunrise/sunset (`isDaytimeHour` exists).
- "Season" is emergent — you never pick a season; the WMO code for the location's
  date *is* the season (snow codes only appear in winter). So the same strip works
  in Whitby in January and July with zero operator action.

### 4.3 Severity affordance (ties into the Colour Engine)
Codes 96/99 (thunder+hail) and a future NWS/ECCC alert feed raise a **red warning
banner** across the strip footer + pulse the affected panel border. This is the one
place colour carries meaning alone → give it a **glyph + text** ("SEVERE") per the
Colours & Shapes audit, not colour‑only.

---

## 5. The editor (what "connect to an API by city" looks like)

Same `EditorPlugin` contract, same `render(host, ctx)`. The editor becomes an
**on‑air designer** with a live preview of exactly what hits the switcher.

```
┌─ WEATHER · FORECAST STRIP ─────────────────────────────────────────────┐
│ [ BOARD | ▓STRIP▓ ]   °C |°F    City,Prov ⌕ [＋Add] 📍   ⟳ 10:00        │  ← mode + data bar
├────────────────────────────────────────────────────────────────────────┤
│  ┌── on‑air preview (16:9, title‑safe guides) ─────────────────────┐    │
│  │  RIGHT NOW │ EVENING │ TMRW AM │ TMRW PM │  3‑DAY               │    │  ← WYSIWYG, exactly to air
│  │   28° ☀    │  19° 🌙 │  15° 🌤 │  31° ☀  │  S▢ M▢ T▢            │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│  Panels:  ☑ Now  ☑ Evening  ☑ Tmrw AM  ☑ Tmrw PM  ☑ 3‑Day               │  ← per‑panel toggles
│  Anchor city: [ WHITBY, ON ▾ ]   Theme: [ LCARS ▾ ]   Icons: [ SVG ▾ ]   │
│  Reveal: [ none | wipe‑L→R | fade ]     Banner: auto‑severe ☑            │
└────────────────────────────────────────────────────────────────────────┘
```

Editor behaviours:
- **Mode toggle** `board`/`strip` reuses the segmented‑control pattern already in
  the file (`.wx-btn.on`); persists via `publishParam('mode', …)`.
- **City search** is the existing `runSearch()`/`geocode()` flow — one hit adds,
  many hits show the pick menu. The **anchor city** dropdown chooses which routed
  location drives Panel 1; the rest of the strip follows the same city.
- **Preview is the render** — the strip face renders into the preview box at editor
  scale and to the program output at full res (same DOM, CSS `container` units), so
  the operator authors exactly what airs. Add **title‑safe / action‑safe guides**.
- **Per‑panel toggles** let a 30‑second hit drop to 3 panels; the strip re‑flows.
- **Icons dropdown** SVG (air) vs emoji (quick/legacy).
- **Tooltips**: use `src/ui/tip.ts` (shared tip system) for every control, per the
  Tooltips audit — the tips are derivable from `EditorContext` (city, units, feed).

---

## 6. MQTT surface (extends what's already advertised)

Current: `unit` (rw), `locations` (ro), `temp.<key>` (ro). Add:

| Param | Dir | Use |
|---|---|---|
| `mode` | rw | `board`/`strip` — flip the on‑air layout from automation/GPI |
| `anchor` | rw | which city is Panel 1 |
| `panels` | rw | bitmask/csv of enabled panels (rundown‑driven) |
| `reveal` | w | trigger the L→R wipe on take |
| `alert` | ro | severe‑weather banner state, for downstream ticker/CG |

This is the GPI/rundown wiring from the TWIST→MQTT and RC1000 audits: the strip is
just another twist on the bus; the switcher/rundown drives `mode`/`panels`/`reveal`.

---

## 7. File plan

```
src/editors/weather/
  index.ts        # slimmed: register plugin, build editor chrome, mode switch
  data.ts         # NEW  — geocode, fetchForecast, Forecast model, dayparts()   (moved out of index)
  icons.ts        # NEW  — WxGlyph, glyphFor(), svgFor() + shared primitives
  faces/
    board.ts      # the existing card‑grid render (operator dashboard)
    strip.ts      # NEW  — the 5‑panel on‑air Chyron face
Routes/Sources/006_Graphics/005_Weather.json   # +extraClass hint / default mode
docs/Audit/Weather-Forecast-Strip-Audit.md     # this file
```

Mirrors the **clock**/**chronos** split already in the repo (controllers + a
glob‑collected `faces/`/`displays/` dir, per‑card display picker) — so the pattern
is proven here.

---

## 8. Phases

| Phase | Deliverable | Est |
|---|---|---|
| **P0 ✅** | `data.ts` extracted (board unchanged) + hourly window widened to 48h + `dayparts()` — done, typechecks, tested | 0.5 d |
| **P1 ✅** | `icons.ts` — 21 SVG glyphs from ~8 primitives + `glyphFor` mapping — done, mapping tested | 1 d |
| **P2** | `faces/strip.ts` — the 5 panels, fixed 16:9, reads `dayparts()` | 1 d |
| **P3** | Editor chrome — mode toggle, on‑air preview + safe guides, per‑panel toggles, anchor picker | 1 d |
| **P4** | MQTT `mode/anchor/panels/reveal/alert` + severe banner + reveal wipe | 0.5 d |

Front‑end simulation only (like the rest of TwistRouting) **except** the Open‑Meteo
calls, which are genuinely live. No keys, no backend.

---

## 9. Open questions

1. **Anchor vs multi‑city on the strip** — brief implies one city (Whitby) end‑to‑end.
   Confirm the strip is single‑anchor (board stays multi‑city). *Assumed: yes.*
2. **Alert feed** — Open‑Meteo has no official alerts. Severe is inferred from WMO
   96/99 for now; a real ECCC/NWS CAP feed is a follow‑on.
3. **Motion** — CSS wipe/fade is cheap; anything richer (particle rain/snow) is a
   nice‑to‑have, not P0.
4. **Deploy** — new committed Routes JSON needs `deploy:all`/`--all`, not bare
   `npm run deploy` (see the deploy‑routes gotcha).
