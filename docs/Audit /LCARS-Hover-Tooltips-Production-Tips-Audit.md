# Audit — Hover Tooltips & Production Tips Across the LCARS Windows ("Tool Ticks")

**Companion to:**
- `Flexible-Software-Media-Production-Requirements-Audit.md` (App IDs `AR.x`; what each App *is*)
- `TwistRouting-vs-Requirements-Delta.md` (L0–L4 maturity scale, reused here)
- `Production-Entities-People-Places-Things-Audit.md` (people/places/things — the entities a tip describes)
- `Signal-Conditioner-Row-Design-Audit.md`, `Graphics-Engine-Audit.md`, `Teleprompter-Source-Audit.md` (the individual windows audited below)
- `General-Patch-Matrix-Routing-Audit.md` (the matrix / "what is routed where" — the source of the *expectations* a tip surfaces)

**What this audits.** Every **LCARS window** in the app — the 19 full-screen twist editors and the console/chrome overlays — and how each one benefits from **hover tooltips** ("tool ticks") that tell an operator two things at a glance:

1. **What the production expects of this window** — the contract: what signal it *accepts* (video / audio / both / camera), how many inputs it can take, what is *currently routed in*, which sibling twists it coordinates with, and which **role/capability** is required to touch it.
2. **What this window (and each control) actually does** — the function, and for meters/scopes/graphs, *how to read them* (the "✓ Good / ✕ Bad" guidance).

**The one-line thesis.** *Tooltips are a **derived function of the `EditorContext`**, not per-widget hand-labelling.* Every editor already receives — as typed data, resolved by the host — exactly what a "what the production expects" tip needs (`twist.config.accepts`/`inputs`/`maxVideo`, the live `sources[]`, the owning `production`, and `requiredCaps`/`can()`). One editor, **Meter Input**, has *already built* the hover-help pattern we want (`lead` + `✓ Good` / `✕ Bad`, positioned tip, `cursor:help`). The work is therefore small and mostly mechanical: **(a)** promote Meter Input's private tip system into a shared `src/ui/tip.ts`, **(b)** auto-generate a "Production Expectations" tip on every window's title rail *from context*, and **(c)** hand-author a short "what it does / how to read it" line for the handful of controls per window that actually need one.

---

## 0. Framing — There Are Exactly Two Kinds of "Tool Tick"

Everything below sorts into one of two buckets. Keeping them separate is the whole design.

| | **Kind A — "What the production expects"** | **Kind B — "What this does / how to read it"** |
|---|---|---|
| **Answers** | *"Why is this window here, what will it take, who may drive it, what's plugged in right now?"* | *"What is this fader / scope / button, and what does a good vs. bad reading look like?"* |
| **Source of truth** | The **`EditorContext`** — already resolved by the host (`app/context.ts`) | Domain knowledge, hand-authored once per control |
| **Scope** | One tip **per window** (on the title rail) + optionally per input slot | One tip **per meaningful control** (title, meter, scope, mode button) |
| **Authoring cost** | ~zero — *derived* from data | Small, finite — most windows need 3–8 lines |
| **Already exists?** | No (the data exists; nothing renders it as a tip) | **Yes — Meter Input** (`editors/meter-input`), the reference implementation |
| **Changes when…** | the **patch changes** (route a source in → the tip updates) | never (it's an explanation, not state) |

Kind A is the user's core ask — *"a user can see what the production expects and what it does."* It is the higher-value, lower-cost half because the data is **already in hand**; we are only choosing to surface it.

---

## 1. What Exists Today (the current tip inventory)

### 1A. The reference implementation — Meter Input's hover-help
`src/editors/meter-input/index.ts:261-304` + `styles.ts:84-91` already ship precisely the pattern to generalize:

```
type Help = { t: string; lead: string; good?: string; bad?: string };
// … a HELP map keyed per scope: video, wave, chroma, parade, vec, cie, meter, vu, gonio, loud, …
const attachTip = (target, html) => { mouseenter→show, mousemove→reposition, mouseleave→hide };
const helpHtml = (h) => `<b>${h.t}</b><br>${h.lead}
   ✓ Good: ${h.good}   ✕ Bad: ${h.bad}`;
```

Rendered chrome: a fixed, pointer-following `.mi-tip` panel (`z-index:100000`, cursor-anchored, viewport-clamped), plus `.mi-help{cursor:help}` on every title. There is *also* a second, richer layer — `meter-input/hover.ts` — a live **probe readout** ("R · col 47% · 62 IRE") and drop-a-marker system for scope canvases. That is scope-specific and stays local; the **`Help`/`attachTip`/`.mi-tip`** part is what every window wants.

**Verdict:** L3 in this one window, L0 everywhere else. The pattern is proven; it just isn't shared.

### 1B. Everything else — scattered native `title=` (~18 ad-hoc spots, no system)
A grep of `src/` for `title:` / `title=` finds only incidental native tooltips, no shared component and **zero tooltip CSS in `lcars.css`**:

| Location | Current tip | Kind |
|---|---|---|
| **`platform/overlay.ts:51,54`** | **Every editor's** topbar *"Click anywhere (or press Esc) to go back"* + close *"Close"* — the one **universal** tip | B (chrome) |
| `app/main.ts:129` | sidebar sash — *"Drag to resize the sources sidebar"* | B (interaction) |
| `ui/console/clock.ts:35,60,67` | clock fully tipped (cycle UTC/Unix/timecode; dots → schedule) | B |
| `ui/console/mqtt-tree.ts:98,103` | MQTT chip *"live retained topic tree"*, close | A-ish / B |
| `ui/console/mission.ts:62` | mission bar *"…click to open the schedule"* | A |
| `ui/console/auth-panel.ts:68` | RIGHTS button *"Edit user rights"* (but **no** tip on caps headers/cells) | B |
| `ui/console/destinations.ts:48,49` | twist fold lip/foldbar *"Fold / unfold strand"* | B |
| `ui/console/schedule.ts:72` | crew chip *"‹division› division"* | A |
| `ui/console/router-view.ts:348` + static `.rv-help` | 1990s-view close + a static hint line (crosspoint **cells** have none) | B |
| `ui/sources/pools.ts:98,139,183` | pool headers `title="${status}"` (leaf signal-nodes have none) | A (status) |
| `editors/audio-positioner/index.ts:163,176` | *"Click: toggle · Dbl-click: solo"*, *"…Mid-drag: rotate"* | B |
| `editors/camera-control/index.ts:83,84` | scope resize handles *"Drag to resize"* | B |
| `editors/graphics-engine/view.ts:164-165` | crawl reorder *"Move up/down"* | B |
| `editors/intercom/view.ts:139` | *"Remove group"* | B |
| `editors/meter-input/hover.ts:97` | marker *"Click to remove marker"* | B |
| `ui/console/chirality.ts:55-56` | mirrors `title`→`aria-label` — the **only `aria-label` in the whole app** | (a11y) |

Observations:
- **Native `title=`** is inconsistent (slow ~1 s delay, un-styled, invisible on touch, truncates, no rich text). Good enough for a sash; wrong for "how to read a loudness meter."
- The overlay already gives **every window a universal Kind-B chrome tip** (Esc/close) — proof the chrome is the right place to hang a per-window tip; it just doesn't yet carry the *production* tip.
- **No window** currently surfaces *what the production expects* — accepts/inputs/caps are computed and used for gating/switcher bounds but **never shown to the operator as help**.
- **`plugin.title`** ("MONITOR CONSOLE · AUDIO", "IFB · INTERRUPTIBLE FOLDBACK") is the *only* per-window explanation today, and it's a heading, not a hover.
- Interior controls are almost entirely bare: of the 20 editors, only ~6 carry *any* interior `title=`, and those are interaction hints, never "what does this reading mean."

---

## 2. The Data Is Already in Hand — `EditorContext` → Tip

This is the crux. `src/editors/types.ts` hands every editor a fully-resolved `EditorContext`, and `src/model/index.ts` defines `TwistConfig`. Between them, the "what the production expects" tip writes itself:

| Tip line ("the production expects…") | Derived from | Example rendered text |
|---|---|---|
| **Accepts** | `ctx.twist.config.accepts` (`video`\|`audio`\|`both`\|`camera`) | "Accepts **video + audio**" |
| **Capacity** | `config.maxVideo` / `config.maxAudio` / `config.inputs.length` | "Up to **4 video**, **16 audio**; 8 switcher inputs" |
| **Camera slot** | `config.cameraInput` | "This is a dedicated **camera input**" |
| **Currently routed** | `ctx.sources[]` (Feeds, groups expanded) | "**3 feeds** in: CAM 1, CAM 3, STAGEBOX 101" |
| **Empty state** | `ctx.sources.length === 0` | "⚠ **Nothing routed yet** — drag a source onto an input" |
| **Belongs to** | `ctx.production.name` / `.color` | "In production **PROD 3**" |
| **Coordinates with** | `ctx.siblings[]` | "5 sibling **CAM** twists share tally" |
| **Who may operate** | `plugin.requiredCaps` + `ctx.can(cap)` | "Needs **audio** capability — you hold it ✓" / "…— view-only ✗" |

The host (`app/context.ts` + `platform/overlay.ts`) already computes all of this to *gate* the editor and *bound* the switcher. Surfacing it as a tip is **pure presentation of existing state** — no new data plumbing, no new model. That is why Kind A is nearly free.

> **Design principle (matches the codebase's grain):** an editor never learns *how* the tip is built; it calls one helper with `ctx`, exactly as it already calls `ctx.can()` or `ctx.services.openStageBox()`. The tip is a **service of the context**, not a chore for each editor.

---

## 3. Proposed Shared Infrastructure — `src/ui/tip.ts`

One new module in the **`ui` layer** (below `editors`, above `platform` — respects the import rule `domain→model→platform→ui→editors→app`). It generalizes Meter Input's private code; Meter Input then re-imports it and deletes its local copy.

### 3A. The API (two functions, mirroring the two Kinds)

```ts
// src/ui/tip.ts — the shared "tool tick" layer for every LCARS window.
export interface Tip { title?: string; lead: string; good?: string; bad?: string; }

/** Kind B — attach a hover-help tip to any control (title, meter, scope, button). */
export function tip(target: HTMLElement, t: Tip): void;         // adds .has-tip{cursor:help}

/** Kind B, terse — a plain string tip (replaces scattered native title=). */
export function hint(target: HTMLElement, text: string): void;

/** Kind A — build the "what the production expects" tip from context, and
 *  attach it to the window's title rail. Auto-updates if sources change. */
export function expectationTip(titleEl: HTMLElement, ctx: EditorContext, plugin: {
  requiredCaps?: Capability[]; blurb: string;   // blurb = one-line "what it does"
}): void;
```

- A **single** shared `.tip` panel element on `document.body` (pointer-following, viewport-clamped, `z-index:100000`) — same mechanics as `.mi-tip`, one instance for the whole app instead of one per editor.
- `expectationTip` reads `ctx` and renders the table in §2; it registers a light observer on the routed-source set via `ctx.dispose` so *re-patching updates the tip* (the "changes when the patch changes" property from §0).
- Rich HTML (bold, ✓/✕ colouring) like today's `helpHtml`, but authored as structured `Tip` objects, not string soup.

### 3B. CSS (promote `.mi-tip`/`.mi-help` verbatim, rename)
`.tip{…fixed, dark LCARS panel…}` `.tip b{accent, uppercase}` `.tip .g{green ✓}` `.tip .bad{red ✕}` `.has-tip{cursor:help}`. Lives in `lcars.css` (or an injected block via `addStyles`), so it themes with the rest of the console.

### 3C. Touch & accessibility (the app is finger-friendly by charter)
Native `title=` is invisible on touch and to screen readers. The shared helper fixes both once:
- **`aria-label`** set alongside every tip (generalize the lone `chirality.ts:56` bridge to *all* tips).
- **Focus + long-press**: tip shows on `focus` (keyboard) and on touch **long-press / tap-the-ⓘ**, not only mouse hover — mandatory because the console is explicitly touch-first (wide faders, "finger-friendly" audio mixer). Each title rail gets a small **ⓘ affordance** so the tip is discoverable without a mouse.

---

## 4. Per-Window Audit

Legend — **Concept** = production entity the window represents · **Expects (Kind A)** = the contract tip, *all derivable from context* · **Does (Kind B blurb)** = the one-line window purpose · **Priority controls needing a Kind-B tip** · **Now** = current tip maturity (L0 none … L3 Meter-Input-grade).

### 4A. Video & switching
| Window (`editors/…`) | Concept | Expects (Kind A, from ctx) | Does (blurb) | Priority Kind-B tips | Now |
|---|---|---|---|---|---|
| **Vision Mixer** `vision-mixer` | The switcher (drives tally) | accepts **video**; `inputs[]` = bus size; feeds = bus sources; cap **switch** | "Cut/mix/wipe PGM & PVW; keyers for L3rds & logos — this drives tally." | T-bar, PGM vs PVW bus, transition CUT/MIX/WIPE, DSK keyers | L0 |
| **Multi Viewer** `multi-viewer` | Monitor wall | accepts video; feeds = tiles; cap **view** | "Configurable 2×2→16×16 monitor wall with PiP + UMD labels." | tally-state cycle, UMD inline edit, PiP | L0 |
| **ISO Recorder** `iso-recorder` | Clean record + replay | accepts video; feeds = angles; cap **route** | "Per-camera clean ISO record + instant-replay jog/shuttle, mark-to-air." | rolling buffer, jog/shuttle, angle select, mark-to-air, disk space | L0 |

### 4B. Audio & comms
| Window | Concept | Expects (Kind A) | Does (blurb) | Priority Kind-B tips | Now |
|---|---|---|---|---|---|
| **Audio Mixer** `audio-mixer` | The console | accepts **audio**; feeds = channels; cap **audio**; opens Stage Box | "Channel strips (fader/EQ/pan/aux) + buses; ⚙ jumps to Stage Box preamps." | fader dB, VU, mute/solo, aux = mix-minus vs monitor, group spill, ⚙ STAGE BOX link | L0 |
| **Audio Monitor** `audio-monitor` | Confidence monitor | accepts audio; siblings = other monitors; cap **audio** | "1–24-ch PPM/VU + phase + BS.1770 loudness confidence." | **PPM vs VU ballistics, Lissajous phase, LUFS target** — *reuse Meter Input's HELP text* | L1 (has scope help kin) |
| **Intercom** `intercom` | Comms key panel (source for IFB) | accepts audio/comms; cap **comms**; feeds → IFB | "TALK/LISTEN keys, gangable talk groups — the source layer for IFB." | TALK vs LISTEN, gang groups, IFB/beltpack/matrix status cards | L0 |
| **IFB** `ifb` | Talent earpiece (mix-minus) | accepts audio; cap **comms**; receives Intercom keys | "Mix-minus (program − own mic) + director interrupt to the earpiece." | **mix-minus (why minus own mic = kills echo)**, ducker graph, interrupt priority tiers, threshold | L0 |
| **Audio Positioner** `audio-positioner` | CMDP object panner | accepts audio; cap **audio** | "Object-based audio positioning (channel-map-defined positions)." | already has interaction titles; add **what an object/bed is**, solo, rotate | L1 (interaction titles) |

### 4C. Camera / colour
| Window | Concept | Expects (Kind A) | Does (blurb) | Priority Kind-B tips | Now |
|---|---|---|---|---|---|
| **Camera Control** `camera-control` | CCU / RCP (8 cams) | accepts **camera**; `cameraInput`; siblings = other cams (tally); cap **shade** (shading card) | "CCU/RCP: PTZ + shading (iris/gamma/gain/blacks), scopes, robotics map." | **iris/gamma/gain, RGB-Venn, waveform+vectorscope** (reuse Meter Input HELP), tally bank, presets; shading card is cap-gated | L1 (scopes shared w/ Meter Input) |

### 4D. Signal & infrastructure
| Window | Concept | Expects (Kind A) | Does (blurb) | Priority Kind-B tips | Now |
|---|---|---|---|---|---|
| **Encoder** `encoder` | Transcode/stream engine | accepts both; auto-configures from routed video/audio; cap **route** | "1:1 mezzanine → ABR ladder → RTMP/SRT; 2022-7 failover, DRM." | ABR rungs, RTMP vs SRT, hitless failover, stream health | L0 |
| **Signaling** `signaling` | Tally & GPI/SCTE | accepts both; siblings = cams; receives Vision Mixer PGM/PVW; cap **signal** | "Distributes tally (red PGM/green PVW/amber ISO), On-Air, GPI/SCTE." | tally colour meanings, Live vs Rehearsal, GPI/SCTE trigger, event log | L0 |
| **Stage Box Input** `stagebox-input` | Smart-object preamp | one console input; cap **audio**; reached via Audio Mixer service | "Preamp gain/headroom, interlocked +48V (Smart-Verify guards ribbons)." | **preamp gain vs headroom, +48V phantom danger for ribbon mics**, impedance, HF comp, PPM history | L0 |
| **Signal Conditioner** `signal-conditioner` | Frame-sync/proc-amp glue | ingress/egress per source; cap route/signal | "Frame-sync/delay/proc-amp — legalize & align at the studio edge." | frame-sync vs delay, proc-amp legalize, why-condition-at-edge | L0 |
| **Lighting** `lighting` | DMX console | cap **shade**; mirrors WYSIWYG | "DMX console for a 3/4-point rig + set light; scene recall." | Key/Fill/Back roles, colour-temp, DMX universe heartbeat, scene recall | L0 |
| **WYSIWYG** `wysiwyg` | Pre-viz (Lighting twin) | mirrors Lighting DMX; cap **shade** | "Top-down pre-viz of the DMX rig: beam cones, foot-candle heat-map." | beam cone, fc heat-map, camera frustum, tally glow | L0 |
| **Graphics Engine** `graphics-engine` | CG / titles | accepts video; cap **gfx** | "Lower-thirds/titles/crawl engine on the rundown spine." | template fields, crawl reorder (has titles), take/clear, safe area | L1 (reorder titles) |
| **Meter Input** `meter-input` | Test-tools bench | test source (pattern/tab/file/URL) | "Real-video/audio scope bench — objective source of truth." | **DONE — the reference (14 scope HELP entries + probe layer)** | **L3** |

### 4E. Entities & content
| Window | Concept | Expects (Kind A) | Does (blurb) | Priority Kind-B tips | Now |
|---|---|---|---|---|---|
| **Person** `person` | A person as a virtual channel strip | a talent/crew source | "A person as a routable virtual channel strip (mic + prefs)." | name/title, pronunciation, the strip's controls | L0 |
| **Prompter** `prompter` | Teleprompter **source** | file-backed script → heads/confidence; per-block LIVE | "Script source + live playhead fanned to prompt heads (mirrored) & confidence (not)." | playhead/current position, block status draft/ready/LIVE, wpm read-rate, mirror vs confidence | L0 (see Teleprompter audit) |

**Coverage:** 19 windows. **1 at L3** (Meter Input), a handful at L1 (scopes/interaction titles they can reuse), the rest **L0**. Every "Expects" column is *already computable from context today.*

---

## 5. The "Production Expectations" Auto-Tip — Exact Template

`expectationTip(titleEl, ctx, {requiredCaps, blurb})` renders (all fields conditional on presence):

```
┌──────────────────────────────────────────────┐
│ VISION MIXER · SWITCHER            [what it is]│  ← plugin.title + blurb
│ ───────────────────────────────────────────── │
│ In production  PROD 3                          │  ← ctx.production.name (+ colour swatch)
│ Accepts        video  ·  up to 8 inputs        │  ← config.accepts / inputs.length / maxVideo
│ Routed now     3 feeds — CAM 1, CAM 3, S101    │  ← ctx.sources (or ⚠ "nothing routed yet")
│ Coordinates    5 CAM twists share tally        │  ← ctx.siblings (kind-aware)
│ Operated by    role needs ‹switch› — you ✓     │  ← requiredCaps + ctx.can()
└──────────────────────────────────────────────┘
```

Rules:
- **Empty routed state is the highest-value line** — a new operator opening a twist with nothing patched sees *"⚠ Nothing routed yet — drag a source onto an input"* instead of a blank editor. This directly answers *"what the production expects."*
- **Capability line is honest about the current role** — "you hold it ✓" vs "view-only ✗" (matches the progressive-disclosure auth model; the tip *explains* why a control the role lacks is hidden).
- **Re-renders on re-patch** via a `ctx.dispose`-registered observer, so the tip is live state, never stale.

---

## 6. Console & Chrome Windows (not twist editors, but still LCARS windows)

These live in `src/ui/console/**` and `src/ui/sources/**`. They deserve Kind-A/B tips too:

| Window | File | Tip opportunity | Now |
|---|---|---|---|
| **Sources panel** | `ui/sources/panel.ts`, `sources/pools.ts` | per source **leaf** (signal-node): channels, colour class, floor, **`status`** (e.g. "LOST CLOCK", "CORRUPTED") — *why is this box red?* Today only pool **headers** carry a status title; leaves are bare. | L1 (headers only) |
| **Matrix / twist crosspoints** | `ui/console/matrix.ts`, `destinations.ts` | per twist drop-target: what it *accepts* + why a drop is rejected ("expects audio, you dragged video"); per **crosspoint chip** (numbered badge): which source it carries. **The mini-Kind-A: hover a twist on the map, see its whole contract before opening it.** | L0 |
| **Destinations / footer tabs** | `ui/console/footer.ts`, `destinations.ts` | per twist chip: accepts + routed count (mini Kind-A) | L0 |
| **Auth rights matrix** ⭐ | `ui/console/auth-panel.ts` | **highest net-new value.** The 10 **capability column headers** (Switch/Route/Signal/Shade/Audio/Graphics/Comms/Booking/View/Admin) and every roles×caps **toggle cell** are unlabelled — a Kind-B tip per header ("Shade = colour science / CCU shading") turns the access matrix self-documenting. Mirror the README cap table verbatim. | L0 |
| **1990s Router View** ⭐ | `ui/console/router-view.ts` | the full senders×receivers crosspoint grid — every **cell** is a make/break route with *no* per-cell tip. Kind-A per cell: "route ‹sender› → ‹receiver›" + current state. Only a static `.rv-help` line exists today. | L0 |
| **Schedule** | `ui/console/schedule.ts` | already has an inline `sc-hint`; add per-slot "role→scope" tip | L1 (static hint) |
| **Mission bar** | `ui/console/mission.ts` | already `title=`; upgrade to rich tip (show, room, on-crew?) | L1 |
| **Captain's Log** | `ui/console/captains-log.ts` | per entry: what event type means; NEW VOYAGE / REVERSE COURSE affordances | L0 |
| **Portals** | `ui/console/portals.ts` | what a portal is (ad-hoc patch point that is both a source *and* a destination) | L0 |
| **Clock / seconds-dots** | `ui/console/clock.ts` | fully tipped already | L2 |
| **MQTT tree** | `ui/console/mqtt-tree.ts` | already `title=`; per-topic meaning tips | L1 |
| **DNA Helix / edge pulse** | `ui/console/helix.ts`, `lcars-pulse.ts` | decorative; helix strands = source vs dest — a one-line tip only | L0 |
| **Generic matrix fallback** | `app/main.ts:42` | any twist with **no matching editor** opens a bare overlay — the Kind-A expectation tip is *most* valuable here (it's the only explanation the operator gets) | L0 |

---

## 7. Rollout — Phased, Low-Risk, House-Style

| Phase | Scope | Effort | Payoff |
|---|---|---|---|
| **P1 — the shared layer** | Add `src/ui/tip.ts` (`tip`/`hint`/`expectationTip`) + CSS; refactor Meter Input to import it (delete its local copy, keep `hover.ts` probes). No behaviour change. | S | One tip system; a11y + touch fixed once |
| **P2 — auto Kind-A everywhere** | Call `expectationTip()` on every editor's title rail. ~1 line per editor (19 lines total) + a `blurb` string per plugin. **Answers the user's core ask across all windows at once.** | S–M | Every window explains what the production expects |
| **P3 — Kind-B on priority controls** | Add the 3–8 hand-authored `tip()` calls per window from §4's "Priority" column; reuse Meter Input's HELP text for shared scopes (Audio Monitor, Camera Control). | M | Meters/scopes/modes become self-teaching |
| **P4 — console/chrome + source status** | §6: source-leaf status tips, matrix drop-reason tips, footer chips. | M | The patch map itself becomes self-explaining |

**Why P2 before P3:** Kind-A is derived (near-zero authoring) and covers *all 19 windows* immediately; Kind-B is finite hand-work best done per-window as time allows. Ship the automatic half first.

---

## 8. Design Constraints (so tips stay LCARS, not chrome-junk)

- **One panel element, pointer-anchored, viewport-clamped** — reuse Meter Input's proven placement math (`placeTip` clamps to `innerWidth/innerHeight`). No per-widget DOM.
- **`cursor:help`** on Kind-B targets; a small **ⓘ** affordance on title rails for touch/keyboard discovery.
- **Never block the signal** — tips are `pointer-events:none`, dismiss on `mouseleave`/blur/scroll; they must never sit over a live meter or a drop target during a drag.
- **Derive, don't duplicate** — Kind-A text comes from `ctx`; if it drifts from reality, the *context* is wrong, not the tip. No second source of truth.
- **Respect scope/auth** — the capability line *explains* the progressive-disclosure model rather than fighting it ("this control is hidden because your role lacks ‹shade›").

---

## Appendix A — Capability & Accepts Matrix (the Kind-A backbone)

Pulled from `editors/*/index.ts` (`requiredCaps`) + README dispatch table. This is exactly the data the "Operated by / Accepts" tip lines render.

| Window | `requiredCaps` | Typical `accepts` | Coordinates with (siblings/services) |
|---|---|---|---|
| Vision Mixer | `switch` | video | → Signaling (tally) |
| Multi Viewer | `view` | video | tiles |
| ISO Recorder | `route` | video | angles |
| Audio Mixer | `audio` | audio | → Stage Box (`services.openStageBox`) |
| Audio Monitor | `audio` | audio | sibling monitors |
| Intercom | `comms` | audio/comms | → IFB (talk keys) |
| IFB | `comms` | audio | ← Intercom |
| Audio Positioner | `audio` | audio | — |
| Camera Control | `shade` (shading card) | camera | sibling cams (tally) |
| Encoder | `route` | both | auto from routed A/V |
| Signaling | `signal` | both | ← Vision Mixer; → cams |
| Stage Box Input | `audio` | (one input) | ← Audio Mixer |
| Lighting | `shade` | — | ↔ WYSIWYG |
| WYSIWYG | `shade` | — | ↔ Lighting |
| Graphics Engine | `gfx` | video | rundown spine |
| Multi/Meter/Person/Prompter | (varies / none) | video / — | Prompter → heads (Teleprompter audit) |

## Appendix B — Files touched by the proposal

- **New:** `src/ui/tip.ts` (+ tip CSS in `lcars.css` or injected).
- **Refactor:** `src/editors/meter-input/index.ts` + `styles.ts` — import shared `tip`, drop local `.mi-tip`/`Help`/`attachTip` (keep `hover.ts` probe/marker layer, which is scope-specific).
- **1-line additions:** each `src/editors/*/index.ts` — a `blurb` field on the plugin + an `expectationTip(...)` call in `render()`.
- **Optional bridge:** generalize `ui/console/chirality.ts:56`'s `title→aria-label` into `tip.ts` for all tips.

---

### Bottom line
The app already *knows* what every production expects of every window — it computes accepts/inputs/caps/routed-feeds to gate and bound each editor. It just never *tells the operator*. And it already *proved* the hover-help pattern once, in Meter Input. This audit's recommendation is therefore not "build tooltips" but **"surface the context you already have, through the tip layer you already wrote"** — a small shared `ui/tip.ts`, an automatic Kind-A tip on all 19 windows (Phase 2), then hand-authored Kind-B where meters and modes need explaining (Phase 3).
