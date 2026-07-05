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

## 7. References
- SMPTE color bars & 1 kHz line‑up tone — [Wikipedia](https://en.wikipedia.org/wiki/SMPTE_color_bars), [SMPTE RP‑219 75 % bars](https://www.tvtechnology.com/opinions/testing-sdhd3gsdi)
- Moving zone plate (scaler/compression stress) — [Snell & Wilcox Zone Plate, Wikipedia](https://en.wikipedia.org/wiki/Snell_%26_Wilcox_Zone_Plate)
- Browser synthesis: [Canvas + `captureStream` + `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API), Web Audio `OscillatorNode`
- Test cards / bars‑and‑tone practice — [Test card, Wikipedia](https://en.wikipedia.org/wiki/Test_card)
</content>
</invoke>
