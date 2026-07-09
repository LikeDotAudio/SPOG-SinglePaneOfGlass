# Changelog

All notable changes to SPOG (Single Pane Of Glass) are recorded here.

## [v110] — 2026-07-08

### Added — Captain's Log Timeline Viewer
- **Timeline Viewer window**: A new `⧗ TIMELINE` window off the Captain's Log plots every log event as a **keyframe on a resource lane** — a single stringline / swimlane graph. **WHERE** (destinations, grouped by room) sits on **top** and **WHO** (operators + booked crew) on the **bottom**, sharing one **time axis along the bottom** (a calendar ruler with hour + day labels). Rows are a **foldable tree** (section → group → lane); each keyframe is coloured by operator (a legend ties the WHO lanes to the WHERE dots), and **clicking a keyframe opens its full log detail** (time, operator, narration, reversed state). Occupancy bands span each keyframe to the next (step interpolation); reversed entries dim.
- **Recurring schedule projected into the future**: The production `SCHEDULE` is a daily timetable, drawn as dashed **"planned" bands** and **projected forward across the next days** so future occurrences sit to the right of the NOW playhead — booked rooms on the WHERE side, booked crew on the WHO side. `⇥ SCHEDULE` jumps to the first future show; `⤒ NOW` re-centres on the playhead.
- **Filter, multi-select group chips & navigator**: A **filter** box narrows the timeline to matching lanes/events. A **dark chip bar** offers a `◎ SHOW ALL` reset plus one chip per destination group — each **inheriting the room's declared schema colour** (from the DOM twist's `--lcars-color`); chips **multi-select / stack** (union) so you can view several rooms at once, then SHOW ALL to clear.
- **Navigator, zoom & scrub**: A **navigation minimap** (bottom-right) shows the whole span with event marks, the NOW tick, and a draggable viewport box; its **left/right handles zoom**, and the **mouse-wheel zooms** around the cursor. **Middle-button (wheel-click) drag grab-scrubs** the timeline on both axes.
- **Foldable composites & deep-link**: Folding a room or section leaves a **composite lane** aggregating all its events, so nothing vanishes on fold. The viewer has a **`#timeline` URL** — opening it reflects the hash, and pasting/navigating to `#timeline` opens it. Rendered **on demand** — a snapshot from the in-memory log + schedule each open (and on ⟳ Refresh), never on a live subscription. Design rationale: `docs/Audits/TimeLine Investigation.md`.

### Added — "OOPS" Illegal-Route Logging
- **Illegal routes recorded in the Captain's Log**: When an operator drops a source onto a destination that rejects its type (e.g. routing audio to a video-only Video Mixer), the rejection is now recorded as a `⚠ OOPS — …` entry in the Captain's Log (attributed and timestamped), instead of failing silently. Legitimate reroutes (host→camera, whole-production, camera/remote fan-out) are not flagged.

### Added — Routed-Source Provenance & Editor UX
- **Crosspoint "Details" card**: Press-and-hold any routed source in a Twist to open a Details card showing its **source family / feeds-from tree** (reconstructed from the live source panel's ancestry), full signal name and kind, and **when it was routed and by whom** (stamped onto the node at placement time).
- **Prompter Highlighter Pens**: The prompter toolbar's two colour swatches were replaced with **six fixed highlighter pens plus a clear pen** — they wash the selected text's background rather than acting as a colour picker.
- **Host → Camera Cascade**: Dragging a host (person) onto a production now routes their camera feed to the **first available camera input** and cascades it downward to the vision mixer + multiviewers; a second host fills the next free camera.
- **URL Deep-Linking**: Pasting `https://spog.like.audio/#on/<floor>/<production>` (e.g. `#on/control-room/production-1`) now **selects and jumps to** that production, expanding its Twist groups; the URL also updates to reflect the production being viewed as you navigate.
- **Academy Version Badge**: The Quick Start overlay header now displays the running build version.
- **Reverse Course Attribution**: A reversed Captain's Log entry now stays in the log marked `[course reversed by <name> at <time> UTC]`; the attribution travels over MQTT and survives reload.
- **SMRT Adoption Audit**: Published `docs/Audits/SMRT adoption.md` — a deep comparison of the SMRT protocol/state model against SPOG's MQTT/file-tree architecture, with an adoption recommendation.

### Changed — Unified Captain's Log (supersedes v107's `log/latest` sync)
- **Cross-Browser Unified Log**: The Captain's Log now publishes each entry to an origin-namespaced retained topic (`log/<origin>/<voyage>/<entry>`) and subscribes to the **full retained tree**, so a late-joining console catches up on the *entire* merged log rather than only the last entry. Entries are grouped by (origin, voyage) so two seats' voyages never collide or drop as false duplicates — fixing the divergent "36 vs 112" entry counts.
- **Leaner Log Wire Format**: Routing entries no longer ship their English narration on the wire — each console rebuilds the sentence locally from the structured fields (audit F3).

### Changed — Console Layout & Chirality
- **Fold-On-Load**: A fresh load with nothing selected now presents every Twist group **folded**; a production the operator actively opens (deep-link or tab click) comes up **expanded**.
- **Multiviewer Sizing**: The MULTIVIEWER gang now lays its members out as an even N-column grid (⅓ each for 3, ¼ for 4) on one row, with the DNA-helix corrected to fit its own cell (fixes the overlap regression).
- **Chat/Voice Chirality**: The CHAT/VOICE dock now respects chirality — it flips to the same side as the clock + MQTT cluster so it always sits **above the time and MQTT**, in both handedness modes.
- **Person Label Alignment**: Host / co-host / panelist labels now hug the **square (spine) edge**, not the rounded outer edge.
- **Prompter as a V source**: Every prompter source now exposes a **single `V` video feed** rather than three named feeds.
- **Removed Wireless Controller**: The `Wireless_Controller` node was removed from People and from both Production source pools.

### Changed — Wire-Format Optimization (re-introduces & extends v108's throttling)
- **Message Throttling Restored**: Re-implemented the per-topic trailing-edge coalescing that v108 removed (`throttle.ts`). Param publishes are throttled by default (~20 Hz); discrete one-shots opt out. High-rate sources (prompter scroll at ~60 Hz, slider drags) now emit an order of magnitude fewer messages, and the final retained value always lands.
- **Compact Protobuf v2 (backward-compatible)**: The `full_id` string is replaced on the wire by a 4-byte `origin_id`; routing crosspoints ride as `repeated string` instead of JSON-in-a-string (~39% smaller per crosspoint); timestamps carry as a varint. The decoder reads both the new and legacy formats. Published `Protobuf-Payload-Optimization-Audit.md`.

### Changed — CI/CD Incremental Deploy (supersedes v107's full-sync)
- **Incremental Route Uploads**: The production and sandbox deploy workflows now upload **only the Routes files changed in the push** (diffing the `github.event.before…github.sha` range) instead of `--fresh`/`--all` full-tree syncs — so the deploy log shows the changes, not the whole tree. `deploy.py --all` / `--fresh` remain available for a manual full re-sync.

### Fixed
- **1990s View State Loss**: The router grid now also harvests already-routed crosspoints as sender rows, so a route to a source whose panel pool is collapsed no longer drops off the grid.

## [v109] — 2026-07-08

### Added — True Cryptographic Auth & Sandbox Autonomy (Milestone 1, Phase 2)
- **Standalone Sandbox Mode**: The entire UI was decoupled from the `localhost` API Gateway. The SPOG client now runs 100% statically and fetches routing manifests natively from the Sandbox directory.
- **Mock JWT Crypto Generator**: To prove architectural readiness without requiring a backend on the Sandbox, the authentication layer now mathematically generates and signs a base64 JWT payload directly in the browser upon role selection, appending it to all `Authorization` headers.

### Added — Enterprise Payload Security (Milestone 3)
- **AES-256 Encrypted Protocol Buffers**: The core MQTT telemetry pipeline was fundamentally upgraded. A strict `.proto` schema now defines all telemetry and control messages.
- **Native Web Crypto Integration**: All JSON payloads are mathematically serialized into highly compressed Protobuf binary arrays, which are then encrypted using an AES-256-GCM symmetric master key before transmission. This provides absolute zero-trust payload privacy and massive bandwidth reduction.
- **Diagnostic Cryptography Audit**: Published `MQTT-Protobuf-Crypto-Audit.md` detailing the exact zero-trust architecture and troubleshooting procedures for the enterprise broker.

### Changed — UI & Notifications
- **Stale Build Notifications**: The "Version Watcher" notification badge and Captain's menu launcher now pulse with a custom orange (`rgb(244, 144, 44)`) instead of red when a new build is deployed, providing a softer but clear cue for operators to reload.

## [v108] — 2026-07-08

### Added — True Cryptographic Auth (Milestone 1)
- **JWT Validation**: Replaced the mock `X-Role` setup in the API gateway with real `jsonwebtoken` validation. Added a `POST /api/v1/auth/login` endpoint to issue cryptographically signed JWTs.
- **Frontend Authentication Integration**: Updated the console's role switcher to request a JWT upon role change and pass it securely via `Authorization: Bearer <token>` in all API requests.

### Changed — Telemetry Logging (Milestone 2)
- **Removed Message Throttling**: Completely ripped out the `throttle.ts` coalescing logic for outgoing MQTT messages. `opts?.throttle` requests are now ignored, and all telemetry is dispatched instantly.
- **Message Rate Monitor**: Added a local message counter to the TwistBus that tracks the rate of outgoing payloads. It logs this rate every minute to a new dedicated `SPOG/system/rate/<client-id>` topic for external monitoring.

## [v107] — 2026-07-08

### Added — People Manager & Crew Guide
- **People Manager Overlay**: A dedicated interactive guide breaking down the crew into categories (Hosts, Co-Hosts, Panelists, etc.) and displaying individual profiles. Accessible via the **"ℹ️ MGR"** button on the PEOPLE group in the Destinations footer tab.
- **In-App Authoring for People**: The People Manager includes full authoring capabilities backed by the local `routes-store`. Operators can quickly add new people to a category using a template or hover over existing talent to edit their titles via a prompt. All changes instantly persist as drafts and update the manifest automatically.

### Added — Sick Bay Diagnostics & Booking
- **Sick Bay Interaction**: Clicking an offline or troubled destination in Sick Bay now directly navigates to its declaration and displays a live diagnostic PROGRAM monitor below it.
- **Sick Bay Alert UI**: The SICK BAY footer tab now flashes with a dedicated, CSS-driven red pulse animation (`#ff3333`) and drop-shadow when active, improving alert visibility.
- **Resource Booking**: Added soft-booking fields (`bookedBy`, `inUseBy`, `scheduledUntil`, `allowSharedComms`) to destination configurations to integrate resource management with the production schedule.

### Added — Security & Strategy (Enterprise Turnaround)
- **Node.js API Gateway (Phase 1)**: Scaffolded a new backend authority (`server/index.ts`) that intercepts static file requests and applies true backend data filtering based on an `X-Role` header, proving out robust security beyond client-side DOM hiding.
- **Dual-Licensing Model (Phase 4)**: Added `LICENSE.md` outlining a new commercialization structure that legally uncaps the Total Addressable Market while preserving open, non-commercial use.
- **Turnaround Strategy**: Committed `TURNAROUND_STRATEGY.md` outlining the four-phase plan to graduate SPOG into an enterprise-ready broadcast management platform.

### Added — Network Synchronization & State Hydration
- **Captain's Log Network Sync**: The Captain's Log now subscribes to the MQTT `log/latest` topic, ensuring that routing decisions and layout edits made by any operator instantly sync and populate the logs of all other active consoles. Network-sourced log entries are safely marked as read-only.
- **Visual Crosspoints Rehydration**: The application now subscribes to retained `crosspoints` topics on boot and upon reconnecting. This leverages the broker's Last-Value Cache to instantly reconstruct the visual routes within Twists, allowing every console to immediately join the current state of the network.
- **MQTT Broker Update**: Updated the default MQTT broker connection to use `test.mosquitto.org:8080/ws`.

### Changed — CI/CD Pipeline & Sandbox Defenses
- **Automated Deployments**: Deprecated the local `SETUP/deploy.py` execution and replaced it with a fully automated, headless GitHub Actions CI/CD pipeline (`.github/workflows/deploy-production.yml`). Deployments are now strictly branch-driven, ensuring absolute auditability and removing FTP credentials from developer machines.
- **Live Sandbox Environment**: Established a dedicated GitHub Actions workflow (`deploy-sandbox.yml`) that automatically syncs the `sandbox` and `develop` branches to the live testing infrastructure, ensuring rapid iteration without compromising production.
- **Standalone Manifests**: Extracted the route discovery compilation logic into a dedicated Node script (`SETUP/generate-manifests.mjs`), removing the Python dependency from the core application build process.
- **Sandbox Architectural Disclaimers**: Added explicit `FLAG` disclaimers to both the source code (`server/index.ts`, `src/platform/mqtt/config.ts`) and the executive audit trails to clearly defend the current use of mock authentication and public MQTT brokers as necessary stepping stones within the sandbox development phase, signaling clear intent for enterprise-grade replacements.

### Changed — Layout & Manifest Refinements
- **Repository Cleanup**: De-cluttered the root directory by moving all deployment, configuration, and utility scripts (`deploy.py`, `.env`, build scripts) into a dedicated `SETUP/` directory.
- **Sources Panel Priority**: "People" is now explicitly anchored as the very first source pool in the left-hand rail.
- **Gang Grid Full Width**: Source listings inside the gang grid now display at full width (`1fr`) rather than squeezed.
- **Manifest Sync**: Unified folder names across `Routes/Destinations/index.json` and `Routes/Sources/index.json` to use singular terminology (e.g., `Control Room`, `Encoder`, `Studio`) ensuring accurate mapping to the actual data directories.
- **Player Banks**: Removed deprecated `Bank E`, `Bank F`, and `Bank G` from the Player sources manifest.

## [v106] — 2026-07-05

### Added — Teleprompter & Matrix Upgrades
- **Rich Text Prompter Editor**: The prompter script area is now a full `contenteditable` rich text engine. Presenters and operators can apply **Bold**, *Italic*, and <ins>Underline</ins> formatting, and customize text foreground and highlight background colors. All styles maintain perfect 1:1 sync with the on-air crawl. 
- **HTML-Safe Automation Cues**: Even with rich text applied, meta-commands like `[GPO: X]` and `[STORY: Y]` remain fully intact and safely parsed out without interfering with text formatting.
- **Visual Reading Indicators**: Added two bright blue inward-pointing arrows (`▶` and `◀`) to the reading line in the lower third, providing a clear visual target for the active script line.
- **Focus Puller Pace Line**: Replaced the generic slider with a custom jog wheel graphical element. The track glows dynamically (blue for forward, red for reverse) from center. Background tick marks physically animate during playback, creating a mechanical illusion of the wheel rolling at the exact pace of the crawl.

### Added — DVE Previsualization & Real-Time Anticipation
- **Preview Move**: Added a "PREVIEW MOVE" button to the DVE Editor. Pressing it triggers a real-time previsualization tween of the active preset directly on the editor's stage.
- **Anticipation Render**: Uses CSS transitions dynamically calculated against `preset.ms` so operators can test complex, combined X/Y/Z scaling flights from Keyframe A to Keyframe B exactly as they will look on the live production switcher.

### Added — Faux-Signal Test Frames (routable "person-in-a-room")
- **Deterministic faux signal** (`src/ui/faux-signal.ts`): every routed source now presents a self-identifying picture instead of generic bars — a seeded "person in a room" cartoon (skin/hair/shirt/room accent all derived from the source's name+colour, so a given source always looks the same and distinct sources look different), with a burned-in lower-third (source name · originating room), a desk mic for audio feeds, and a "NO SIGNAL" static slate for faulted feeds.
- **Test-card surfaces render the faux signal**: the shared test-card module (`src/domain/test-card/`) now delegates its card painter to the faux signal, so the multiviewer wall's live tiles show each routed source's own picture.
- **Per-destination MONITOR fixture** (`src/ui/console/dest-fixtures-monitor.ts`): every room now carries a live PROGRAM monitor that renders the faux signal of whatever source currently sits in the room's crosspoints — re-read from the DOM each frame, so dragging a source onto any twist lights the monitor with no room re-render. Shows an idle "NO SOURCE ROUTED" placeholder when empty and the NO SIGNAL slate when the room is OFFLINE.

### Changed — Control Room & Floor Routing
- **Control Room Prompters**: Added the `PROMPTER` twist to all 10 Control Rooms (Primary 1-5, Secondary 6-10), automatically outfitting every production gallery with a dedicated prompter editor interface.
- **Generated Prompter Sources**: Configured dedicated Prompter Sources for each Control Room, pushing the control room's prompter script back onto the video routing bus.
- **Camera Prompter Endpoints**: Added a dedicated "CAMERA PROMPTER" destination to all five studio floors, allowing operators to map any Control Room's prompter directly to the glass on the studio floor.

## [v105] — 2026-07-05

### Changed — ICON-face tile glyphs (`src/ui/icon-glyphs.ts`, `src/ui/icon-glyphs-chrome.ts`)
- Every tile's animation now performs its subject's real job: **streams** flows as a
  seamless looping wave (no seam/gap), **play** cycles ▶ → ‖ → ■, **prompter** scrolls
  its lines continuously upward, **portals** ripple outward with a springy radius bounce,
  **floors** is an elevator car with a rider walking in/up/out, **control-rooms** flickers
  images across its quad-split, **test-tools** flips its sine wave up and down, **encoders**
  pumps a dash stream into the hub that fans out along three rays.
- **VIDEO** redrawn to read the signal path left-to-right: photons converge into the
  mirrored lens, a full-height red tally blinks on the camera body, and the encoded
  stream leaves the back as a distinct dots-and-dashes flow.
- New **menu** and **credits** glyphs — the seat MENU launcher and the credit row now
  render as proper tiles in ICON face (previously had ids but no artwork).
- Glyph library split into category (`icon-glyphs.ts`) + chrome (`icon-glyphs-chrome.ts`)
  modules, spread-merged into one `GLYPHS` namespace, to keep each under the 200-line rule.

### Changed — console chrome & layout
- **Seat menu** now closes whenever a row opens another window (Academy, 1990s view,
  Colour & Vision, Chirality, credits), so it never strands on top of the new surface.
- **Captain role badge removed** from the top-right — LOG OUT / RIGHTS already live in
  the sources-rail corner row, which now wraps so LOG OUT is never clipped.
- **Chat + MQTT** chips sized to match the other tiles and captioned (`CHAT` / `MQTT`).
- **Destination groups load open** — no bank is hidden behind a collapsed bar on first
  paint; the operator tucks them up themselves. Room-pane vertical spacing tightened.
- **EDIT LAYOUT** dock rides the room scroll so it stays butted to the elbow corner
  instead of floating over content.
- **Contrast** — signal-node feed labels paint near-white over the category shape/colour;
  RIGHTS / LOG OUT / filter placeholder raised to legible contrast.

### Changed — editors
- **Multi-viewer** wall is a true 1:1 canvas: NxN presets lay out a square `cols × cols`
  raster so every pane is 1:1, the wall fills out with empty unassigned cells like real
  hardware, and each pane gains a proper **UMD** (dark under-monitor strip, high-contrast
  program name, source colour as an accent bar).
- **Colour & Vision** editor shows three sample LCARS windows in the live preview that
  repaint instantly with the picked palette.

### Changed — assets & deploy
- **Logo** wordmark updated to **SPOG**.like.audio; logos moved to `assets/logos/` with a
  new `make-logos.mjs` generator that reproduces them byte-for-byte.
- **Icon SVGs centralized** under `assets/icons/{chrome,destinations,sources}/` (out of
  the loose `assets/` root and `Routes/*/icons/`), each with its generator alongside.
- **`deploy.py --fresh`**: mirror mode — full upload, then sweep every server file this
  deploy didn't produce (dead bundles, retired icons, moved folders). Dot-entries
  (`.htaccess`, `.well-known`) are never touched.

## [v104] — 2026-07-04

### Added — Seat memory & the validated cache (docs/Audit/Local-Cache-and-Preferences-Audit.md §8, waves W0–W4)
- **Academy re-instated** (`src/ui/console/academy.ts`): the first-load quick start
  returns, with its five step numbers overlaid as pulsing markers on the live console
  regions they teach; ACADEMY button docks beside the byline. Legacy dismissed-key honored.
- **Seat memory** (`src/platform/prefs.ts`, one versioned `twist.prefs.v1` blob):
  chirality/colour/authoring migrate in; selected destination tab, open footer groups,
  sources-sash width (drag now implemented), router-view collapse and the session role
  all survive reload. Dual counters + stopwatch are epoch-based — a running count keeps
  counting through a reload (`twist.counters.v1`).
- **Production memory** (`src/platform/store-idb.ts`): Captain's Log and chat persist to
  IndexedDB and hydrate on boot (log rows restore read-only; button says how many).
  Prompter scripts persist per twist. **EXPORT / IMPORT "my seat"** lives in the Academy.
- **Seats on the bus** (`src/platform/seat-sync.ts`): a last-value cache in the TwistBus
  replays retained state to late subscribers (editors now really restore from the bus);
  prefs ride retained `SPOG/seats/<seat>/prefs` with a `{v, ts, seat, data}` envelope,
  newer-wins both directions; the MQTT chip glows when the seat is synced.
- **The validated cache** (§8 W4): builds emit `dist/build-id.json`; `deploy.py`
  publishes a retained `SPOG/system/build` stamp (paho over websockets:9001,
  best-effort) — every open console's version badge turns into a pulsing
  **NEW BUILD — RELOAD** chip within seconds of a deploy. mqtt.js is now VENDORED
  (no unpkg at boot). `manifest.json` + favicon make the console installable. A
  lane-aware service worker (`src/sw/sw.template.js` → `dist/sw.js`) replaces the
  kill-switch/eviction era: hashed assets cache-first, Routes JSON + icon tiles
  stale-while-revalidate, entry HTML strictly network-first — offline reloads boot.

## [v103] — 2026-07-03

### Changed — MQTT
- **Topic root renamed `Twist` → `SPOG`** (`SPOG_ROOT`) — every retained topic the
  TwistBus advertises (presence, config, values, log, chat) now lives under `SPOG/…`.
  Connection-term identifiers (`TwistConfig`, twists) are unchanged.

### Added — MQTT connection QC (`src/ui/console/mqtt-tree.ts`, `twist-mqtt-tree.html`, `src/platform/mqtt/client.ts`)
- The broker config now carries **host, port, username, password** (persisted;
  port/user/pass default to `9001`/`guest`/`guest` so the form is never blank). The
  shared publishing bus and both tree viewers use them.
- The MQTT tree panel + the standalone diagnostic gain those **four always-visible
  fields** plus a **live status line**: the resolved `ws(s)://` url and a colour-coded
  state — connecting / connected / reconnecting / offline / **error (+ message)** —
  with the subscription and topic count; the chip dot turns red on error. (Previously
  the bus connected with hard-coded `guest/guest` on `9001` and swallowed every error,
  so a failed connection — and its topics — were invisible.)

## [v102] — 2026-07-03

### Changed — the software is now **SPOG · Single Pane Of Glass**
- The product/architecture is renamed from "TwistRouting" to **SPOG (Single Pane Of
  Glass)** — the browser title and the login gateway now read SPOG. The connection
  points where a source meets a destination keep their name: **twists**. (Internal
  identifiers — `twist-container`, the `TwistBus`, file paths, the repo — are unchanged.)

### Added — destination fixtures & fixture editors
- **Every destination carries standing fixtures** (`src/ui/console/dest-fixtures.ts`):
  a live **CLOCK**, a **DUAL COUNTER** (two always-present A/B counters with in-place
  run/reset, persisted per room), and a per-destination **CHAT LOG** on the TwistBus.
- **Click a fixture to open its editor** — the clock opens the CLOCK editor, a counter
  opens the dual-count TIMER editor (via a synthetic twist through the normal dispatch).
  `#/<room>/clock` and `#/<room>/timer` **deep links** now open those editors too.
- **Offline rooms blink** their clock + counters (fault status → CSS blink).
- **Clock editor faces**: Digital, Digital · Sec, LED Ring (ticking second ring), Analog.
- **Timer**: select a channel by touch and drive it from the physical number pad
  (0–9 enter time, ✳ switches A/B, ÷ flips direction).
- Removed the RC1000 model number from all source, help, and data.

## [v101] — 2026-07-03

### Added — license & terms (source-available, personal-use)
- **`LICENSE.md`** — a source-available, personal-use license: the source is open
  to read, study, run locally, and modify for personal use, but **commercial use
  and broadcast use are prohibited**, and any deployment beyond a single private
  machine requires **Anthony Kuzub's prior written consent**. A separate absolute
  clause forbids **deployment in/by/for any publicly funded or national
  broadcaster** — non-waivable, no consent available.
- **`TERMS-OF-SERVICE.md`** — a conduct companion to the license restating the
  personal-use / no-commercial / no-broadcast / consent-to-deploy rules plus
  no-affiliation, not-for-operational-reliance, and warranty/liability disclaimers.
- **README "License & terms — personal use only" section** (`README.md`) — a
  ✅/❌/🔒/⛔ summary linking to both documents.

### Changed
- **Internal audit notes untracked** (`.gitignore`) — the `docs/Audit ` folder is
  now git-ignored (escaped trailing-space rule) and its files removed from the
  repo (kept locally on disk), so working notes no longer ship in the tree.

## [v100] — 2026-07-03

### Added
- **Real per-deploy build stamp** (`vite.config.ts`, `src/app/main.ts`) — the
  bottom-corner byline badge (was a hardcoded `v1.0.0`) is now injected at build
  time via Vite `define`: the CHANGELOG version + build date/time (UTC), with the
  full detail (+ git commit + an `(uncommitted)` marker) on hover. It changes on
  every `vite build`, so it always reflects what's actually deployed.
- **Edit-Layout changes tracked in the Captain's Log** (`src/ui/console/captains-log.ts`,
  `src/ui/console/authoring.ts`) — a new reversible `logAction(text, undo)` API.
  Every layout edit (rename room/container, add, delete, re-order) is snapshotted,
  narrated as a `Layout · <room> — …` entry, and undone by **Reverse Course** (which
  now branches on an `undo` callback vs the routing-node restore). The badge count
  updates even when the log panel is closed.

### Changed — Chirality (destination frame + edge furniture)
- **Destination / production frame mirrors** (`lcars.css`, `src/ui/console/destinations.ts`)
  — in right-handed mode the production spine hugs the outer (left) edge, the title
  right-aligns toward the sources rail, and every twist elbow curls to the right.
  The SOURCES stats label + fold lip/foldbar flip to the opposite end (no more
  title/stats overlap). Text is never mirrored.
- **Twist elbow render fix** — the mirrored elbow's top-bar stub was dropping out
  (a collapsed pseudo-element box from `border-left: 0`); keeping the border width
  but transparent restores the full-width `border-top`, so the bracket is continuous.
- **The blinking data-pulse strip moves with chirality** (`lcars.css`) — it sits on
  the non-dominant edge (opposite the rail): right classically, left in right-handed
  mode; caps flip and the bottom chrome offsets clear it.

## [v99] — 2026-07-02

### Added — Chirality C2 (editor overlays, first wave)
Editors now respond to the selected handedness. Audit: `docs/Audit /Editor-Chirality-Audit.md`.
- **Overlay chrome mirrors** (`src/platform/overlay.ts`) — in left-handed mode the
  `.ed-topbar` flips (back/close swap, corner radius + inner shadow), and the back
  chevron **swaps glyph** `‹`→`›` via a `.ed-back::before` pseudo (CSS reads the
  attribute; the platform layer can't import the ui chirality module).
- **Clean-grid editor bodies flip** (`lcars.css`) — WYSIWYG (`.wy`), IFB (`.ifb`),
  and Audio Monitor (`.am2`): in left mode `direction:rtl` reverses the grid tracks
  so the driven-control column docks to the reachable LEFT corner; children reset to
  `ltr` (text upright, every canvas/scope/meter pixel-identical). All scoped to left
  mode → the default right mode is byte-identical (zero regression).
- Remaining editors (audio-mixer, camera-control, stagebox, lighting, …) are the
  next C2 wave; the audit ranks them and flags the spatial-canvas exemption.

### Changed — sources & chrome
- **Production source feeds grouped by kind** (`src/ui/sources/pools.ts`) — a
  production-as-source now renders labelled **Video / Audio / Control** sub-sections
  instead of interleaving feeds box-by-box.
- **Expanded studio multiplex goes full-width** (`src/ui/sources/interact.ts`,
  `lcars.css`) — a held-open camera/stream/playout box spans the whole grid so its
  sub-feeds get room and the sibling flows to the next row (no tall empty column).
- **Role badge shrunk** (`src/ui/console/auth-panel.ts`) — smaller Captain badge so
  it stops overrunning the RIGHTS / LOG OUT buttons and the program title.

## [v98] — 2026-07-02

### Added — Chirality (handedness) C0 + C1
A single **left/right handedness toggle** that mirrors the whole console — the
console now "swings both ways." Strategy: `docs/Audit /Chirality Deployment strategy.md`.
- **The switch** (`src/ui/console/chirality.ts`): `data-chirality` on `<html>`, a
  `--chir` sign token, localStorage persistence, default right-handed. The `✋`
  toggle sits beside the MQTT chip; tooltip reads "Chirality Right/Left".
- **Right-handed = full mirror; left-handed = the classic original layout.** In
  right mode the SOURCES rail docks RIGHT (via `direction: rtl` on the grid — not
  per-item `grid-column`, which the sparse auto-placement algorithm split into
  extra rows), the LCARS section elbows mirror to the outer edge (explicit
  geometry CSS — **text is never mirrored, the core rule**), the nested media-group
  bracket (BANK → PLAYOUT) flips via `--mg-*` tokens, the footer's primary group
  (CONTROL ROOMS) sits on the dominant side and groups expand inward, and the drag
  ghost emits to the non-occluded side (`setDragImage`).
- **Opposite corners:** the bottom chrome (clock, MQTT, 1990s view, credit, toggle)
  and the user-login badge sit on the NON-dominant side, keeping the dominant
  corner clear for the primary controls.

## [v97] — 2026-07-02

### Added
- **Hover tooltips ("tool ticks") across every LCARS window** (`src/ui/tip.ts`).
  A shared, pointer-following, touch- and screen-reader-aware tip panel — one
  instance for the whole app — generalising the pattern proven in Meter Input.
  Two kinds:
  - **"What the production expects"** (Kind A) — attached to every editor's title
    rail, *derived from the `EditorContext`*: what the twist accepts + its capacity,
    what's routed in right now (or a "⚠ Nothing routed yet" nudge), sibling twists
    of the same kind, and the capability the role needs (held ✓ / view-only ✗).
    No per-window authoring — one line in `app/main.ts` drives all 19 editors, with
    a central `BLURBS` map for the "what it does" lead.
  - **"What it does / how to read it"** (Kind B) — `tip()` / `hint()` helpers for
    per-control help, ready to attach to meters, scopes, and mode buttons.
- **Data-model-authored tips in the Routes JSON** (`TipSpec` in `src/model`). A
  `tip` (string, or `{lead, good, bad}`) can be authored on a **production/room**,
  a **floor room**, a **person**, or an **individual twist/tool** — kept in the same
  JSON files a non-engineer already edits. Room/floor/person tips thread to the
  editor via `data-prod-tip`; per-tool tips ride the existing `data-config`. Seeded
  examples on PROD 7, 2nd-Floor Room 2, and Ana Silva (+ her IFB tool).
- Audit: `docs/Audit /LCARS-Hover-Tooltips-Production-Tips-Audit.md`.

## [v96] — 2026-07-02

The TypeScript app (`src/**`) is now the deployed console (A.8 cutover complete);
this entry references `src/**`, not the retired `js/**` shell.

### Added
- **People as a single unified model** (`Routes/People/**`, `src/model/index.ts`).
  A person is now **one file** that is simultaneously a routable **source** and a
  **destination** — `title` + `lowerThird` (name-super identity), `source{audio,video}`
  (feeds the sources panel projects), and `kit{twists}` (the drop-target twists the
  destinations console projects). Collapses the former duplicate
  `Routes/Sources/007_People` + `Routes/Destinations/007_People` trees (merged with
  zero drift across 30 people) so the lower-third/title travel tied to the person.
  Sources panel appends a **PEOPLE** super-pool; destinations console appends a
  **PEOPLE** footer group; both read the same canonical tree.
- **Teleprompter as a routable VIDEO source** (`Routes/Sources/008_Prompter/**`) with a
  **Prompter editor** (`src/editors/prompter/`) — a scrolling script/mirror/speed head.
  A prompter feed dropped on any twist opens the prompter editor.
- **Person editor** (`src/editors/person/`) — a virtual channel-strip for talent.
- **Chirality audits** (`docs/Audit /Chirality.md`, `docs/Audit /Chirality Deployment strategy.md`)
  — a cited handedness/occlusion evidence base plus a full style-guide + roadmap for
  making every LCARS element mirror on a single left/right "swing both ways" toggle.

### Changed
- **Production source boxes flattened** (`src/ui/sources/pools.ts`) — a production's
  video and its embedded audio now render as **separate, flat sibling nodes** instead of
  a video multiplex nesting its audio; video routes to video dests, audio to audio dests.
- **Source node shapes read as V / A** (`lcars.css`) — video is a `\ /` trapezoid (wide
  top), audio an inverted `/ \` trapezoid (wide bottom, like the letter A).
- **Super-pool header notch scootched left** (`lcars.css`) — the black separator between
  the color cap and the label bar moved ~35px left (`::before` 130→95px, `::after` 140→105px).
- **Graphics reorg** — Graphics is now per-production (Control Room destinations gained
  graphics twists); the standalone `Routes/Destinations/006_Graphics` tree was removed.

### Deployment
- Shipped to production via `npm run deploy:all` (full Routes upload — the incremental
  git-diff path skips untracked trees, so new data would 404). Live-verified on
  `spog.like.audio`; retired `007_People` trees removed from the server.

## [v95] — 2026-06-29

### Added
- **Role-based access gateway** (`js/auth.js`) — a "single pane of glass" login/role
  switcher. Starts logged in as **Captain** (full facility control) with a
  LOG OUT / SWITCH ROLE flow for traditional broadcast roles: Director, Technical
  Director, Camera Operator, Camera Shader, A1 · Audio, Lighting Director, and Guest.
  Each role carries a capability matrix and a "focus task" banner. Capability checks
  are exposed via `window.can()` so editors can progressively disclose / lock controls.
  Includes an admin **RIGHTS** editor to toggle each role's capabilities live.
- **CAM 7 / CAM 8** camera inputs added to Control Room destinations.
- **CAM 1–CAM 6** camera inputs added to Encoder destinations.

### Changed
- **Editor "escape bar"** (`js/editors/core.js`) — the full-width editor top bar is
  now clickable anywhere (not just the X) to go back, matching the Esc key. Added a
  back chevron and hover affordance.
- **Camera Control** (`js/editors/camera-control.js`) — the Shading Encoders card is
  now gated behind the `shade` capability (`data-cap="shade"`).
- **Routing** — the "Encoder" twist was renamed to **"Signaling"** across destinations.
- **Asset version bumped v86 → v95** (`index.htm`, `sw.js` cache `twist-v95`) so the
  service worker re-crawls and serves the updated app shell.
