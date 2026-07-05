# Changelog

All notable changes to SPOG (Single Pane Of Glass) are recorded here.

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
