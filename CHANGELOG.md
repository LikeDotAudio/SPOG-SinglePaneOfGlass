# Changelog

All notable changes to TwistRouting are recorded here.

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
