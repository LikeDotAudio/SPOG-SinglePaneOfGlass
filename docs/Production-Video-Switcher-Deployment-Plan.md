# Production Video Switcher — Deployment Plan

**A build spec for the revised Vision Mixer editor.** Augments
[`Production-Video-Switcher-Audit.md`](./Production-Video-Switcher-Audit.md): the audit says
*what a professional switcher is*; this says *what we build*, *how it stays compatible with the
existing software* (plugin architecture, chirality, colour engine, MQTT/SPOG schema, tooltips),
and *how the definition ships into every production*.

**Status:** design proposal — nothing is built or changed yet. Review + redirect before Phase 0.

---

## 0. Decisions locked / to confirm

| # | Decision | Value | Confirm? |
|---|---|---|---|
| D1 | Input count | **24** source inputs | ✅ from brief |
| D2 | "3 rows" | **3 M/E banks** (each: PGM+PST buses, own transition, keyers), with delegation + re-entry. | ✅ **locked** |
| D3 | Routing | **Internal only** — internal source select, internal aux, internal re-entry. **No** external router control, IP transport, NMOS, salvos-to-router. | ✅ from brief |
| D4 | Nature | **Front-end simulation** (consistent with the rest of TwistRouting — no real video), driven by rAF; every control is real, the pictures are simulated. | ✅ house rule |
| D5 | Sub-editors | **DVE editor** (transform presets) + **M/E editor** (composite presets) + **Scene recall** (whole-switcher snapshots). | ✅ from brief |
| D6 | Tooltips | Every control carries a **Kind-B tip** (`tip()`/`hint()` from `src/ui/tip.ts`) explaining what it does. | ✅ from brief |
| D7 | Deploy target | The switcher **definition ships into all 10 control-room productions** (5 Primary + 5 Secondary). | ✅ from brief |
| D8 | 24-input layout | **Flexible — the operator chooses.** A runtime setting offers **2×12 + shift** (default) · **24-wide** · **2×12 stacked**. Persisted per device like chirality/colour; a production can set the default. | ✅ **flexible** |
| D9 | Presentation prefs | **The operator gets the choice.** Layout, PGM/PVW handedness, shift-vs-stacked, and bus density are **runtime preferences**, not baked-in — same philosophy as the chirality toggle and colour-scheme picker. Config sets defaults; the operator overrides. | ✅ from brief |

---

## 1. Scope — audit features mapped to this build

Scoped so it is *complete for a professional switcher* yet buildable as front-end sim, minus
external plumbing.

| Audit feature | In this build | Notes |
|---|---|---|
| Program / Preview buses, flip-flop | ✅ per M/E | `--state-onair` PGM, `--state-ok` PVW |
| 24 inputs, named/tinted | ✅ | tint by signal category `--sig-*` + a shape cue |
| **3 M/E banks** + re-entry | ✅ | an M/E's output is a selectable source on the others |
| Split / half-M/E | ⏸ later | out of Phase 1–3 |
| Transitions: cut / mix / wipe / DVE | ✅ | + T-bar + auto-rate |
| Transition extras: dip, NAM/FAM, look-ahead preview | ✅ | look-ahead drives the PVW monitor |
| Wipe pattern picker + border/softness | ✅ | in M/E editor |
| Keyers per M/E (luma / chroma / linear / split / preset-pattern) | ✅ (4 per M/E) | each with a per-key DVE resizer |
| Key masking, priority, key memory | ✅ | in M/E editor |
| **Downstream keyers (DSK)** | ✅ (2–4) | last layer, above all M/Es |
| **DVE / transform engine** (2D/3D, corner-pin, page-turn, lighting, trails) | ✅ | DVE editor + keyframe A→B |
| Snapshots / **scene recall** (register memory) | ✅ | whole-switcher state registers |
| Keyframe timelines | ✅ (DVE) | A→B interp per the audit §6.1 lineage |
| Macros | ⏸ Phase 4 | rides the MQTT command surface |
| Internal aux buses + clean feed | ✅ (aux, internal) | no router control |
| Still / clip store (internal, simulated) | ⏸ Phase 4 | fill sources for keys |
| Multiviewer | ➖ external | the console already *is* the multiview; not rebuilt here |
| Tally (internal state) | ✅ | drives the console tally per D-plan §6 |
| **External routing / IP / NMOS / salvos** | ❌ excluded | per D3 |

---

## 2. Component model (file layout)

Split one-concern-per-file, matching the `clock/faces` and `chronos/displays` idiom (glob-friendly,
each unit testable):

```
src/editors/vision-mixer/
  index.ts        # plugin manifest + host render: layout, delegation, wiring, rAF
  schema.ts       # SwitcherDef + sub-types + the canonical DEFAULT definition (§4)
  styles.ts       # CSS — colour-token + chirality aware (§5)
  me.ts           # M/E bank: PGM/PST buses, transition engine, keyer stack, re-entry
  keyer.ts        # keyer model + inline editor (type/source/fill/mask/DVE)
  dve.ts          # DVE editor: 2D/3D transform, corner-pin, keyframe A→B, presets
  scenes.ts       # snapshot capture/recall (register memory) + scene library
  presets.ts      # starter DVE / M/E / scene preset library (§7)
  mqtt.ts         # ParamSpec builder + publish/subscribe wiring (§6)
  tips.ts         # Kind-B tooltip content map, one entry per control (§8)
  index.test.ts   # dispatch + schema-default + scene round-trip tests
```

The current `vision-mixer/{index.ts, styles.ts}` is **replaced** (its plugin `id`/`match`/`order`
and MQTT param names are preserved for backward compatibility — §9).

**Layout (default, right-handed):**
```
┌ PRIMARY — <PROD> · VISION MIXER ───────────────────────────── [M/E 1][M/E 2][M/E 3] ┐
│ ┌ PROGRAM (red) ─────────┐   ┌ T-BAR ┐   ┌ PREVIEW (green) ────────┐                │
│ │  simulated PGM feed     │   │  ▲PVW │   │  simulated PVW (look-    │                │
│ │                         │   │  ▓▓▓  │   │  ahead of next take)     │                │
│ └─────────────────────────┘   │  ▼PGM │   └──────────────────────────┘                │
│ PROGRAM  [IN1][IN2]…[IN12]  (shift → IN13..24)   ← delegated to active M/E            │
│ PREVIEW  [IN1][IN2]…[IN12]  (shift → IN13..24)                                        │
│ ┌ TRANSITION ┐  ┌ KEYERS (this M/E) ┐  ┌ DOWNSTREAM KEYERS ┐  ┌ SCENES ┐             │
│ │ CUT MIX    │  │ K1 K2 K3 K4  ⚙edit │  │ DSK1 DSK2  ⚙edit    │  │ 1..8 ⚙  │             │
│ │ WIPE DVE   │  └────────────────────┘  └─────────────────────┘  └────────┘             │
│ │ rate  TAKE │  [ M/E EDITOR ]  [ DVE EDITOR ]                                         │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- The **M/E selector** (top-right) delegates the surface to one of the 3 banks — mirrors the
  audit's *delegation* paradigm; avoids three stacked 24-wide bus rows.
- **⚙ edit** opens the relevant sub-editor (keyer / DSK / DVE / scene) as an in-panel drawer or a
  nested `openOverlay`, consistent with how editors already open.

---

## 3. How the three sub-editors work

**M/E editor** — build and name a *composite look* for a bank: background source, each keyer's
type/source/fill/mask/priority/DVE, and the armed transition. Save as an **M/E preset**; recalling
it sets the whole bank in one action (this is the audit's "build offline, take to air").

**DVE editor** — the digital-optics surface (audit §6). A flat image you *fly*: X/Y/Z position,
scale, 3D rotation, perspective, corner-pin; effects (border, crop, drop-shadow, defocus, glow,
page-turn, trails). **Keyframe A→B** with an interpolation curve — the direct descendant of the
1981 joystick+keyframe workflow. Save as a **DVE preset** assignable to any keyer or the transition.
(Optional: bind the console's existing **joystick delegation** if a panel is present.)

**Scene recall** — a **register memory**: capture the *entire switcher state* (all 3 M/Es, DSKs,
DVE assignments, tbar-at-rest) into a numbered/nameable **scene**, recalled in one press. Scenes are
the "snapshots / E-MEM" of the audit §8, and are the unit "deployed into every production."

---

## 4. Schema definition — the per-production `SwitcherDef` (D7)

The definition rides the existing per-twist config path. Today a `Video Mixer` twist is a
`TwistConfig` with `inputs[]`. We **extend `TwistConfig`** with one optional field so it stays
backward-compatible (like `tip` already rides through `data-config`):

```ts
// src/model/index.ts — additive, optional
export interface TwistConfig {
  /* …existing… */
  switcher?: SwitcherDef;      // NEW: rich vision-mixer definition (absent ⇒ editor default)
}

// src/editors/vision-mixer/schema.ts
export interface SwitcherDef {
  inputs: InputDef[];                 // up to 24
  mes: number;                        // M/E banks (default 3)
  keyersPerMe: number;                // default 4
  dsks: DSKDef[];                     // downstream keyers (2–4)
  dveChannels: number;                // floating DVE channels (default 4)
  dvePresets: DVEPreset[];            // named transform presets
  mePresets: MEPreset[];              // named composite looks
  scenes: SceneDef[];                 // register memory (whole-switcher snapshots)
  transitions?: TransitionKind[];     // default ['cut','mix','wipe','dve']
  wipePatterns?: string[];            // pattern ids for the wipe picker
  // Presentation DEFAULTS only — the operator's per-device preference overrides these (§5, D9).
  layout?: 'shift12'|'wide24'|'stack12';   // default 'shift12'
  handedness?: 'fixed'|'follow-chirality'; // PGM/PVW side behaviour; default 'fixed'
}
export type BusLayout = 'shift12'|'wide24'|'stack12';
```

Operator preference (per device, overrides the def default):
```ts
// src/editors/vision-mixer/prefs.ts  (pattern mirrors chirality.ts / colour-scheme.ts)
export interface VmPrefs { layout: BusLayout; handedness: 'fixed'|'follow-chirality'; }
export function getPrefs(): VmPrefs; export function setPrefs(p: Partial<VmPrefs>): void;
export function applyStoredPrefs(): void;   // pre-render, no flash
// persisted at localStorage 'twist.vm.prefs'; emits 'vm-prefs-change'
export interface InputDef { label: string; category?: 'video'|'audio'|'program'; color?: string; reentry?: number /* M/E index if this input is an M/E output */; }
export interface DSKDef { name: string; type: KeyerType; source?: string; }
export type KeyerType = 'luma'|'chroma'|'linear'|'split'|'preset-pattern';
export interface KeyerDef { type: KeyerType; source?: string; fill?: string; dvePreset?: string; mask?: MaskDef; priority?: number; }
export interface DVEPreset { id: string; name: string; kf: DVEKeyframe[]; /* A→B… */ }
export interface DVEKeyframe { x:number; y:number; z:number; scale:number; rotX:number; rotY:number; rotZ:number; cornerPin?: number[]; effect?: DVEEffect; ms:number; }
export interface MEPreset { id: string; name: string; bg: string; keys: KeyerDef[]; }
export interface SceneDef { id: string; name: string; state: SwitcherState; }  // full snapshot
```

**Fallback contract:** the editor ships a canonical **`DEFAULT_SWITCHER`** in `schema.ts` (24
generic inputs, 3 M/E, 4 keyers, 2 DSK, 4 DVE channels, a starter preset library §7). A
production's `switcher` overrides fields it cares about (usually just `inputs` labels). So
"deployed into every production" = the definition is guaranteed present (from the default) and
**overridable per production** — no 10× copy-paste drift.

---

## 5. Compatibility contract — colour, chirality, tooltips

**Colour engine** (fixes today's hardcoded hex):
- PGM state → `var(--state-onair)`, PVW → `var(--state-ok)`, alarm/off-air → `var(--state-alarm)`.
- Source buttons tinted by category via `--sig-video / --sig-audio / --sig-program`, **paired with a
  shape cue** (a small category glyph or a clip-path chevron) so meaning survives `data-chroma="grey"`
  and `mono` — the same rule the colour editor follows.
- No raw hex in `styles.ts`; everything reads Tier-2 tokens so the switcher rides `data-cvd`
  (palette), `data-chroma`, `data-vision` for free.

**Chirality** (`html[data-chirality]`):
- The **surface mirrors** — bus rows, transition/keyer/scene panels flip inboard/outboard via
  `direction: rtl` scoped to `html[data-chirality="left"] .vm-*` (the `.am-console`/`.ifb` pattern).
- The **PGM ▸ T-bar ▸ PVW triptych stays put** (PGM-left/PVW-right is an operator convention, not a
  handedness thing) — tag the monitor stage `.chir-exempt` so it never mirrors, like camera-control's
  spatial canvases. *(Confirm: some ops want PGM/PVW to swap sides with handedness — easy to make a
  sub-option.)*
- The simulated feed canvases are `.chir-exempt`.

**Tooltips** (`src/ui/tip.ts`):
- Every interactive control gets a **Kind-B `tip(el, spec)`** authored in `tips.ts` — e.g. the T-bar:
  `{ title:'T-BAR / FADER', lead:'Manually run the armed transition from PVW to PGM.', good:'Push fully to take; release mid-way to hold a partial dissolve.', bad:'Not a volume/level — it is transition position 0–100%.' }`.
- The window title keeps the host's **Kind-A** "Production Expectations" tip (already auto-attached),
  fed by the plugin `blurb` + the Routes `tip` fields — so we also author a room/tool `tip` in the
  provisioning JSON.

**Operator preferences (flexible layout — D9).** Presentation is the operator's choice, not a baked
design — mirroring how chirality and the colour scheme already work:

- A small **layout control** in the editor (and/or the console) lets the operator pick the **input
  layout** (`2×12+shift` default · `24-wide` · `2×12 stacked`), and other presentation options
  (PGM/PVW handedness, bus density). Choices **persist per device** (`localStorage`, like
  `twist.chirality` / `twist.colour`) and emit a change event so the surface re-renders live.
- A production's `SwitcherDef` may set the **default** (`layout?`, `handedness?`), but the operator's
  local preference wins — config proposes, the operator disposes.
- Implementation rides the same pattern as `colour-scheme.ts` / `chirality.ts`: a tiny prefs module
  with `getPref/setPref/applyStored` + a persisted key, so it's consistent and testable. The layout
  is data-driven off `SwitcherDef` + prefs, so no option is hardcoded into the render.

---

## 6. MQTT / SPOG schema

Topic scope is host-managed: `SPOG/rooms/<prod>/twists/<video-mixer>/params/<name>`. We keep the
**six legacy param names** (`pgm`,`pvw`,`transition`,`tbar`,`dsk1`,`dsk2`) as aliases to M/E-1 for
backward compatibility, and add a **dotted namespace** (chronos already does `run.<id>`):

| Param (per twist) | Type | W? | Meaning |
|---|---|---|---|
| `me.<n>.pgm` / `me.<n>.pvw` | enum(inputs) | ✅ | bank n program / preview source |
| `me.<n>.transition` | enum(cut/mix/wipe/dve) | ✅ | armed transition type |
| `me.<n>.rate` | number(frames) | ✅ | auto-transition rate |
| `me.<n>.tbar` | number 0–100 % | ✅ | fader position (throttled) |
| `me.<n>.take` | bool (command) | ✅ | execute the take |
| `me.<n>.key.<k>.on` | bool | ✅ | keyer k on-air |
| `me.<n>.key.<k>.type` | enum(KeyerType) | ✅ | keyer type |
| `me.<n>.key.<k>.source` / `.fill` | enum(inputs) | ✅ | key/alpha + fill |
| `me.<n>.key.<k>.dve` | string(presetId) | ✅ | assigned DVE preset |
| `dsk.<d>.on` / `.source` / `.type` | bool/enum | ✅ | downstream keyer |
| `dve.<c>.x/.y/.z/.scale/.rotX/.rotY/.rotZ` | number | ✅ | live DVE channel geometry |
| `dve.<c>.preset` | string | ✅ | recall a DVE preset onto channel c |
| `panel.delegate` | enum(1..mes) | ✅ | which M/E the surface controls |
| `scene.recall` | enum(scene names) | ✅ | recall a whole-switcher scene |
| `scene.store` | string (command) | ✅ | capture current state → named scene |
| `tally.program` | string[] (read-only) | — | inputs currently on-air (telemetry) |
| `tally.preview` | string[] (read-only) | — | inputs on preview |

All writable params carry `cap:'switch'` (the plugin's `requiredCaps`), so role-gating already
works. `advertiseParams` is built by `mqtt.ts` from the resolved `SwitcherDef` (so the schema is
*derived from the definition* — one source of truth). Echo-loop avoidance: `onParam` applies inbound
values to state+DOM without re-publishing, exactly as today.

---

## 7. Preset library (starter set, in `presets.ts`)

Ships in `DEFAULT_SWITCHER`; a production can override/extend.

- **DVE presets:** `FULL` (identity), `PIP-TR` / `PIP-TL` / `PIP-BR` / `PIP-BL` (corner boxes),
  `OTS-L` / `OTS-R` (over-the-shoulder), `SQUEEZE-BACK` (credits squeeze), `PAGE-TURN`,
  `FLIP-3D`, `TUMBLE-IN` (transition). Each a keyframed A→B.
- **M/E presets (looks):** `CLEAN` (bg only), `LOWER-THIRD`, `TWO-BOX` (dual PIP over bg),
  `BUG-ONLY`, `FULLSCREEN-GFX`, `INTERVIEW` (OTS + LT).
- **Scenes:** `OPEN`, `INTERVIEW`, `HIGHLIGHT`, `BREAK`, `CLOSE` — whole-switcher registers wiring
  the M/Es, DSKs, and DVE assignments for common show beats.

---

## 8. Tooltip content plan (excerpt, full table in `tips.ts`)

Every control gets a one-line "what it does" (+ optional ✓good / ✕bad). Examples:

| Control | lead | good / bad |
|---|---|---|
| PGM bus button | "Put this source on air on the delegated M/E." | ✕ Not preview — this cuts live. |
| PVW bus button | "Arm this source as the *next* shot." | ✓ Confirm on the green preview, then TAKE. |
| CUT | "Instant, single-frame source change." | — |
| MIX | "Timed cross-fade PVW→PGM at the set rate." | — |
| WIPE | "Reveal the next shot with a moving pattern." | ✓ Pick pattern/border in the M/E editor. |
| DVE (trans) | "Fly the picture on/off (push, squeeze, page-turn)." | — |
| rate | "Auto-transition duration in frames." | — |
| K1..K4 | "Toggle keyer k on this M/E; ⚙ to set type/source/DVE." | — |
| DSK1..n | "Downstream key — rides above every M/E (bug/caption)." | — |
| M/E selector | "Delegate the surface to bank 1/2/3." | — |
| scene 1..8 | "Recall a whole-switcher snapshot in one press." | — |

---

## 9. Deployment & migration (D7)

1. **Backward compatibility:** current productions carry `Video Mixer` twists with 8 `inputs[]` and
   the 6 legacy MQTT params. The new editor: if `switcher` is absent, it builds a `SwitcherDef` from
   `inputs[]` (padding to 24 generic inputs) + `DEFAULT_SWITCHER`. Legacy params keep working
   (aliased to M/E 1). **No production breaks** on day one.
2. **Provisioning into all 10 productions:** a small deploy helper (a `deploy.py`-style pass, or a
   one-time script) stamps each control-room production JSON's `Video Mixer` twist with the 24-input
   list and a `switcher` override (labels only; the rest inherits the default). Add room/tool `tip`
   fields at the same time. The 10 files live under
   `Routes/Destinations/001_Control Rooms/{001_Primary,002_Secondary}/*.json`.
3. **Draft-overlay safe:** authoring edits already persist via `discovery.getDraft`, so a production
   can be re-provisioned live without a backend.
4. **MQTT:** `advertiseAll` re-publishes each twist's config (now with the fuller `params[]`) on
   boot — the topic tree gains the new params automatically.

---

## 10. Build phases (each independently shippable + testable)

| Phase | Deliverable | Gate |
|---|---|---|
| **P0** | `schema.ts` + `DEFAULT_SWITCHER` + `TwistConfig.switcher` field; editor still renders today's UI from the resolved def. Typecheck + a schema-default test. | no visual change |
| **P1** | 24-input, 3-M/E surface with delegation, colour tokens, chirality, tooltips; legacy params + take/flip-flop. | replaces current editor cleanly |
| **P2** | Keyers (4/M/E) + DSKs with the inline **keyer editor**; key-on tally. | keying works end-to-end |
| **P3** | **DVE editor** + presets + keyframe A→B; DVE-on-keyer + DVE transitions. | fly a PIP/OTS live |
| **P4** | **M/E editor** (composite presets) + **Scene recall** (registers) + full MQTT schema. | one-press show beats |
| **P5** | Provision all 10 productions (§9) + room/tool tips; deploy; verify live + MQTT topic tree. | shipped everywhere |
| P6 (later) | Macros, split-M/E, internal still/clip store, aux panel. | stretch |

Each phase: `npm run typecheck` clean, a focused test where it has runtime surface, and a
Puppeteer smoke-render of the editor (mock `EditorContext`, as used elsewhere) before the next phase.

---

## 11. Decisions — resolved & remaining

**Resolved:**
- **D2 — 3 M/E banks** (delegation + re-entry). ✅
- **D8 / D9 — layout is a flexible operator preference** (default `2×12+shift`), persisted per
  device; the production sets a default the operator can override. PGM/PVW handedness folds into the
  same prefs. ✅

**Remaining (non-gating — I'll proceed on the proposed default unless you say otherwise):**
1. **Config carrier:** extend `TwistConfig.switcher` (proposed, backward-compatible) vs. a sidecar
   definition file per production. *Proceeding with the extend approach.*
2. **How deep is the sim?** chroma-key realism, DVE trails, wipe-pattern count — Phase-scoped;
   tell me where to spend vs. stub as we hit each phase.

Ready to start **P0** (schema foundation — no visual change): the `SwitcherDef` types (incl.
`layout?`/`handedness?` defaults), `DEFAULT_SWITCHER`, the `TwistConfig.switcher` field, and the
operator-prefs module skeleton.
