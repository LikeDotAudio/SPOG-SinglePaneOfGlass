# Changelog

All notable changes to TwistRouting are recorded here.

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
  `twist.like.audio`; retired `007_People` trees removed from the server.

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
