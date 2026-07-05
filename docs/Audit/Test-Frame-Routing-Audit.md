# Test‑Frame Routing Audit

*Every source and every destination carries a synthetic "test frame" — SMPTE bars + a moving ident + a reference tone — that can be routed through the whole crosspoint system and previewed wherever it lands.*

Date: 2026‑07‑05 · Branch: `modularity-200-line`

---

## 0. TL;DR

**The ask:** give each source a self‑identifying test frame of video (like a station's bars‑and‑tone), let it flow through the routing matrix, and render it at whatever destination / multiviewer / editor it reaches.

**The key realisation:** SPOG is a **100 % front‑end simulation** — a route is not a media pipe, it is a cloned `.signal-node` DOM chip inside a twist's drop‑zone (mirrored to a retained MQTT `…/crosspoints` topic). So "route a test frame through the system" does **not** mean WebRTC / real `MediaStream` transport. It means:

> **Every source owns a deterministic, identifiable *card renderer*. Every preview surface renders the card of whatever source‑label currently sits in its crosspoints.**

That keeps the feature 100 % consistent with the rest of the app (a sim), and it means we already have ~80 % of the parts.

**We are NOT starting from zero.** A complete SMPTE‑bars generator **and** a 1 kHz Web‑Audio tone graph already ship inside `src/editors/meter-input/live-input.ts`. A second bars implementation (with a bouncing "DVD‑logo" badge — an existing animated ident) lives in `src/editors/camera-control/bars.ts`. The multiviewer already lays routed feeds into a square wall of panes whose "screens" are text placeholders waiting to become canvases. Per‑destination canvas cards with self‑terminating rAF loops already mount in every room via `dest-fixtures.ts`.

**The delta is three small new things + wiring:**
1. a **shared test‑card module** (extract what's trapped in `live-input.ts`);
2. a **per‑source identity/format descriptor** (`VideoFormat` + a deterministic ident) — there is no numeric resolution/fps model today;
3. **preview surfaces** turned live at three seams (multiviewer pane → dest monitor card → optional source thumbnail).

---

## 1. Should the frames animate? Should there be synthetic audio? (the design question)

Both **yes** — but for *diagnostic* reasons, not decoration. This is the whole point of bars‑and‑tone in real broadcast.

### 1.1 Why animate
A static test card can't tell you whether a feed is **live, frozen, or dropped**. Broadcast test signals move for three concrete reasons, and each maps to something worth simulating here:

| Real‑world reason | What it detects | What we render |
| --- | --- | --- |
| **Frame counter / running timecode burn‑in** | Frozen feed, dropped frames, timing offset | A ticking `HH:MM:SS:FF` + frame number, burned into the card |
| **Moving ident element** (bouncing badge / clock) | "Is this pane alive?" at a glance across a wall | The existing `stepDVD` bouncing badge (`camera-control/bars.ts:59`) carrying the source name |
| **Moving zone plate** ([Snell & Wilcox SW2/SW4](https://en.wikipedia.org/wiki/Snell_%26_Wilcox_Zone_Plate)) | Scaler / compression / up‑down‑conversion artefacts | *Optional / stretch* — a slow zone‑plate mode for "stress" sources |

**Recommendation:** the cheap, high‑value animation is a **ticking counter + one bouncing ident badge**. That is enough to read, across a 16‑pane wall, "this pane is live **and** it is SOURCE X." Zone‑plate is a nice‑to‑have behind a mode toggle.

### 1.2 Why synthetic audio
The reference is a **1 kHz sine at −18 to −22 dBFS** ([EBU/SMPTE line‑up](https://en.wikipedia.org/wiki/SMPTE_color_bars)). This already exists (`ensureTone`/`updateTone` in `live-input.ts:85‑101`, at −22 dBFS, even running the real SMPTE L/R/silence line‑up sequence).

For **multi‑channel identification** — proving *which* channel is which after routing — broadcast uses **EBU channel‑ident tone** (channel 1 = continuous, channel 2 = interrupted bursts, …) or BLITS. Sources already model channels (`SourceLeaf.items[]`, `prefix`+`count`, stream `left/right`), so the tone generator can emit a per‑channel ident and you can *hear* that CH‑3 landed on the right console fader.

**The autoplay constraint:** browsers block audio without a user gesture. So audio must be **on‑demand** (unmute inside the multiviewer / meter‑input editor after a click), **never** auto‑playing across the whole grid. Everywhere else, represent the tone **visually** with the VU animation that already exists (`vuBank`/`meterBar` in `multi-viewer/index.ts`).

### 1.3 What it looks like, end to end
- Open a **video source** → its editor shows 75 % SMPTE bars with `V202 · 1080i59.94` and a running frame counter burned into the lower third, a bouncing "V202" badge, and (on unmute) a 1 kHz tone.
- **Drag `202` into `EDIT 101`'s PGM twist** → `EDIT 101`'s new **MONITOR card** now shows *those* bars with *that* counter — you can see at a glance the route took.
- **Open the multiviewer on a room** → a square wall of live cards, one per routed feed, each labelled with its UMD, each with its own ticking counter, dead panes obviously frozen.
- The tone, when unmuted in the MV/meter editor, ident‑beeps per channel so you can confirm channel mapping by ear.

---

## 2. What already exists (the 80 %)

| Capability | Where | Notes |
| --- | --- | --- |
| **SMPTE bars generator** | `src/editors/meter-input/live-input.ts:171` `drawBars()` | Full ECR‑1‑1978: 75 % bars + castellation + −I/white/+Q + PLUGE. Pure canvas fills. |
| **1 kHz tone graph** | `live-input.ts:85‑101` `ensureTone`/`updateTone` | `createOscillator` at −22 dBFS, L/R channel merger, real SMPTE line‑up timing. |
| **Blit‑to‑visible primitive** | `live-input.ts:196` `paint(cv)` | Draws current frame onto any visible canvas — the "mount a preview" call. |
| **2nd bars impl + moving ident** | `src/editors/camera-control/bars.ts` | `drawSMPTE()` + `stepDVD()` bouncing badge (existing animated element). |
| **Multiviewer wall** | `src/editors/multi-viewer/index.ts` | Builds panes from `ctx.sources` (routed feeds), square 2×2…16×16 layout. **`.mv-screen` is a text placeholder** (`index.ts:184`) — the seam. |
| **Per‑destination canvas cards** | `src/ui/console/dest-fixtures.ts:354` `mountDestFixtures` | `card()` + self‑terminating `animate()` rAF loop already mount clock/counter/chat into every room. |
| **Routed‑feed resolution** | `src/app/context.ts:25/36` `resolveSources`/`routedFeeds` | Reads live crosspoints from `.drop-zone > .signal-node`; where a synthetic feed would arrive to editors. |
| **Animation lifecycle** | `src/ui/timers.ts:12` `ctx.dispose.raf()` | Canonical rAF registration; host tears it down on close. |
| **Retained state bus** | `src/platform/mqtt/*` + `publishCrosspoints` (`matrix.ts:15`) | `…/crosspoints` already carries the source labels routed to each twist; last‑value cache replays to late subscribers. |
| **Audio‑channel model** | `SourceLeaf.items`/`count`/`prefix`, `StreamDef.left/right`, `sourceChannels()` (`topics.ts:82`) | Reuse to drive per‑channel tone ident. |

## 3. What's missing (the delta)

1. **No shared test‑card module.** The generator is trapped inside the meter‑input editor. Nothing else can call it.
2. **No per‑source identity or numeric format.** There is *no* `{resolution, fps}` type anywhere — format is decorative strings. A test frame must be *identifiable*: a deterministic ident (hue/number from `id`) + a burn‑in slate (name, id, format).
3. **No live preview on the source/destination grid.** Tiles are glyph + colored border only (`src/ui/sources/format.ts monoEmoji`); live imagery exists *only inside editors* today.
4. **No performance budget for many live canvases.** A wall of N sources at 30–60 fps needs one shared ticker, visibility gating, and a DPR cap — not N independent rAF loops.
5. **No routing→preview binding for destinations.** A destination shows routed chips, not a rendered monitor. Need to read the crosspoints and render the winning source's card.

---

## 4. Plan of action (phased)

Ordered so each phase ships something demoable and the risky/expensive bits are optional at the end.

### P0 — Extract the shared test‑card module *(pure refactor, no behaviour change)*
Create `src/domain/test-card/` with DOM‑free helpers lifted from `live-input.ts`:
```ts
// test-card/render.ts
drawCard(ctx: CanvasRenderingContext2D, spec: CardSpec, frame: number): void
// test-card/tone.ts
makeTone(audio: AudioContext, spec: ToneSpec): ToneHandle   // start/stop, per-channel ident
// test-card/types.ts
interface CardSpec { w; h; label; ident; format: VideoFormat; color; mode: 'bars'|'zoneplate' }
```
Then refactor `meter-input/live-input.ts` to consume it (proves the extraction, no visible change). This is the only phase that touches an existing working editor, so do it first and verify meter‑input still renders.

### P1 — Per‑source identity + format descriptor
- Add a small `VideoFormat` (`{ w, h, fps, scan: 'p'|'i' }`) — new, since none exists.
- Add `testCardFor(source: SourceLeaf): CardSpec` — one helper deriving a **deterministic** ident from `source.id` (stable hue + a numbered ident bar) and a burn‑in slate (name/id/format). Deterministic = the same source always looks the same, so you recognise it after routing.
- Reuse `sourceChannels()` to populate the tone's channel count/ident.

### P2 — Multiviewer becomes a live wall *(biggest visual payoff)*
Replace the `.mv-screen` placeholder (`multi-viewer/index.ts:184`) with a `<canvas>` that renders `testCardFor(routedFeed)` via one **shared rAF ticker** for the whole wall (draw only mounted panes; skip empty cells). This alone delivers "route a source → watch its test frame appear in the MV." Audio stays the existing VU animation until P5.

### P3 — Per‑destination MONITOR card
Add a `MONITOR`/`PGM` card to `mountDestFixtures` (`dest-fixtures.ts`) using the existing `card()` + `animate()` helpers. It reads the room's crosspoints (DOM or the retained `…/crosspoints` topic) and renders the card of the routed source(s). Now **every destination shows its routed test frame** — the literal ask.

### P4 — Source‑tile thumbnails *(optional, perf‑gated)*
Small live canvas on video source tiles in `pools.ts` (`fillVideoCameras`/`renderVideoPool`), gated by `IntersectionObserver`, low fps (e.g. 6–8 fps) or **static bars + animate‑on‑hover**. Only if the grid genuinely benefits; N tiny live canvases are the main perf risk of this whole feature.

### P5 — On‑demand audio ident
Wire `makeTone` into the MV / meter‑input behind a user‑gesture unmute button. Emit **per‑channel EBU‑style ident** (continuous / interrupted) so routed channels are identifiable by ear. Grid surfaces stay visual‑only.

### P6 — Bus integration *(optional, multi‑seat)*
Advertise a `testCard`/`ident` `ParamSpec` on source topics (`configForSource`, `topics.ts:93`) and a `testFrame: bool` value, so "test‑frame active" and the ident signature ride the retained bus — consistent across seats and observable by external MQTT tools.

---

## 5. Do we need a real `MediaStream` / WebRTC? — No.

Because routing is **label‑based DOM**, not a media transport, the test frame is a **per‑source deterministic renderer** and each preview surface renders the card of whatever label sits in its crosspoints. This avoids all WebRTC/`getUserMedia`/`captureStream` plumbing and keeps the feature a front‑end sim like everything else. The *only* real Web‑Audio usage is the optional local tone (P5), which is on‑demand and never leaves the tab. (`captureStream`/`getDisplayMedia` already exist in `live-input.ts` for the meter‑input "real input" mode, but the test‑frame feature does not require them.)

---

## 6. Effort & risk

| Phase | Effort | Risk |
| --- | --- | --- |
| P0 extract module | ~0.5 day | Low — pure refactor, verify meter‑input |
| P1 identity/format | ~0.5 day | Low — new pure helpers |
| P2 MV live wall | ~0.5–1 day | Med — shared ticker + perf on 16×16 |
| P3 dest monitor card | ~0.5 day | Low — mirrors existing fixture cards |
| P4 tile thumbnails | ~0.5–1 day | **High** — many live canvases; gate hard or skip |
| P5 audio ident | ~0.5 day | Med — autoplay gesture, per‑channel timing |
| P6 bus | ~0.5 day | Low — additive retained params |

**Core (P0–P3): ~2–3 focused days** and you have every source + destination carrying a routable, animated, self‑identifying test frame. P4–P6 are polish.

**Watch‑items:** (a) one shared rAF ticker, never N loops; (b) DPR‑cap canvases and pause off‑screen panes; (c) audio strictly behind a gesture; (d) deterministic idents so a source is recognisable after routing; (e) P0 is the only phase that risks an existing editor — verify meter‑input after it.

---

## 8. Identity design — how name, colour and shape drive the frame

The whole feature is worthless unless you can look at a routed frame and know *which source it is* — under any condition, including colour‑blind and grey/mono modes (the [Colour Engine work](../Colours%20and%20shapes.md) already commits us to **triple‑redundant** identity: never colour alone). So each card carries **three orthogonal identity channels**, all derived from fields the source already has:

| Channel | Source of truth | How it renders on the card | Fallback when absent |
| --- | --- | --- | --- |
| **Name** (text) | `SourceLeaf.name`, cleaned by `stripOrder()` (`format.ts`) | Burned‑in **UMD slate** (lower third) + the label on the moving ident badge | `id` |
| **Colour** (hue) | `SourceLeaf.color` (`Hex`, already authored on most leaves) | The frame **border**, the slate background wash, and the ident‑shape **fill** — *not* the bars (bars stay reference‑standard) | `hashHue(id)` — stable hue from an id hash |
| **Shape** (geometry) | **new** `ident` derived deterministically from `id` | The moving ident **badge geometry** + a static shape stamp in one corner | always present (derived) |

### 8.1 Names & colours
- **Name** is the human read. Clean the `NNN_` ordering prefix, show the rest big. It is also spoken by the audio ident slate (P5) if we ever want TTS — out of scope for now.
- **Colour** is the fast read. Use the authored `color` as the card's *dominant identity colour* (border + slate + shape fill), so a source is recognisable by wash alone across a wall. **Leave the SMPTE bars themselves standard** — they are a calibration reference; tinting them destroys their meaning. The source colour lives in the *chrome around* the bars.
- Respect the existing **Colour Engine modes** ([`Colours and shapes.md`](../Colours%20and%20shapes.md)): in `grey`/`mono` the colour channel collapses, so identity must survive on **name + shape alone**. That is the entire reason shape is a first‑class channel below.

### 8.2 Unique shapes per frame (the third channel)
Every source gets a **unique geometric ident** — the thing that makes two same‑colour, same‑category feeds tell‑apart‑able, and the *only* identity left in mono mode. Design:

- A **shape roster** of ~12 forms chosen to stay distinct at 24 px and in silhouette: `circle, square, triangle‑up, triangle‑down, diamond, pentagon, hexagon, star5, plus, chevron, ring, bowtie`.
- **Deterministic assignment:** `shapeIndex = hash(id) % roster.length`, `hue = hashHue(id)`. Same source → same shape+hue forever, so you recognise it *after* routing, on any surface.
- **Absolute uniqueness guarantee:** shape+hue can collide across a large plant, so the burned‑in **numeric ident** (a stable per‑source integer, e.g. from `id`) is the tie‑breaker. Read order for a human: *shape → colour → number → name*.
- The unique shape **is** the moving ident badge (it replaces `stepDVD`'s generic DVD logo in `camera-control/bars.ts:59`): a bouncing `[▲ V202]` chip whose geometry, fill and label are the source's three channels in one moving object — motion proves "live", the shape/colour/number prove "who".

`testCardFor(source)` (P1) resolves all three channels in one place:
```ts
interface CardIdent { name: string; hue: number; shape: ShapeKind; num: number }
function identFor(s: SourceLeaf): CardIdent   // color→hue, id→shape+num, name cleaned
```

## 9. Format — 1:1 aspect, 100 fps mezzanine

The card is authored in a single fixed **mezzanine** format, distinct from any real broadcast raster:

```ts
const MEZZANINE: VideoFormat = { w: 1080, h: 1080, fps: 100, scan: 'p', label: '1080²p100' };
```

- **1:1 aspect (square).** This aligns with the recent **square multiviewer wall** (`multi-viewer` "square wall + UMD" commit) — a square card drops into a `cols×cols` grid with zero letterboxing, and the SMPTE bars re‑lay into a square field (bars fill the top ⅔, PLUGE/pluge strip the bottom, ident badge floats over). Every mount surface can therefore assume `w === h` and never has to reason about aspect.
- **100 fps mezzanine, decoupled from render.** 100 fps is the **logical/reference** rate the format *advertises* and the frame counter *counts at* — it is **not** the canvas redraw rate. Reconciliation (this is the load‑bearing perf decision):
  - **Logical frame number** `= floor(elapsedMs / 10)` (10 ms per frame at 100 fps). Timecode burns in as `HH:MM:SS:FF` with **FF = 00–99** — the distinctive "100p" slate look, and a built‑in way to *see* dropped render frames (counter jumps > 1).
  - **Render** stays on the display‑capped shared rAF (~60 Hz) and throttles/pauses off‑screen panes. The counter still reads a true 100 fps because it is computed from elapsed time, not from redraw count.
  - So "100 fps mezzanine" is honoured as the signal's declared cadence and its burned‑in timecode, without asking the browser to actually paint 100×/s across a 16‑pane wall.

The format string `1080²p100` is what shows on the slate and in any `config` advertisement — instantly legible as "square, progressive, 100".

## 10. Deployment plan — what changes, in what order, how it ships

### 10.1 What actually changes (by artefact)
| Artefact | Change | Deploy consequence |
| --- | --- | --- |
| **Code (`src/`)** | New `src/domain/test-card/` (render + tone + ident + `MEZZANINE`); consumers at `multi-viewer/index.ts:184`, a new `dest-fixtures.ts` MONITOR card, `context.ts` synthetic feed | Ships with a normal **JS bundle** deploy — no Routes touched |
| **`SourceLeaf` type** (`src/model/sources.ts`) | Add optional `testCard?: { shape?: ShapeKind; hueOverride?: Hex; format?: 'MEZZANINE' }` — **purely optional override**; identity is fully *derived* by default | Type‑only; no data migration |
| **Routes JSON** | **None required.** Identity derives from existing `name`/`color`/`id`. Author overrides only if a specific source wants a hand‑picked shape | Avoids the Routes deploy path entirely (see gotcha below) |
| **`dispatch.test.ts`** | If P0 lands the shared module as a *non‑editor* (recommended, like `weather/`), the `PLUGINS.length` count is **unchanged**. Only bump it if we add a standalone test‑frame editor | Keep it a shared module → no test churn |

**Design bias: derive, don't author.** Keeping identity 100 % derived from fields that already exist means the whole feature ships as a **code‑only deploy** — no `Routes/**` changes, so it sidesteps the [deploy‑routes gotcha](../../CHANGELOG.md) (committed Routes JSON need `npm run deploy:all`/`--all` or they never reach the server). If we *do* add authored `testCard` overrides later, those JSON edits **must** go out with `deploy:all`.

### 10.2 Rollout order (maps onto the phases in §4)
1. **P0 shared module** → deploy with `deploy.py --next` / `npm run deploy:next` (safe **side‑by‑side**, does not touch the live `js/`). Verify `meter-input` still renders identically — it is the only existing editor the refactor touches.
2. **P1 ident/format** → same `--next` lane. Nothing user‑visible yet; unit‑test `identFor()` (deterministic, colour‑blind/mono cases) and the 100 fps counter math.
3. **P2 multiviewer live wall** → `--next`, then **visually verify** via the vite‑dev + puppeteer recipe (open a room's MV, drop sources, confirm each pane shows the right shape/colour/name and the counter ticks). First genuinely demoable build.
4. **P3 per‑destination MONITOR card** → `--next`, verify a route lights the destination's monitor with the matching card.
5. **Cutover:** once P2–P3 look right on the `--next` lane, promote with a normal `npm run deploy` (destructive cutover per the side‑build convention); the lane‑aware SW + BUILD chip handle cache‑busting.
6. **P4–P6** (tile thumbnails / audio ident / bus params) ship incrementally on the same cadence; P4 stays behind an `IntersectionObserver` + low‑fps gate before it ever hits the live grid.

### 10.3 Verification gates before cutover
- **Identity:** a colour‑blind sim pass and a `mono`‑mode pass — every routed pane still distinguishable on **shape + number** with colour removed.
- **Format:** slate reads `1080²p100`; timecode FF field cycles 00–99; a deliberately stalled pane shows a frozen counter (proves the "live" tell works).
- **Perf:** 16×16 MV wall holds interactive frame‑time with one shared ticker; off‑screen panes measurably idle.
- **Audio (P5):** silent until a click; per‑channel ident audibly distinct L vs R.

---

## 7. References
- SMPTE color bars & 1 kHz line‑up tone — [Wikipedia](https://en.wikipedia.org/wiki/SMPTE_color_bars), [SMPTE RP‑219 75 % bars](https://www.tvtechnology.com/opinions/testing-sdhd3gsdi)
- Moving zone plate (scaler/compression stress) — [Snell & Wilcox Zone Plate, Wikipedia](https://en.wikipedia.org/wiki/Snell_%26_Wilcox_Zone_Plate)
- Browser synthesis: [Canvas + `captureStream` + `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API), Web Audio `OscillatorNode`
- Test cards / bars‑and‑tone practice — [Test card, Wikipedia](https://en.wikipedia.org/wiki/Test_card)
</content>
</invoke>
