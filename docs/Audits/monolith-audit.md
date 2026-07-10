# Monolith Audit & Refactoring Strategy

## Goal
Enforce a strict strict 200-line modularity limit across the codebase to ensure maintainability, readability, and separation of concerns.

## Current Discoveries (Grandfathered Monoliths)
The build pipeline currently flags 18 files that exceed the 200-line threshold. Here is the breakdown:

### 1. The Auto-Generated Giants
- **`src/platform/mqtt/schema.js` (1911 lines)**
- **`src/platform/mqtt/schema.d.ts` (723 lines)**
*Discovery*: These appear to be massive, flat definitions or auto-generated schema validation code for MQTT payloads.
*Strategy*: If auto-generated, move them out of `src` into a `.gitignore`'d `gen/` or `dist/` directory, or build them at compile time. If they are hand-written, break them into domain-specific schemas (e.g., `schema-audio.ts`, `schema-video.ts`, `schema-routing.ts`) and use an `index.ts` to barrel export them.

### 2. Complex Editors & Applications
- **`src/editors/prompter/index.ts` (469 lines)**
*Discovery*: The teleprompter editor handles scroll physics, text formatting, and MQTT publishing in one place.
*Strategy*: Break into `prompter-scroll.ts` (physics engine), `prompter-ui.ts` (DOM rendering), and `prompter-mqtt.ts` (state sync).

- **`src/editors/vision-mixer/index.ts` (294 lines)**
- **`src/editors/vision-mixer/dashboard.ts` (210 lines)**
*Discovery*: A full production switcher requires a lot of state. It currently merges the bus selector, keyer controls, and transition macros.
*Strategy*: Extract components: `bus-routing.ts`, `keyer-engine.ts`, and `transition-macros.ts`.

- **`src/editors/timer/engine.ts` (279 lines)**
*Discovery*: The timer engine handles clock synchronization, countdown logic, and the event loop.
*Strategy*: Isolate the pure math/time logic into `time-math.ts` and the event emitter/loop into `timer-loop.ts`.

### 3. Console & Dock UI Components
- **`src/ui/console/schedule.ts` (269 lines)**
*Discovery*: Manages the daily schedule data model, time overlap calculation, and the DOM editor overlay.
*Strategy*: Split into `schedule-data.ts` (pure functions for overlapping, sorting) and `schedule-editor.ts` (DOM/UI events).

- **`src/ui/console/voice-dock.ts` (268 lines)**
*Discovery*: Likely handles both WebRTC/Audio processing for intercoms and the DOM UI for the dock.
*Strategy*: Extract the WebRTC/audio context logic into a headless `src/platform/webrtc.ts` service, leaving only the UI bindings in `voice-dock.ts`.

- **`src/ui/console/mqtt-tree.ts` (242 lines)**
*Discovery*: Recursive tree rendering logic for raw MQTT payloads.
*Strategy*: Separate the DOM recursion (`mqtt-node.ts`) from the filtering/search logic (`mqtt-search.ts`).

- **`src/ui/console/auth-panel.ts` (214 lines)**
*Discovery*: We recently added to this file. It handles login modals, JWT generation, and the complex capability matrix.
*Strategy*: Move the matrix rendering to `auth-matrix.ts` and keep the login overlay in `auth-panel.ts`.

- **`src/ui/console/captains-log-timeline.ts` (207 lines)**
*Discovery*: It was recently refactored (data/render were moved out), but the core file is creeping back over 200 lines with filter logic.
*Strategy*: Move the `renderInto` filtering logic into a `timeline-filter.ts` helper.

### 4. General Editors
- **`src/editors/meter-input/live-input.ts` (241 lines)**
- **`src/ui/console/dest-fixtures-counters.ts` (221 lines)**
- **`src/ui/console/user-menu.ts` (210 lines)**
- **`src/editors/camera-control/index.ts` (207 lines)**
- **`src/ui/console/chat-dock.ts` (204 lines)**
- **`src/editors/encoder/index.ts` (202 lines)**
- **`src/editors/signal-conditioner/index.ts` (202 lines)**
*Strategy*: Most of these are hovering just above the 200-line mark. They can be easily brought into compliance by moving their CSS strings into `-css.ts` files, extracting TypeScript interfaces into `types.ts`, or pulling out complex event listener functions into standalone exported helpers.

## Next Steps for Execution
1. Pick one of the heavy targets (e.g. `prompter/index.ts`) and extract the CSS and types.
2. Split logic from rendering.
3. Remove them from the `check-file-size.mjs` grandfathered allowlist one-by-one.
4. Verify the pipeline enforces the strict 200-line limit moving forward.
