# TwistRouting — TypeScript Migration & WebAssembly / Modern-Web Report

> Companion to `docs/ARCHITECTURE-AUDIT.md`. Part A: a concrete, low-risk path to
> TypeScript. Part B: an honest, forward-looking assessment of where WebAssembly
> (and the rest of the modern web platform) genuinely move this app forward —
> versus where they'd be hype.

The codebase is now **native ES modules** (Phase 2 done): ~26 files, single
`main.js` entry, explicit `import`/`export`, a registry pattern (`editors/`),
centralized `core/state.js`, and a clean DnD `DataTransfer` contract. That ES-module
foundation is *exactly* what makes both TypeScript and a WASM core tractable.

---

## PART A — TypeScript

### A.0 Why now
TS pays off most where there are **data contracts crossing module boundaries**, and
this app has several implicit ones that currently live only in comments:
- The **JSON data shapes** (`Routes/Sources/**` and `Routes/Destinations/**`): pools,
  stage boxes, playouts, productions, twist configs.
- The **DnD `DataTransfer` protocol** (`text/plain` = ids, `source-type` = `'pool'`).
- The **editor registry** contract (`register(test,title,render)`, `render(body,twist,config)`).
- The **`window` bridges** (`window.TopBar`, `window.Editors`, `window.Tutorial`, `window.RouterView`, `window.loadAllDestinations`).
Each is a real bug surface (the stale-manifest folder-rename and the lazy-load
`dragWired` regression were both "shape/expectation drifted" bugs that types would
have flagged).

### A.1 Two migration paths

**Path 1 — JSDoc + `checkJs` (NO build step).** Keep shipping plain `.js` ES modules;
add types in JSDoc comments and a `tsconfig.json` with `allowJs/checkJs`. `tsc --noEmit`
type-checks in CI/editor; the browser runs the untouched `.js`. **This preserves the
project's defining "no build, drop a file in and it works" ethos** and the Service
Worker / static-host deploy model. Recommended **first** step.

```jsonc
// tsconfig.json  (type-check only, emit nothing)
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "allowJs": true, "checkJs": true, "noEmit": true,
    "strict": false, "strictNullChecks": true, "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"]
  },
  "include": ["js/**/*.js", "types/**/*.d.ts"]
}
```
```js
/** @typedef {import('./types/model').StageBox} StageBox */
/** @param {StageBox} data @param {HTMLElement} container */
export function renderVideoPool(data, container) { /* … */ }
```

**Path 2 — full `.ts` with a build step.** Convert files to `.ts`, compile with
**esbuild** (or Vite) to `dist/`. Gives the strongest guarantees and best DX, at the
cost of a build/watch and a deploy change (serve `dist/`, update `uploadftp.py` +
the Service-Worker shell). Recommended **second**, once the domain types exist.

> Recommendation: **start Path 1** (types with zero build risk), graduate the hottest
> files to Path 2 once `types/model.d.ts` is stable. They coexist (`allowJs`).

### A.2 The domain model (write this first — it's 80% of the value)
A single `types/model.d.ts` capturing the JSON the app reads:

```ts
export type RGB = `${number},${number},${number}`;
export type Hex = `#${string}`;

export interface StageBox {                 // Routes/Sources/<cat>/<floor>/NNN.json
  id: string; name: string; prefix: string; count: number;
  extraClass: string; color?: Hex; floor?: string; level?: number;
  items?: string[];                         // audio: explicit channel labels
  status?: string;                          // e.g. "NO CONNECTION" → isFaultStatus()
}
export interface Playout {                  // Routes/Sources/Play/Playout N.json
  id: string; name: string; color: Hex;
  players: { id: string; name: string;
    videos: { id: string; name: string;
      stack: { video: string; audio: string[] } }[] }[];
}
export interface Production {               // Routes/Destinations/**, Sources/Prod/*
  id: string; name: string; color?: Hex; parentName?: string; status?: string;
  outputs?: { video?: string[]; audio?: string[]; intercom?: string[] };
  twists?: (string | TwistConfig)[];
}
export interface TwistConfig {
  name: string; accepts?: 'video' | 'audio' | 'both';
  inputs?: string[]; monitor?: boolean; row?: string;
  maxVideo?: number; maxAudio?: number;
}
export type Manifest = string[];            // index.json (entries end "/" = folder)
export type PoolKind = 'video' | 'audio' | 'playout' | 'productions';
```
This turns `inferPoolKind`, `channelsFor`, `renderPrograms`, the pool renderers and
`sources.js` into type-checked functions and makes the manifest/folder contract
explicit (would have caught the `Audio/`→`Sound/` rename mismatch).

### A.3 Typing the seams
- **DnD contract** → a const + type so `dragDrop`, `matrix`, `touchDrag`, `router-view`
  share one definition:
  ```ts
  export const DND = { IDS: 'text/plain', KIND: 'source-type' } as const;
  export type SourceKind = 'pool';
  ```
- **Registry** → a generic, replacing the loose-regex `KINDS`:
  ```ts
  interface EditorPlugin { id: string; match(name: string): boolean;
    title: string; render(body: HTMLElement, twist: HTMLElement, cfg: TwistConfig|null): void; }
  ```
- **`AppState`** (`core/state.js`) → an interface; kills `any` on the shared mutable state.
- **`window` bridges** → `types/globals.d.ts` with `declare global { interface Window { … } }`
  for `TopBar`, `Editors`, `Tutorial`, `RouterView`, `loadAllDestinations`, and the
  inline-`onclick` names (`togglePool`, `toggleHelix`, `toggleRecord`, `removeSwimmer`).
- **DOM data-attributes** are an untyped contract today (`data-prod-name`, `data-config`,
  `data-origin`, `dataset.dragWired`). Document them in a `Dataset` interface; long-term,
  the architecture audit's move from DOM-scraping to passing models removes most of them.

### A.4 Tooling
- **Type-check:** `tsc --noEmit` (Path 1) in a `pre-commit`/CI step.
- **Build (Path 2):** `esbuild js/main.ts --bundle --format=esm --splitting --outdir=dist`
  — millisecond builds, ES-module output, tree-shaking. Vite if you want HMR dev server.
- **Lint:** `typescript-eslint` with `@typescript-eslint/strict-type-checked` on the typed files.
- Keep the Service Worker: if you adopt Path 2, point the SW `SHELL` at `dist/` and have
  `uploadftp.py` deploy `dist/` instead of `js/` (one-line change to the rank function).

### A.5 Phased TS plan (each step shippable, no big-bang)
1. **Add `tsconfig.json` (checkJs) + `types/model.d.ts` + `types/globals.d.ts`.** Zero runtime change; light up errors in the editor.
2. **JSDoc the leaf utils** (`util/*`, `core/state`, `globals` net helpers) — pure, easy, high signal.
3. **JSDoc the data layer** (`sources`, pools, `productions`, `app`) against `model.d.ts`.
4. **JSDoc the seams** (DnD, registry, editors). Fix the type errors surfaced.
5. **Optional Path 2:** rename `.js`→`.ts`, add esbuild, ship `dist/`. Do hottest/most-coupled files first (`matrix`, `sources`, `editors`).
6. Turn on `strict` once the above is clean.

---

## PART B — WebAssembly & the modern web

### B.0 Honest framing
WebAssembly accelerates **CPU-bound compute** (DSP, codecs, crypto, physics, big
numeric/graph work) and enables **sharing one engine across browser + server +
native**. It does **not** speed up DOM manipulation, event handling, layout, or
network IO — which is ~95% of what this app does today. So "rewrite it in WASM" would
be **net-negative** for the current app (more toolchain, no DOM speedup, larger payloads,
JS↔WASM marshalling overhead on every DOM touch).

The forward-thinking question isn't "where do we bolt on WASM," it's **"as this grows
from a routing *simulator* into a real broadcast control surface, where does heavy
compute appear — and what platform primitive fits each?"** Below: WASM where it earns
its place, and the *other* modern-web primitives that matter more for the rest.

### B.1 The one genuinely compelling WASM use — a portable **routing engine core**
The app's domain is a router (sources → crosspoints → destinations, with salvos,
tie-lines, tally, mix-minus, lock/protect). That logic is **pure, deterministic, and
identical on client and server**. Today it's implicit in the DOM (`router-view.js`
re-derives crosspoints by scraping `.drop-zone`s).

Extract it into a **`routing-core`** compiled from **Rust** (via `wasm-bindgen`) or
**AssemblyScript** to WASM:
- Inputs: a normalized graph (senders, receivers, current crosspoints, salvos, locks).
- Ops: `take(src,dst)`, `salvo(list)`, `solveTieLines()`, `computeTally()`,
  `mixMinus(bus)`, `diff(prev,next)`, crosspoint queries for the 1990s view at scale.
- Outputs: deterministic state + an event diff.

Why WASM specifically here: **one binary is the single source of truth** — the same
core runs in the browser (instant UI), in a Node/Deno **server** (authoritative state,
multi-operator sync), and could embed in native/edge later. It removes the "logic lives
in the DOM" smell the audit flagged, is trivially unit-testable, and stays fast if the
matrix grows to thousands of crosspoints (where JS `Set` scans in `router-view` would
start to drag). This is the *forward-thinking* move: **portable routing logic, not a
WASM-ified UI.**

> Reality check: at today's scale (hundreds of crosspoints) plain TypeScript is plenty.
> The WASM core's value is **portability + a server-authoritative future**, not present-day speed.

### B.2 Real-time media — where WASM shows up *if the editors become real*
The editors currently **simulate** signal flow (fake VU meters, T-bar, talk groups).
The moment any of them touch real media, the right primitives are:
- **Audio Mixer → Web Audio + `AudioWorklet` + WASM DSP.** Real faders/EQ/aux-sends/
  mix-minus = sample-accurate DSP on the audio thread. AudioWorklet runs WASM in the
  realtime audio context — *this* is a textbook, high-value WASM use (EQ/dynamics/pan laws).
- **Multiviewer / ISO / Vision Mixer → `WebCodecs` + `WebGPU`/`OffscreenCanvas`.** Real
  thumbnails, tally-bordered tiles, transitions: decode with WebCodecs (hardware), composite
  on the GPU. WASM only for exotic codecs/scalers WebCodecs lacks; otherwise GPU > WASM here.
- **Tally / metering at scale → `SharedArrayBuffer` + Worker.** Push meter/tally state
  through shared memory to keep the UI thread free.

### B.3 The upgrades that matter *more* than WASM right now
Ranked by value-for-this-app:
1. **TypeScript** (Part A) — biggest correctness ROI, no runtime cost.
2. **A real-time transport** — `WebSocket` (or `WebTransport`) to an actual router/control
   backend, so the UI reflects/*drives* real hardware. This is the difference between a
   simulator and a control surface, and it's what makes B.1's server core worthwhile.
3. **Web Components / custom elements** — the architecture audit's `ui/` widget library
   (knob, fader, meter, pill, crosspoint) as real custom elements with Shadow DOM:
   encapsulated, reusable, framework-free, and a natural home for the duplicated editor CSS.
4. **WebGPU / Canvas** for the visuals (`getDNAHtml` SVG helix, VU meters, the crosspoint
   grid at scale) — smoother than per-frame DOM/SVG churn; pairs with `OffscreenCanvas` in a Worker.
5. **View Transitions API** for the overlay/editor open-close and tab switches — native, cheap polish.
6. **IndexedDB** (alongside the Service Worker) for routing snapshots/salvos/user layouts —
   structured local persistence beyond the current `localStorage` flags.
7. **PWA manifest + installability** — you already have a Service Worker and offline cache;
   add a web-app manifest to make it an installable control-surface app on a tablet/touch panel.

### B.4 A pragmatic WASM roadmap (only if/when warranted)
- **Now:** none. Ship TypeScript; keep routing logic in TS but **structured as a pure
  `routing-core` module** with no DOM deps (so it's WASM-portable later).
- **When multi-operator / server-authoritative sync is needed:** compile that same core to
  WASM (Rust + `wasm-bindgen`, or AssemblyScript for a lighter toolchain) and run it both
  client- and server-side.
- **When real audio lands:** AudioWorklet + WASM DSP for the mixer.
- **When real video lands:** WebCodecs + WebGPU (WASM only for codec gaps).
- Always measure first — JS engines are very fast; reach for WASM on a profiled hot path or
  a portability requirement, not on spec.

---

## Bottom line
- **Do TypeScript now** — Path 1 (JSDoc + `checkJs`, no build) → domain types → seams →
  optional `.ts`+esbuild. The ES-module refactor already paid the hard cost; this is the payoff.
- **Don't WASM-ify the UI.** The single forward-thinking WASM play is a **portable
  `routing-core`** (browser + server), and even that is a "when you add real-time sync"
  move, not a today move.
- **The bigger modern-web wins for this app are TypeScript, a real transport, Web
  Components for the widget library, and GPU/WebCodecs/AudioWorklet *when the editors
  stop simulating and start carrying real signal.***
