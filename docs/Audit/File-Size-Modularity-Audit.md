# FILE SIZE & MODULARITY — the 200-line audit
### Every script over 200 lines, and a concrete split plan for each one
*Audit date: 2026-07-04 · Repo state: TS build post-cutover (`06775c2 icons`) · Rule: no source file over 200 lines.*

---

## 1. Census

Every `.ts / .js / .mjs / .py / .sh` in the live tree was measured (worktree clones under
`.claude/worktrees/` and `node_modules` excluded — they are copies, fixing the source fixes them).

| Population | Files | Over 200 |
|---|---|---|
| Live tree (src, assets, scripts) | 247 | **48** |
| …of which `archive/js/` legacy (kept only for cutover revert) | — | 12 (not counted above) |

**48 offenders.** The good news: the project already has the idiom that fixes every one of
them — editors are folders (`src/editors/<name>/index.ts` + siblings like `styles.ts`,
`state.ts`, `engine.ts`, `view.ts`), and `camera-control/` + `meter-input/` + `clock/faces/`
already demonstrate the target shape. This audit is about finishing that pattern, not
inventing a new one.

**Archive is exempt by recommendation.** The 12 offenders in `archive/js/` (`matrix.js` 609,
`router-view.js` 460, `editors/audio-mixer.js` 322, `editors/stagebox-input.js` 287,
`captains-log.js` 283, `editors/core.js` 280, `topbar.js` 275, `sources.js` 258,
`editors/conditioner-row.js` 240, `globals.js` 225, `editors/camera-control.js` 218,
`editors/intercom.js` 204) are the frozen pre-cutover build. Do not refactor them; delete the
folder when the revert window closes.

---

## 2. The full offender ledger

### 2A. Editors (26 files)

| File | Lines | Over by | Verdict |
|---|---:|---:|---|
| `src/editors/vision-mixer/index.ts` | 1025 | 825 | deep split (worst in repo) |
| `src/editors/meter-input/index.ts` | 639 | 439 | deep split |
| `src/editors/meter-input/live-input.ts` | 611 | 411 | deep split (two files fused) |
| `src/editors/camera-control/index.ts` | 503 | 303 | deep split |
| `src/editors/clock/index.ts` | 445 | 245 | deep split |
| `src/editors/timer/index.ts` | 402 | 202 | deep split |
| `src/editors/stagebox-input/view.ts` | 378 | 178 | split |
| `src/editors/audio-positioner/index.ts` | 349 | 149 | split |
| `src/editors/audio-monitor/view.ts` | 325 | 125 | split |
| `src/editors/timer/engine.ts` | 323 | 123 | types extraction (single class) |
| `src/editors/graphics-engine/templates.ts` | 320 | 120 | split (catalog vs renderer) |
| `src/editors/ifb/view.ts` | 309 | 109 | split |
| `src/editors/audio-mixer/view.ts` | 285 | 85 | split |
| `src/editors/signal-conditioner/index.ts` | 281 | 81 | split |
| `src/editors/wysiwyg/view.ts` | 275 | 75 | one extraction (render loop) |
| `src/editors/multi-viewer/index.ts` | 274 | 74 | two small extractions |
| `src/editors/camera-control/controls.ts` | 272 | 72 | one extraction (dials) |
| `src/editors/iso-recorder/index.ts` | 258 | 58 | one extraction (replay) |
| `src/editors/person/index.ts` | 246 | 46 | two small extractions |
| `src/editors/weather/data.ts` | 233 | 33 | split (4 concerns, barrel) |
| `src/editors/graphics-engine/view.ts` | 228 | 28 | one extraction (rail) |
| `src/editors/encoder/index.ts` | 224 | 24 | one extraction |
| `src/editors/intercom/view.ts` | 222 | 22 | one extraction |
| `src/editors/lighting/view.ts` | 215 | 15 | one extraction (mqtt) |
| `src/editors/signaling/view.ts` | 209 | 9 | one extraction (marginal) |
| `src/editors/chronos/index.ts` | 206 | 6 | CSS → `styles.ts` |

### 2B. UI shell / app / platform / model (19 files)

| File | Lines | Over by | Verdict |
|---|---:|---:|---|
| `src/ui/console/authoring.ts` | 578 | 378 | deep split → folder |
| `src/ui/sources/pools.ts` | 460 | 260 | deep split → folder |
| `src/ui/console/matrix.ts` | 429 | 229 | deep split → folder |
| `src/ui/console/router-view.ts` | 421 | 221 | split (needs a state object) |
| `src/ui/console/colour-scheme.ts` | 384 | 184 | split → folder |
| `src/ui/console/chat-dock.ts` | 374 | 174 | split → folder |
| `src/ui/console/dest-fixtures.ts` | 363 | 163 | split → folder |
| `src/ui/console/captains-log.ts` | 347 | 147 | split → folder (state module first) |
| `src/app/main.ts` | 346 | 146 | split (composition root) |
| `src/ui/console/mqtt-tree.ts` | 330 | 130 | split → folder |
| `src/ui/icon-tiles.ts` | 322 | 122 | lift `GLYPHS` data (easiest win) |
| `src/ui/sources/panel.ts` | 289 | 89 | one extraction (gang) |
| `src/platform/mqtt/client.ts` | 268 | 68 | two small extractions |
| `src/model/index.ts` | 245 | 45 | split by domain, keep barrel |
| `src/ui/tip.ts` | 237 | 37 | split (panel vs expectation) |
| `src/ui/console/academy.ts` | 225 | 25 | content/CSS extraction |
| `src/ui/console/footer.ts` | 223 | 23 | CSS extraction |
| `src/ui/console/destinations.ts` | 222 | 22 | one extraction |
| `src/ui/console/auth-panel.ts` | 214 | 14 | extract `applyScope` |

### 2C. Scripts (3 files)

| File | Lines | Over by | Verdict |
|---|---:|---:|---|
| `deploy.py` | 427 | 227 | split into `deploy/` package |
| `assets/icons/sources/make-icons.mjs` | 353 | 153 | dedupe — 335 lines byte-identical with ↓ |
| `assets/icons/destinations/make-icons.mjs` | 350 | 150 | dedupe into shared `assets/icons/lib/` |

---

## 3. The recurring disease (and the standard cure)

The same five kinds of freight are inflating almost every offender. Each has a canonical
sibling-file destination that some editor in the repo already uses — so the cure is a
convention, not 48 bespoke refactors:

| Freight | Symptom | Standard destination | Already done in |
|---|---|---|---|
| **CSS-in-TS** | 40–190-line template-string `CSS` const | `styles.ts` | vision-mixer, meter-input, audio-positioner |
| **MQTT wiring** | `advertiseParams` + `publish*` + inbound `onParam` block | `mqtt.ts` (a `wire<X>Params(ctx, state, refs)` fn) | — (new convention) |
| **Canvas painters** | pure `draw*(canvas, state)` functions | `painters.ts` / `draw.ts` | camera-control (`bars.ts`, `maps.ts`) |
| **Types + presets + defaults** | interfaces, `DEFAULTS`, `PRESETS` tables | `state.ts` / `types.ts` | camera-control, encoder, stagebox-input |
| **Static data** | glyph libraries, template catalogs, help text, blurbs | dedicated data file (`glyphs.ts`, `templates.ts`, `help.ts`) | graphics-engine |

**Two contracts protect every split:**

1. **The registry contract.** `src/editors/registry.ts` globs `./*/index.ts` and reads only
   the **default export**. Every editor `index.ts` must keep `export default plugin`; nothing
   else in the repo imports named exports from editor `index.ts` files, so internals move
   freely to siblings.
2. **The barrel rule.** Where a file's *named* exports are consumed elsewhere
   (`live-input.ts`, `controls.ts`, `model/index.ts`, `captains-log.ts`, `matrix.ts`,
   `footer.ts`, `auth-panel.ts`, `tip.ts`, `weather/data.ts`, …), the original path stays as a
   barrel that `export * from` (or `export { x } from`) the new siblings. Zero consumers are
   touched; imports stay byte-identical.

**Folder graduation rule.** One or two extracted siblings → keep them flat next to the file.
Three or more → graduate to a folder with an `index.ts` barrel
(`src/ui/console/authoring.ts` → `src/ui/console/authoring/index.ts` + siblings). Vite/TS
resolve `./authoring.js` → nothing automatic here, so folder moves must repoint importers to
`./authoring/index.js` **or** keep a one-line `authoring.ts` shim that re-exports the folder —
prefer the shim for widely-imported modules.

---

## 4. Split plans — editors

### 4.1 `vision-mixer/index.ts` (1025) — the flagship offender
One giant `render` closure. The three genuinely separable subsystems:

```
src/editors/vision-mixer/
├── index.ts            state, buses, keyers, presets/scenes, sync, RAF, keyboard  (~450 → see below)
├── dashboard.ts        ScreenLayout type, persist, applyLayout, drag/resize observer (~130)
├── layout-drawer.ts    lmDrawer checkbox/preset/JSON-view UI                        (~100)
├── scene-editor.ts     scene-editor drawer + rebuildSceneEditorSel                  (~60)
├── mqtt-registry.ts    buildRegistry(state, def, deps) + legacy topic aliases       (~50)
└── panels.ts           pure DOM builders: transition section, aux row, macro row    (~80)
```
Extracting dashboard + drawer + scene-editor + registry (lines ~493–809, 905–944) drops
`index.ts` to ~650. Getting under 200 requires round two: pull `rebuildBuses`/`busButton`
(+ its three layouts) and `rebuildKeyers`/DSK into `buses.ts` and `keyers.ts`, each taking a
shared `Surface` context object `{ state, def, publish, sync, me }` instead of the closure.
That context object is the key move — it converts closure-coupled builders into importable
factories. Budget this one as its own work item; everything else in this audit is smaller.

### 4.2 `meter-input/` (index 639 + live-input 611)
`live-input.ts` is two files fused: a capture engine and a scope-painter library, with a
razor-clean seam at line ~245.

```
src/editors/meter-input/
├── index.ts            toolbar, source wiring, RAF glue, publish       (~200)
├── live-input.ts       createLiveInput + SourceMode/FrameData/LiveInput (~240)*
├── scopes-video.ts     View/IDENTITY_VIEW, IRE helpers, parade/wave/chroma/RGB/CIE/diamond/HSL/vector (~180)
├── scopes-audio.ts     gonio, scope3, recorder, VU pair, PeakState/drawMetersReal (~120)
├── cards.ts            card DOM builders, cardMap, header colours, floatCard (~130)
├── presets.ts          PRESETS layout table + applyPreset/restoreCard   (~70)
├── help.ts             HELP/INTRO text tables + tooltip attach          (~60)
├── hover-probes.ts     the ~15 hover.attach probe readers               (~90)
└── edit-detector.ts    edit-detection state machine + histogram-diff math (~90)
```
`index.ts:17-21` and `hover.ts:16` import ~15 named draw fns + `View` from `./live-input.js` —
keep `live-input.ts` re-exporting `export * from './scopes-video.js'` / `'./scopes-audio.js'`
so neither consumer changes. (*Still ~240; optional round two: SMPTE-bars generator →
`test-pattern.ts`, audio graph/tone → `capture-audio.ts`.)

### 4.3 `camera-control/` (index 503 + controls 272)
```
src/editors/camera-control/          (state/styles/bars/maps already exist — finish the job)
├── index.ts            state init, CameraConsole, build wiring, boot   (~150)
├── template.ts         host.innerHTML const + makeResizable/ResizeOpts (~90)
├── mqtt-axes.ts        unit conversions, Axis/AXES, buildAxisBridge → {publishState, seedPub, wireInbound} (~110)
├── glass-buttons.ts    colour-bars / Auto-WB hold / iris-hold encoder  (~80)
├── frame.ts            makeFrame(cc, deps) — the 33 ms loop            (~60)
├── dial.ts             fmt, NumKey, buildDial, buildShading            (~100)
└── controls.ts         buildJoystick, buildTally, buildPresets, buildFunctions (~165)
```
`controls.ts` re-exports `buildShading` from `dial.ts` so `index.ts:20` is untouched.

### 4.4 `clock/index.ts` (445)
```
├── index.ts     face registry (glob), toolbar, seed/MQTT, RAF glue   (~150)
├── styles.ts    the CSS const                                        (~50)
├── windows.ts   Device, setRect/select/floatWin/picker, addClock, addDate (~120)
├── layouts.ts   applyPreset tiling + SceneItem save/recall/persist   (~90)
└── paint.ts     WEEKDAYS/dateParts/paintDate/drawFace                (~50)
```

### 4.5 `timer/` (index 402 + engine 323)
```
├── index.ts       engine construction, channel select, keyboard, MQTT, RAF (~130)
├── styles.ts      CSS const                                     (~58)
├── wall-clock.ts  buildWallClock(ctx) — config persist, zone/res/face selects, drawClock (~100)
├── panel.ts       buildPanel(id) + FUNCTIONS drawer + GPI prompts (~100)
├── engine.ts      the TimerEngine class                          (~200)
└── engine-types.ts  ChanId/GpiWhen/Preset/Channel/TimerState/EngineHooks + mkChannel (~65)
```
`engine.ts` re-exports the types (`export type { ChanId, GpiWhen } from './engine-types.js'`)
so `index.ts` imports don't move. The engine is one cohesive class — if ~200 still offends,
pull Group C settings + GPI methods (lines 233–286) into free functions
`applySpecial(state, hooks, n)` in `engine-gpi.ts`; do **not** shard the class itself.

### 4.6 The mid-size editors (250–380)

| File | Extract | New siblings |
|---|---|---|
| `stagebox-input/view.ts` 378 | pure canvas + template + dials | `charts.ts` (drawHist+drawHPF ~95), `template.ts` (~50), `dials.ts` (~57) → view ~175. `buildPanel` stays in `view.ts`. |
| `audio-positioner/index.ts` 349 | class + painters + input | `fader.ts` (Fader class + buildGroups ~90), `draw.ts` (drawFace/drawPOVs ~45), `interaction.ts` (mouse/wheel ~45) → index ~170 |
| `audio-monitor/view.ts` 325 | painters + types + mqtt | `painters.ts` (drawLoud/drawLiss ~62), `types.ts`, `mqtt.ts` (wireMonitorParams ~50) → view <200 |
| `graphics-engine/templates.ts` 320 | catalog vs renderer | `templates.ts` keeps types+TEMPLATES+PRESETS+matchers (~150); `render.ts` gets renderGraphic+stateCount+lines/cardsOf (~140); templates re-exports render for `preview.ts` |
| `ifb/view.ts` 309 | painters + dials | `painters.ts` (drawFeed/drawDuck ~45), `dials.ts` (encoder builder ~60), resolveFeeds → `state.ts` → view ~185 |
| `audio-mixer/view.ts` 285 | strip + mqtt | `strip.ts` (stripEl+stateKnob ~120), `mqtt.ts` (wireMixerParams ~70) → view ~130 |
| `signal-conditioner/index.ts` 281 | styles + colour math | `styles.ts` (~45), `proc.ts` (BARS/applyProc/drawOverlay ~55), optional `state.ts` → index ~160 |
| `wysiwyg/view.ts` 275 | the render loop | `render.ts` (heatColor + paintFrame ~135) → view ~140 |
| `multi-viewer/index.ts` 274 | meters + channels | `meters.ts` (vuBank/meterBar ~35), `channels.ts` (channelsFor + types ~40) → index ~195 |
| `iso-recorder/index.ts` 258 | replay engine | `replay.ts` (buildReplay ~90), `channels.ts` (~20) → index ~160 |
| `person/index.ts` 246 | DSP math + painters | `dsp.ts` (EQ/comp math + presets ~40), `draw.ts` (drawEq/drawComp ~35) → index ~170 |

### 4.7 The near-misses (200–235) — one extraction each, don't over-engineer

| File | The one move |
|---|---|
| `weather/data.ts` 233 | Actually worth 4 files (it's a grab-bag): `types.ts`, `net.ts` (geocode/fetchForecast), `format.ts` (units/WMO/TZ helpers), `dayparts.ts`. `data.ts` becomes a barrel — `faces/strip.ts` and `weather.test.ts` unchanged. |
| `graphics-engine/view.ts` 228 | `rail.ts` ← railEntries + modeFor (~45) → view ~185 |
| `encoder/index.ts` 224 | `health.ts` ← telemetry interval, or lift MQTT block; move TileRef+slug into existing `state.ts` |
| `intercom/view.ts` 222 | `subcards.ts` ← static innerHTML (~18) + resolveFeeds→state.ts |
| `lighting/view.ts` 215 | `mqtt.ts` ← wireLightingParams (~40) → view ~178 |
| `signaling/view.ts` 209 | `mqtt.ts` ← advertise/onParam (~28). Only 9 over — lowest priority in the repo. |
| `chronos/index.ts` 206 | `styles.ts` ← the CSS const (~24) → index ~182 |

---

## 5. Split plans — UI shell, app, platform, model

### 5.1 `ui/console/authoring.ts` (578) → folder
```
src/ui/console/authoring/
├── index.ts       decorateRoom, initAuthoring, rights re-apply, downloadText (~150)
├── styles.ts      STYLE_ID + CSS + ensureStyles                    (~90)
├── commit.ts      snapshot/restore/commit + isEditing/setEditing   (~50)
├── forms.ts       openForm, Field kinds, TOOLS grab-bag, editRoom/editTwist/addContainer (~180)
├── drag.ts        wireContainerDrag                                (~75)
└── zoom-pan.ts    View/views/applyView/wireZoomPan                 (~65)
```
Consumers (`destinations.ts`, `main.ts`) import `decorateRoom`/`initAuthoring` — keep a
`authoring.ts` shim re-exporting the folder, or repoint the two importers.

### 5.2 `ui/sources/pools.ts` (460) → folder
```
src/ui/sources/pools/
├── index.ts             inferPoolKind, renderSourceLeaf, re-exports (~50)
├── caps.ts              CAP_MAP — currently DUPLICATED in pools.ts and panel.ts; single source here
├── fold.ts              togglePool/wireFold/tagOrigin               (~40)
├── video.ts             shape CSS + fillVideoCameras + renderVideoPool (~110)
├── audio-person.ts      renderAudioPool + renderPersonPool          (~85)
├── playout-streams.ts   playout + streams builders                  (~110)
└── productions.ts       renderProductionInputs                      (~60)
```

### 5.3 `ui/console/matrix.ts` (429) → folder
```
src/ui/console/matrix/
├── index.ts        initializeTwists drop handler + OpenEditor type  (~110)
├── crosspoints.ts  XP_CSS, numbering/caret/remove/reorder/refresh   (~135)
├── groups.ts       parseConfig, enforceTwistLimits, buildDroppedGroup, ensureDropZone, acceptsFor (~90)
├── place.ts        placeSourceInTwist + publishCrosspoints          (~55)
└── cascade.ts      CASCADE, leafFeeds, cascadeNodes, fanOutToInputs (~55)
```
Barrel must re-export `initializeTwists`, `OpenEditor`, `placeSourceInTwist` (router-view),
`publishCrosspoints`.

### 5.4 `ui/console/router-view.ts` (421) — the honest hard one
One big closure over shared mutable grid state. Splitting it properly means introducing an
explicit `RVState` object (rowLeaves, crossSet, DOM refs) passed to the extracted parts:
`styles.ts` (~45), `gather.ts` (pure DOM readers ~110), `grid.ts` (buildGrid + click/hover,
takes RVState). Without the state object, only styles+gather move and index stays ~230.
Recommendation: do the RVState refactor — this is exactly the 1990s-view module that will
grow, and the pure `gather.ts` readers become unit-testable.

### 5.5 The rest of the console chrome

| File | Plan |
|---|---|
| `colour-scheme.ts` 384 | folder: `palettes.ts` (data+guards ~100), `engine.ts` (paint/set/apply ~65), `editor.ts` (CSS + buildEditor + openColourEditor ~180), `index.ts` (initColourScheme + re-exports ~40). Engine/editor is the natural seam — the engine runs at boot pre-render, the editor lazily. |
| `chat-dock.ts` 374 | folder: `types.ts` (~20), `styles.ts` (~40), `media.ts` (downscale/esc/hms/autolink ~70), `view.ts` (bubble/renderThread/ingest, state injected ~80), `bus.ts` (~15), `index.ts` (initChatDock ~150) |
| `dest-fixtures.ts` 363 | folder: `shared.ts` (CSS + card/synthTwist helpers ~90), `clock.ts` (~15), `counters.ts` (counter store + stopwatchCtl + cards ~170), `chat.ts` (~70), `index.ts` (mountDestFixtures ~15). Note `synthTwist` is the graphics-suite mount seam — isolating it in `shared.ts` helps that roadmap too. |
| `captains-log.ts` 347 | folder — but **extract a `state.ts` first** (narratives/selected/seq counters are shared mutable module state; without it the split leaks): `types.ts`+`state.ts` (~40), `persist.ts` (IDB ~40), `narrate.ts` (labels + onMutations + reverseEntry ~120), `view.ts` (CSS + render ~55), `index.ts` (logAction/build/init ~110). Barrel re-exports `logAction` (5 call sites), `onLogEntry`/`LogEntryEvent` (MQTT bridge), `logTitle`. |
| `mqtt-tree.ts` 330 | folder: `mqtt-load.ts` (~40 — and dedupe with platform/mqtt's loader, see 5.7), `styles.ts` (~55), `tree.ts` (TreeNode/buildTree/renderRows ~70), `index.ts` (~160) |
| `academy.ts` 225 | `academy-content.ts` ← STEPS+ANCHORS+CSS (~85) → academy ~140 |
| `footer.ts` 223 | `footer-styles.ts` ← FOOTER_CSS+LCARS_COLORS+hexToRgb (~50) → footer ~175. Don't split the Footer object — shared module state. |
| `destinations.ts` 222 | `render-programs.ts` ← renderPrograms + gang/wrap helpers (~150) → destinations ~75 |
| `auth-panel.ts` 214 | `scope.ts` ← `applyScope` (~45) — it's imported by 4 modules and is a pure function; isolating it is worth doing regardless of line count. auth-panel re-exports it. |

### 5.6 `app/main.ts` (346) — composition root
```
src/app/
├── main.ts             imports + BUILD stamp + bootstrap            (~40)
├── blurbs.ts           BLURBS catalogue                             (~30)
├── editor-dispatch.ts  services/twistServices, openEditorForTwist, FIXTURE_EDITOR, synthTwistFor, openFromHash (~180)
└── shell.ts            buildConsole + sash wiring + init* calls     (~120)
```

### 5.7 Platform + model + tip

| File | Plan |
|---|---|
| `platform/mqtt/client.ts` 268 | `config.ts` ← broker persistence + resolveBrokerUrl (~55); `mqtt-load.ts` ← typings + loadMqtt (~30, **share with mqtt-tree's duplicate loader**); optional `topic-match.ts` ← pure `matches` (unit-testable). client.ts keeps createTwistBus (~180). |
| `model/index.ts` 245 | split by domain, keep `index.ts` as pure barrel (it is imported repo-wide — the path must not move): `common.ts` (~25), `sources.ts` (~110), `destinations.ts` (~30), `switcher.ts` (~65), `auth.ts` (~25), `index.ts` = `export *` × 5 (~10) |
| `ui/tip.ts` 237 | `tip-panel.ts` ← CSS + panel plumbing + attach (~95); `tip-expectation.ts` ← Kind-A pure builders + expectationHtml/expectationTip (~80); `tip.ts` keeps Tip/normTip/tip/hint + re-exports (~50). `expectationHtml` is pure — a testing win. |
| `ui/icon-tiles.ts` 322 | **Easiest win in the repo**: `glyphs.ts` ← the GLYPHS SVG-path const (~190 lines of pure data) → icon-tiles ~130. Optionally `template.ts` for tileSvg/mouseTileSvg. Barrel keeps `tileDataUrl` + `hasTile`. |
| `ui/sources/panel.ts` 289 | `gang.ts` ← GANG_CSS + buildGangCell + renderGang (~120) → panel ~165. Delete its duplicated CAP_MAP; import from `pools/caps.ts`. |

---

## 6. Split plans — scripts

### 6.1 `deploy.py` (427) → package
No shared mutable state, all pure functions + `main` — the cleanest split in the audit:
```
deploy.py            constants + main() + __main__        (~120)
deploy/env.py        load_env                              (~15)
deploy/build.py      run_build, find_entry, collect_app_files (~35)
deploy/manifests.py  icon-dir consts, write_manifest, generate_manifests (~40)
deploy/routes.py     is_tree_clean, get_changed_routes, get_all_routes, routes_hash (~90)
deploy/ftp.py        ensure_remote_dir, upload_file, remote_rmtree (~55)
deploy/mqtt_stamp.py publish_build_stamp                   (~50)
```
Keep the CLI identical (`python deploy.py [--all] [--next]`); the package is import-only.
(Note deploy.py:1 shebang/docstring and the `.env` convention stay with the entry file.)

### 6.2 `make-icons.mjs` ×2 (353 + 350) — a deduplication, not a split
`diff` confirms lines 1–335 of the sources and destinations generators are **byte-identical**
(squircle template + `G`/`GA` glyph libraries); they differ only in the 2-line header and the
trailing per-category `ICONS` manifest. (The old `Routes/*/icons/make-icons.mjs` copies are
already empty stubs — icons went programmatic.)
```
assets/icons/lib/template.mjs   shade, tile, hueShift, mouseTile, writeIcons(ICONS, outDir) (~100)
assets/icons/lib/glyphs.mjs     G + GA glyph libraries (pure data)   (~230)*
assets/icons/sources/make-icons.mjs        own ICONS manifest + one writeIcons call (~30)
assets/icons/destinations/make-icons.mjs   own ICONS manifest + one writeIcons call (~25)
```
*`glyphs.mjs` stays over 200 — it is a pure data table (SVG path strings), the one category
where a big file is the honest representation; splitting it into `glyphs-a-m.mjs`/`glyphs-n-z.mjs`
would be worse. If the rule is absolute, split static/animated: `glyphs.mjs` (G) +
`glyphs-animated.mjs` (GA). Longer-term: these authoring glyphs mirror the runtime `GLYPHS`
in `src/ui/icon-tiles.ts` — unification is possible but the runtime set omits SMIL and uses
palette tokens, so treat it as optional follow-up.

---

## 7. Execution order

Sequenced by value-per-risk; each phase is independently shippable and verifiable
(`npm run build` + the puppeteer UI-verify recipe).

| Phase | Scope | Files fixed | Effort |
|---|---|---|---|
| **P0 — free wins** | pure-data lifts, no logic moves: `icon-tiles/glyphs.ts`, make-icons dedupe, chronos/timer/clock/signal-conditioner `styles.ts`, academy/footer CSS, `model/` domain split (types only), `deploy/` package | ~12 | ~1 day |
| **P1 — near-misses** | the one-extraction files of §4.7 + §5.5 bottom (encoder, intercom, lighting, signaling, destinations, auth-panel `scope.ts`, panel `gang.ts`, tip, weather barrel, platform/mqtt) | ~11 | 1–2 days |
| **P2 — editor splits** | §4.6 mid-size editors (painters/mqtt/state siblings), then timer + clock + camera-control + stagebox + audio-positioner | ~14 | 3–4 days |
| **P3 — console folders** | authoring/, pools/, matrix/, colour-scheme/, chat-dock/, dest-fixtures/, captains-log/ (state.ts first), mqtt-tree/, app/main split | ~9 | 3–4 days |
| **P4 — the two beasts** | meter-input (index + live-input) with the scopes-video/scopes-audio barrel; then vision-mixer with the `Surface` context refactor; router-view with `RVState` | 5 | 3–5 days |

**Guardrails for every phase**
- Editor `index.ts` keeps `export default plugin` — the registry globs it (`registry.ts:14`).
- Any file with external named-export consumers becomes a **barrel**, never a tombstone.
- New siblings follow the established names: `styles.ts`, `state.ts`/`types.ts`, `mqtt.ts`,
  `painters.ts`/`draw.ts`/`render.ts`, `channels.ts`/`feeds.ts`.
- After each phase: `npm run build`, then spot-check one touched editor end-to-end in the
  console (drop a source, open the editor, watch MQTT params in the tree panel).
- Add a CI tripwire so the ledger never regrows: a ~15-line script that fails the build when
  any non-archive source exceeds 200 lines (e.g. `scripts/check-file-size.mjs` wired into
  `npm run build`'s pre-step). Grandfather the not-yet-split files with an explicit allowlist
  that shrinks each phase.

---

## 8. Honest exceptions

Three places where the 200-line rule fights the material; recommend explicit allowlisting
rather than artificial splits:

1. **`timer/engine.ts` class body (~200 after types extraction)** — one cohesive state
   machine; sharding a class across files hurts more than 60 extra lines.
2. **Pure data tables** — `assets/icons/lib/glyphs.mjs` (~230 of SVG path strings),
   `graphics-engine` template catalogs. Data files read top-to-bottom; splitting them
   mid-table helps nobody. Split static/animated if the rule must be absolute.
3. **`archive/js/`** — frozen revert copy; delete, don't refactor.
