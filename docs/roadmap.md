# SPOG Roadmap

*A living map of where **SPOG (Single Pane Of Glass)** is going. SPOG is a zero-backend,
browser-based control surface for a multi-floor production facility — a drag-to-route
signal-flow visualizer whose "twists" open into role-specific editors (vision mixer, CCU,
audio, lighting, prompter, graphics, timers…), backed by a static `Routes/**` file tree and
a retained-MQTT `TwistBus`.*

*Last updated: 2026-07-09.*

> **How to read this.** Each item carries a status:
> `✅ Shipped` · `🚧 In progress` · `⏭️ Next` · `📋 Planned` · `🔬 Exploring`.
> Deep design rationale for most items lives under `docs/Audit/` and `docs/Audits/`; those
> audits are the backlog's source of truth and are linked where they exist. This roadmap
> summarizes and sequences them — it is not itself normative.

---

## 0. Guiding principles

- **Zero-backend by default.** The console runs off a static host + a broker. Every feature
  must degrade gracefully with no MQTT and no server.
- **The patch panel is the map; the editors are the rooms.** New capability usually lands as
  either a new routable source/destination or a new editor behind a twist.
- **Meaning without hue.** Category is shape-coded, state is glyph-coded; colour is an
  accessibility layer, never the sole carrier of meaning (see the Colour Engine).
- **200-line rule.** Files stay ≤200 lines (CI tripwire `SETUP/check-file-size.mjs`); split
  by responsibility, not by arbitrary cut.
- **Ship behind the seat.** Per-seat preferences and reversible experiments over big-bang
  cutovers.

---

## 1. Now — recently shipped

- ✅ **Deterministic Merge Mediator + Observer** — replaces per-topic last-writer-wins with a
  windowed arbitration layer: concurrent writes to a param are bucketed and resolved by
  **higher seat rank wins** (full_id tie-break), so consoles converge with no "up/down"
  volley. A `⚖ MERGE` panel (in the seat MENU) shows the live argument + a self-contained
  arena; contested merges surface a toast. Design: `docs/Audits/Merge - vs last called.md`;
  companion `docs/Audits/SMRT adoption in SPOG.md`.
- ✅ **Timeline Viewer v110** — one stringline/swimlane graph of the Captain's Log + schedule,
  foldable tree, projected recurring schedule, filter + multi-select room chips, minimap
  zoom/scrub, `#timeline` deep-link. Design: `docs/Audits/TimeLine Investigation.md`.
- ✅ **Timeline polish (this cycle)** —
  - Left-column titles + fold headers stay **pinned on horizontal scroll**.
  - Folded topics show an **inline event count** *and* a **one-line summary event** on the
    header row (never vanish).
  - `SHOW ALL` **tucks everything back up** to the compact overview.
- ✅ **24-hour global newsroom schedule** — 20 shows across time-zone bureaus (London / Tokyo /
  Sydney), a designed **prime-time peak of exactly 5 concurrent productions**, a **45-minute
  rehearsal band** on every slot, and **overlap stacking**: two concurrent shows needing one
  role stack into sub-rows with a `×N` badge (= people/rooms the slot demands), e.g. `Ops ×2`
  reads as "impossible without a second person".
- ✅ **Heartbeat monitor** — the LCARS edge data-pulse is now **off by default**, toggled
  per-seat under **Colour & Vision**.
- ✅ Prior recent work (see `CHANGELOG.md`): OOPS illegal-route logging, crosspoint provenance
  cards, unified cross-browser Captain's Log, protobuf v2 + throttling, Cache/Prefs/PWA.

---

## 2. In progress / next

- 🎯 **Control-room graphics in the switcher — pre-router + up/downstream keyers** *(top priority,
  building now)* — make graphics engine outputs (weather, TSG, chyron, lower-thirds…) first-class
  in the vision mixer. The model, as speced:
  - **Hard-wired, always-there graphics.** The control room's graphics are permanently wired
    into the switcher (the existing `DSK · GRAPHICS n` inputs, sources 19-24) — always present,
    never requiring a manual route.
  - **Downstream keyers (DSK).** Graphics keyed *after* the M/E — the 6 DSKs already in
    `schema.ts`. Preview them in the switcher (arm on preview → take to program).
  - **Upstream keyers (USK).** *Some* graphics also ride as **normal M/E keyers** (upstream of
    the DSK) — already possible (ME keyers can target a graphics source, e.g. the LOWER-THIRD
    preset); surface them explicitly as graphics.
  - **PRE ROUTE tab (beside the M/E).** A new tab/panel next to the M/E lets the operator
    **shift which hard-wired graphic feeds each keyer/DSK bus** *after* it's presented — a small
    graphics→bus pre-router matrix, since the M/E has no native way to re-route these.
  - **Faux-take "set".** Anything on the graphics displays as a takeable **set** (named scene)
    that previews and "takes" via a simulated transition (front-end sim).
  - **Auto-multiviewer.** Any graphic on the DSK/switcher **automatically lands in a multiviewer
    tile**, monitored without a manual route.
  - *Touches:* `vision-mixer/{schema,me,keyers,dashboard,panels,styles}.ts`, the graphics-engine
    mount (dest-fixtures synthTwist), and multiviewer auto-population. Ties into §3.2 Graphics
    suite. **First slice: the PRE ROUTE panel + explicit up/downstream graphics keyers.**
- 🚧 **Timeline 5W+H reframe** — re-section the Timeline Viewer by node type instead of the
  current WHERE/WHO pair:
  | Question | Contents |
  |---|---|
  | WHO | people · reporters · crew |
  | WHAT | the deliverable / programmed show name |
  | WHERE | studios · floors · remotes |
  | WHEN | the time axis (bottom ruler) |
  | WHY | the encoder timeline |
  | HOW | equipment · control rooms · productions · encoders · edit suites |
  Needs a node-type → section classifier in `captains-log-timeline-data.ts`. *Pending final
  confirmation of the mapping + section order.*
- ⏭️ **Reverse Course after reload** — restored (post-reload) and networked log entries are
  currently read-only (their undo references died with the session). Re-derive routing from
  persisted state so past entries can be reversed again; and keep transient merge events out
  of the persistent reversible log so they don't bury routing entries.
- ⏭️ **Seat rank on the wire for cross-console merge** — the mediator's higher-rank-wins is
  authoritative within a console and now carries `seat`/`label` on `ValueMsg`; finish the
  cross-console convergence proof + sparse-overlay publishing so orthogonal edits compose.

---

## 3. Planned — by theme

### 3.1 Timeline, schedule & resource booking
- 📋 **Resource-conflict surfacing** — turn the `×N` overlap badges into an actionable
  "needs staffing" view (who/what/when a second operator is required).
- 📋 **Schedule authoring** — edit the recurring `SCHEDULE` in-app (today it is a code table),
  round-tripping to a persisted store. Ties into the Routes Editor work (3.5).
- 📋 **Studio-spaces hierarchical routing** — P2 grid-3-layer, P3 salvo, P4 JSON-export of the
  four-phase redesign. Audit: `Studio-Spaces-and-Hierarchical-Routing-Audit.md`.

### 3.2 Editors & control surfaces
- 📋 **DVE WYSIWYG makeover** — replace slider/prompt()-driven DVE with a Photoshop/AE-style
  handle stage + crop + fast touchpad grammar. Audit: `docs/Audit/DVE-Makeover-Audit.md`.
- 📋 **Editor chirality C2** — handedness flip for ~10 editors (wysiwyg first; audio-mixer /
  camera-control highest benefit). Audit: `Editor-Chirality-Audit.md`.
- 📋 **RC1000 dual-timer source** — a dual up/down timer graphics source + keypad transport.
  Audit: `RC1000-Dual-Timer-Audit.md`.
- 📋 **Graphics suite** — a graphics engine hosting a suite of editor-functions mounted on
  dest-fixtures. Audit: `graphics-suite-architecture`.
- 📋 **Production video switcher** — audit + deployment plan already drafted
  (`docs/Production-Video-Switcher-*.md`).
- 📋 **Shared tooltips / tool-ticks** — promote Meter Input's hover-tip pattern to a shared
  `src/ui/tip.ts` across all editors. Audit: `LCARS-Hover-Tooltips-…-Audit.md`.

### 3.3 Sources, destinations & test signal
- 📋 **Test-frame routing** — a shared synthetic SMPTE test-card + tone module routable through
  every source/dest with live preview. Audit: `Test-Frame-Routing-Audit.md`.
- 📋 **Weather forecast strip** — P2 on-air "forecast strip" faces (P0/P1 shipped). Audit:
  `Weather-Forecast-Strip-Audit.md`.
- 📋 **Teleprompter conditioner-row** — resolve the open conditioner-row question.

### 3.4 Collaboration & the bus
- 📋 **Studio chat room** — per-room production⇄talent text/image/link dialog riding the
  TwistBus like the Captain's Log. Audit: `Studio-Chat-Room-Audit.md`.
- 📋 **TWIST→MQTT advertising** — advertise every room/route/resource/log event onto an MQTT
  topic tree (`TwistBus`). Audit: `TWIST-MQTT-Advertising-Audit.md`.
- 📋 **Wireless telemetry** — audit exists (`docs/Audit/wireless_telemetry_audit.md`).

### 3.5 Authoring & topology
- 📋 **Routes Editor (single pane)** — direct-manipulation authoring of rooms/stage-boxes/
  talent, inverting the editor registry into a palette + a write sink
  (localStorage → FS Access API → server). Audit: `Routes-Editor-Single-Pane-Audit.md`.

### 3.6 Accessibility & presentation
- 📋 **Colour Engine expansion** — low-vis/high-vis/grey/mono modes; the real gap is STATE
  glyphs (category is already shape-coded). Audit: `docs/Colours and shapes.md`.
- 📋 **Icon-view FACE axis** — skin LCARS chrome with generated icon tiles. Audit:
  `Icon-View-Aesthetic-Audit.md`.

### 3.7 Wire & performance
- 📋 **Protobuf payload optimization** — implement the unshipped `publishValue` throttle
  refinements, shrink `full_id`, intern crosspoints, drop log narration from the wire.
  Audit: `Protobuf-Payload-Optimization-Audit.md`.

---

## 4. Exploring — research & bets

- 🔬 **SMRT adoption (ideas, not the artifact)** — borrow the **sentinel merge** (done, §1) and
  an **integer time index (`_tv`)** for routing/param state into TypeScript; run the
  camera-control "participant" probe. Do **not** fork a Lua runtime into the browser or
  rebuild the backend on SMRT until it is past pre-alpha and openly licensed. Audits:
  `SMRT adoption in SPOG.md`, `Merge - vs last called.md`.
- 🔬 **Real media plane** — SPOG is a front-end *simulation*; a genuine ST 2110 / IPMX / NMOS
  control + GStreamer render path is the largest long-term alignment and the least available
  today (greenfield on both sides).
- 🔬 **RFSA integration layer** — the delta between SPOG's front-end simulation and a real
  media-production RFSA is the API/integration layer. Audit: `docs/Audit` RFSA reports.
- 🔬 **Patent surface** — `docs/Audit/Patent-Audit.md`.

---

## 5. Backlog index

Every `📋` / `🔬` item above traces to an audit under `docs/Audit/` or `docs/Audits/`. When
picking up an item: read its audit first, confirm scope, then ship the smallest reversible
slice behind a seat preference or a URL param. New proposals start as an audit, not as code.

*Note: `docs/` is not tracked in git (like the other audits), so this roadmap is a local
working document. If it should ship with the repo, un-ignore `docs/roadmap.md` explicitly.*

1. Switcher preview of the DSK — arm a graphic on preview → take to program.
2. Faux-take "set" — a graphic as a takeable named scene via a simulated transition.
3. Auto-multiviewer — a graphic on the DSK auto-populates a multiviewer tile.
4. Explicit upstream (M/E-keyer) vs downstream graphics surfacing — you noted "some graphics upstream that are normal keyers" (already possible via M/E keyers; surface them as graphics).

One process note: this was a very large session — I shipped ~10 features across the merge mediator, timeline, schedule, and now the switcher. Want me to keep going straight into slice 2 (switcher preview + auto-multiviewer), or pause here so you can drive the PRE ROUTE panel first and confirm it feels right before I build more on top?
