# Audit — The Routes Editor (A Single Pane of Glass for Destinations)

> **Thesis.** Everything the console shows on the destination side — every Control
> Room, Floor, Stage Box, Encoder, Edit Suite, and Person "kit" — is nothing but a
> tree of `*.json` files under `Routes/Destinations/**` (and `Routes/People/**`),
> each conforming to the `Production` + `TwistConfig` shapes in `src/model/index.ts`.
> Today that tree is **read-only**: `src/platform/discovery.ts` only ever `fetch`es
> and `listDirectory`s it. There is no `PUT`, no `POST`, no save, nowhere. The
> "single pane of glass" the user is asking for is therefore one thing precisely: a
> **write-back authoring mode** that lets an operator compose the same shapes with
> direct manipulation instead of a text editor — declare names and titles, assemble
> twists from a grab-bag of tools, group sources and destinations into their own
> containers, add rooms and productions, move containers around, and declare a
> backup path — and then **serialise the result back to the JSON** that the console
> already knows how to render.

---

## 0. The Critical Framing — Authoring is the mirror image of rendering

The console already contains, in production code, *half* of every capability this
audit needs. The read path is:

```
Routes/Destinations/**            (folders + *.json on any static host)
   │  listDirectory / fetchJSON   src/platform/discovery.ts
   ▼
buildDestinations()               src/ui/console/destinations.ts:105
   │  category folder → footer GROUP     (Footer.addGroup)
   │  *.json          → footer TAB       (Footer.addTab, lazy pane)
   ▼
renderPrograms(pgm, pane)         src/ui/console/destinations.ts:19
   │  pgm.twists[] → .twist-container drop-targets, bucketed into rows
   ▼
initializeTwists(pane)            src/ui/console/matrix.ts
   │  sources drop in, caps enforced, editor opens on click
   ▼
pluginFor(twistName)              src/editors/registry.ts:25  → 1 of 19 editors
```

An **authoring mode is the same pipeline run backwards**: the operator manipulates
the rendered containers, and each gesture mutates an in-memory model that
re-serialises to the exact `Production`/`TwistConfig` JSON `renderPrograms` expects.
Nothing about the *shape* changes. What changes is (a) a palette to drag *new*
things in, (b) inline editing of the declaration fields, (c) a persistence sink,
and (d) two new optional fields (`backup`, and per-container layout hints).

This is the cheapest possible way to ship an editor, and it is the correct one:
**the renderer is the spec.** If it renders, it is valid.

### 0.1 What "read-only" costs us today (the delta at a glance)

| Capability | Read path exists? | Write path exists? | Gap |
|---|---|---|---|
| List categories/rooms/productions | ✅ `listDirectory` | ❌ | create/rename/delete folders + `index.json` |
| Render a room's twists | ✅ `renderPrograms` | ❌ | serialise twists back |
| Drop sources into a twist | ✅ `matrix.ts` | n/a (runtime state) | optionally *persist* default routes |
| Multi-select + press-hold sources | ✅ `interact.ts:80` | partial | promote selection → a saved group |
| Move a tab between groups | ❌ (built at boot) | ❌ | drag-reorder + reparent + persist order |
| Edit names / titles / colors | ❌ | ❌ | inline field editors |
| Declare a backup path | ❌ (field doesn't exist) | ❌ | new `backup` field + failover render |
| Save anything | ❌ | ❌ | **the central missing organ** |

---

## 1. What a "Destination" actually is — the shapes you are editing

The user named four things to edit: **the room, the talent stage box, the video
box, and the declaration of names/titles**. All four are the *same two shapes*.

### 1A. A Room / a Production (`Production`, `src/model/index.ts:27`)

```jsonc
{
  "id": "prod7",
  "name": "PROD 7",
  "color": "#5566EE",            // ← the "declaration": display identity
  "twists": [ …TwistConfig… ]    // ← the containers routed into
}
```

A **Control Room** (`Routes/Destinations/001_Control Rooms/002_Secondary/002_Production 7.json`)
and a **Floor Room** (`Routes/Destinations/002_Floors/002_2nd Floor/002_Room 2.json`)
are *the same file shape* — they differ only in which twists they carry and which
`row` those twists declare. There is no "Room type" enum; a room's character is
**emergent from its twist list**. That is a gift for an editor: a room template is
just a starter `twists[]`.

### 1B. A Twist / a container (`TwistConfig`, `src/model/index.ts:118`)

```jsonc
{
  "name": "ISO 1",
  "accepts": "both",         // video | audio | both | camera  → tints the LCARS lip
  "maxVideo": 1, "maxAudio": 16,   // caps enforced by matrix.ts (newest evicts oldest)
  "inputs": ["TRK 1", …],    // sub-crosspoints inside the container
  "row": "iso",              // which horizontal band it buckets into (renderPrograms:53)
  "monitor": true,           // → the "monitors" row if no explicit row
  "cameraInput": true        // "CAM N" style hard input
}
```

The `row` string is the single most important layout lever. `renderPrograms`
(`destinations.ts:28-64`) buckets twists: `cameras` and `remotes` render as
dedicated top rows, `graphics`/`iso`/`speaker`/`audiomon`/`ifb`/`lighting`/
`signaling` each get their own band, and everything else flows as a ⅓-width "big"
twist. **An editor that lets the user set `row` by dragging a container between
bands is the whole layout story.**

### 1C. A Stage Box (`StageBox`, `src/model/index.ts:14`)

Stage boxes live on the *source* side (`Routes/Sources/**`) but the user explicitly
wants to edit them here, and the **Person** model unifies both: a person is *one
file* that is simultaneously a source (`source.audio[]`, `source.video[]`) and a
destination (`kit.twists[]`), sharing one identity (`lowerThird`, `title`, `role`).
See `SourceLeaf` (`src/model/index.ts:84`) and the loader that projects
`kit.twists → twists` at `destinations.ts:88`. The editor must therefore treat
**"talent"** as a first-class compound container: edit the person once, and both
their feeds *and* their destination kit update.

### 1D. The "declaration" = the identity fields

The user's phrase "declaration of names titles" maps to concrete fields:
`name`, `color` (Hex), `status` (`OK` | fault string), `title`/`lowerThird`
(the name-super, `LowerThird` at `src/model/index.ts:42`), `role`, and the folder
`NNN_` order-prefix (`stripOrder` at `sources/format.ts`). Editing the declaration
is a typed form over exactly these keys.

---

## 2. The Single Pane — anatomy of the authoring surface

One screen, four zones. Three already exist; the palette is new.

```
┌──────────┬─────────────────────────────────────────┬───────────┐
│ SOURCES  │            CANVAS (the room)             │ GRAB BAG  │
│  rail    │   the live renderPrograms() output,      │  palette  │
│ (exists) │   now editable: drag twists, edit fields │  (NEW)    │
│          │                                          │           │
│ hold-to- │  ┌ camera row ─────────────────────┐     │ ▸ Twists  │
│ expand   │  │ CAM1 CAM2 CAM3 …                 │     │ ▸ Rooms   │
│ multi-   │  ├ big twists ────────────────────┐│     │ ▸ Fields  │
│ select   │  │ [Video Mixer] [Multi Viewer] … ││     │ ▸ Talent  │
│          │  └────────────────────────────────┘│     │ ▸ Tools   │
├──────────┴─────────────────────────────────────────┴───────────┤
│ FOOTER TREE — categories▸groups▸rooms as D-tabs (footer.ts)     │
│  now: drag to reorder, drop to reparent, "+" to add             │
└─────────────────────────────────────────────────────────────────┘
```

- **Sources rail** — `src/ui/sources/panel.ts` + `interact.ts`. Already supports
  press-and-hold expand (400 ms) and Ctrl/Shift multi-select (`interact.ts:80`).
  In authoring mode these gestures do double duty (§4).
- **Canvas** — the active tab's pane, i.e. the exact `renderPrograms` output. In
  authoring mode every `.twist-container` gains edit affordances (drag handle,
  field-edit, delete) and the pane accepts drops *from the grab bag*.
- **Grab bag** (NEW) — a collapsible LCARS rail of draggable *templates* (§3).
- **Footer tree** — `src/ui/console/footer.ts`. Already an accordion of nested
  groups + D-tabs; gains drag-reorder, reparent, and "+" affordances (§4D, §8).

The whole point of "single pane" is that **you never leave this screen** to go edit
a file. The tree, the room, the containers, the fields, and the tools are all here,
and every gesture is direct manipulation of what you see.

---

## 3. The Grab Bag — the palette of items and tools

The user asked for "a grab bag of items and tools that they can use." The codebase
*already enumerates the grab bag* — it is the **19 editors** in `src/editors/*`.
Each editor's `match(twistName)` (`registry.ts`) declares which container names it
owns. Invert that: each editor becomes a **draggable tool template** that, when
dropped on the canvas, creates a `TwistConfig` whose `name` that editor will match.

### 3A. Tools = the editor roster (drop one → get a live container)

| Grab-bag tool | Editor folder | Emits a twist like |
|---|---|---|
| Vision Mixer | `vision-mixer` | `{name:"Video Mixer", accepts:"video", inputs:[…]}` |
| Multi-Viewer | `multi-viewer` | `{name:"Multi Viewer N", accepts:"both", inputs:["MV 1"…]}` |
| ISO Recorder | `iso-recorder` | `{name:"ISO N", accepts:"both", maxVideo:1, maxAudio:16, row:"iso"}` |
| Camera Control | `camera-control` | `{name:"CAM N", accepts:"camera", row:"cameras", cameraInput:true}` |
| Audio Mixer / Monitor / Positioner | `audio-*` | `{accepts:"audio", inputs:["CH 1"…]}` |
| Intercom / IFB | `intercom`,`ifb` | `{accepts:"audio", inputs:["ICOM N"], row:"ifb"}` |
| Graphics Engine | `graphics-engine` | `{name:"GRAPHICS", inputs:["LOWER THIRD"…], row:"graphics"}` |
| Lighting / WYSIWYG | `lighting`,`wysiwyg` | `{accepts:"both", row:"lighting"}` |
| Signaling (Tally/On-Air) | `signaling` | `{accepts:"both", row:"signaling"}` |
| Prompter | `prompter` | prompt-head twist |
| Encoder | `encoder` | `{name:"Encoder", accepts:"both"}` |
| Meter Input | `meter-input` | test-tool twist |
| Signal Conditioner | `signal-conditioner` | `{row:"remotes"}` conditioned feed |
| Monitor | (generic matrix) | `{accepts:"video", maxVideo:1, monitor:true}` |
| Talent / Person | `person` | a whole `kit.twists[]` compound (§5) |

> **Why this is the right abstraction:** dropping a "Multi-Viewer" tool and dropping
> a raw twist named "Multi Viewer 1" are *identical operations* — both produce a
> config the `multi-viewer` editor will `match`. The palette is therefore not a
> second source of truth; it is a **named-constructor shortcut** over `TwistConfig`.
> Adding a 20th editor (drop a folder, per `registry.ts`) auto-adds a 20th tool.

### 3B. Items = higher-order templates

Above the atomic tools sit composite templates:

- **Room templates** — a starter `Production.twists[]` (e.g. "Full PCR" = 8 cameras
  + mixer + 3 MVs + audio console + 4 ISOs + graphics; "Edit Suite" = the
  `004_Edit Suites` shape; "Flat Floor Room" = the `002_Room 2.json` shape). Drop
  onto the footer tree → a new room file.
- **Row bands** — drop an empty `cameras`/`iso`/`graphics` band to seed a row.
- **Field cards** — draggable `name` / `title` / `color` / `status` / `lowerThird`
  chips you drop *onto* a container to attach that declaration.
- **Talent** — drop a person → their `source` feeds appear on the source rail and
  their `kit.twists` appear as containers, in one gesture (§5).

### 3C. Palette provenance — build it from disk, not a hardcoded list

The palette should be discovered the same way the tree is: scan `src/editors/*` at
build time (already done — `registry.ts` globs them) to list tools, and read a new
`Routes/_templates/**` folder (same `listDirectory` mechanism) for room/item
templates, so **operators author their own templates by saving a room as a
template** — closing the loop with §7 persistence.

---

## 4. Direct manipulation — click, hold, group, move

This is the heart of the user's request: *"click and hold a source, a group of
sources and a group of destinations to create their own UI experience."* The good
news is the **hold + multi-select machinery already exists** and is production-grade.

### 4A. What already works (reuse it verbatim)

`src/ui/sources/interact.ts` gives us, today:

- **Press-and-hold, 400 ms** (`HOLD_MS`, line 12) to expand a multiplex/gang box —
  the exact "click and hold" gesture the user describes.
- **Ctrl/Shift multi-select** into a `Set<HTMLElement>` (`selected`, line 15;
  toggle at line 80) with a `.selected` class — "a group of sources."
- **Drag carrying the whole selection** as a comma-id list (`dragstart`, line 90):
  `dataTransfer.setData('text/plain', ids)`. Drop the *group* in one motion.
- **Chirality-aware drag ghost** (`interact.ts:99`, `chirality.ts`): the ghost sits
  on the non-occluded side of the finger for left/right-handers. The authoring
  drags inherit this for free.
- **Gang accordion** (only one cell open per grid, line 45) — the grouping metaphor
  is already visual.

Matrix side (`src/ui/console/matrix.ts`) already gives **word-processor insertion
caret** reordering of crosspoints (the blinking `xp-caret`), cap enforcement, and
same-origin grouping into collapsible chips. Authoring reorder = the same caret.

### 4B. Grouping SOURCES → a saved container ("gang box")

Gesture: multi-select N source nodes (Ctrl-click), **press-and-hold on the
selection** → a radial/LCARS "group" action → name it → it collapses into one
multiplex node. Under the hood this writes a source-side group: a `StageBox`-like
node whose `items[]`/`video[]` are the selected feeds, or a new gang entry. This is
"create their own UI experience" — the operator's *personal* grouping of feeds they
care about, saved to their layout (§7).

### 4C. Grouping DESTINATIONS → composing a room

Gesture: marquee/lasso (or Ctrl-click) several `.twist-container`s on the canvas →
**hold** → "Group into room / band." Two outcomes:
1. **Into a band** — sets the same `row` on all selected twists → they snap into one
   horizontal LCARS band (renderPrograms buckets them, `destinations.ts:53`).
2. **Into a room** — extracts the selected twists into a *new* `Production` file
   (new tab), leaving or moving the originals. This is literally "select some
   destinations, make them a container."

### 4D. Moving containers around

Three drag scopes, all direct-manipulation:

- **Reorder twists within a room** — drag a `.twist-container` to a new slot; the
  big-twist flex-wrap already positions ≈⅓-width, so a drag+caret reorders the
  `twists[]` array. Persist array order.
- **Move a twist between rows/rooms** — drag a container onto another band (changes
  `row`) or onto another tab (moves it to that `Production`).
- **Reorder / reparent tabs in the footer tree** — `footer.ts` builds groups+tabs
  but has **no reorder today**. Add: drag a `.lcars-tab` within a
  `.lcars-group-tabs` to reorder (rewrites the folder's `index.json` order), or drop
  it on another `.lcars-group-label` to reparent (moves the file between folders).
  The `NNN_` prefix + `index.json` array *are* the order model already
  (`listDirectory` sorts `numeric:true`), so persistence is "renumber + rewrite
  index.json."

### 4E. The interaction contract to standardise

To keep it coherent, define one gesture vocabulary across sources *and*
destinations (promote it to a shared `src/ui/select.ts`, mirroring how the tooltips
audit proposes promoting the Meter-Input tip pattern to a shared `tip.ts`):

| Gesture | Meaning |
|---|---|
| Click | Select one (clear others) — `interact.ts:83` |
| Ctrl/⌘-click | Toggle into multi-selection — `interact.ts:80` |
| Press-hold 400 ms | Expand a container **or** (on a selection) open the group action |
| Drag | Move the whole selection; chirality ghost |
| Drag + caret | Reorder within a band/drop-zone |
| Drop on band | Set `row`; drop on tab → move to that room |
| Double-click / field chip | Edit the declaration (§5) |

---

## 5. The Declaration — editing names, titles, and all the JSON in place

"Declaration of names titles and all things within the json" = inline typed editors.
Rather than a raw JSON textarea (error-prone, off-theme), each shape gets a small
LCARS form bound to its keys. Because `renderPrograms` is the spec, the form only
needs to cover fields the renderer reads.

### 5A. Room / Production form
`name` (text), `color` (Hex swatch), `status` (OK/fault), folder order-prefix,
parent folder (moves the file). Live-previews by re-running `renderPrograms` on
keystroke.

### 5B. Twist / container form
`name` (drives which editor matches — show the resolved editor as feedback),
`accepts` (video/audio/both/camera segmented control → recolors the lip),
`row` (dropdown of known bands → live re-bucket), `maxVideo`/`maxAudio` (steppers,
enforced by matrix), `inputs[]` (chip list — add/remove/reorder sub-crosspoints),
`monitor`/`cameraInput` (toggles).

### 5C. Talent (Person) form — the compound
The person editor already exists (`src/editors/person`). The authoring form edits
the *one* unified file: identity (`name`, `role`, `title`/`lowerThird.line1/line2/
style`), the **source projection** (`source.audio[]`, `source.video[]` feed
labels), and the **destination kit** (`kit.twists[]`). One save updates the source
rail *and* the destination console (loader projects `kit.twists→twists`,
`destinations.ts:88`). This is the cleanest demonstration of "single pane": edit
talent once, both worlds update.

### 5D. Escape hatch — raw JSON drawer
For power users, a collapsible monospace JSON view of the current node, validated
against the model on blur, with a "revert to form" button. Never the primary path;
always available.

---

## 6. The Backup / Secondary Path — declaring redundancy

The user wants each declaration to "offer a backup path or secondary path as a part
of the declaration." Today **no such field exists** — this is a genuine model
extension. It belongs on the two things that carry signal: a **twist** (a container's
fallback feed) and optionally a **room/production** (a fallback destination).

### 6A. Model extension (additive, back-compatible)

```ts
// src/model/index.ts — TwistConfig gains:
interface TwistConfig {
  …
  /** Failover feeds used when the primary crosspoint(s) go to a fault status. */
  backup?: {
    inputs?: string[];        // fallback sources, same accept-kind
    mode?: 'hot' | 'warm' | 'manual';   // auto-cut vs armed vs operator-only
    twist?: string;           // OR: fail over to another named twist entirely
  };
}
// Production MAY gain a room-level `backup: { id: string }` — a mirror room.
```

Because `backup` is optional, every existing file stays valid — the renderer
ignores unknown-to-old-code keys, and old files simply have no backup (parity
preserved, matching the "share data, don't fork" rule in `discovery.ts`).

### 6B. UX — the shadow drop-zone

On the canvas, each container shows its normal drop-zone plus a **dimmed "backup"
drop-zone** (a second lane, or the container back-face on flip). Drag a source into
the primary lane = `inputs`; drag into the shadow lane = `backup.inputs`. A small
toggle sets `mode`. Visually: the backup feed renders at reduced opacity with a
distinct hatch, so an operator sees at a glance "this container is protected."

### 6C. Failover semantics (ties into fault status + MQTT)

The routing core already knows faults (`isFaultStatus`, used at `destinations.ts:22`;
`Status` type at `model:9`). Define: when a primary feed's source `status !== 'OK'`,
a `hot` backup auto-promotes (swap the rendered crosspoint set to `backup.inputs`);
`warm` highlights the armed backup for one-click cut; `manual` just records intent.
On the bus, publish `…/backup` and `…/failover-state` alongside the existing
`…/crosspoints` retained topic (`matrix.ts:publishCrosspoints`) so other consoles
and the TwistBus (see the MQTT advertising audit) observe the redundancy.

---

## 7. Persistence — how the changes update the JSON (the central delta)

Everything above is UI over an in-memory model. The user's closing requirement —
*"these changes … update the [json]"* — is the one organ the codebase does **not**
have. `discovery.ts` is read-only by design ("zero-backend folder discovery").
Here is the ladder of ways to add a write path, cheapest first; ship L1 now, design
for L3.

### 7A. In-memory model + dirty tracking (prerequisite, do first)

Introduce a `RoutesDraft` store: the parsed tree kept in memory, every gesture
mutates it, each node carries a `dirty` flag, and a single `serialize(node)` emits
canonical JSON identical to what `renderPrograms`/`buildDestinations` consume.
**Re-render from the draft, not from disk.** This decouples "editing" from "saving"
and makes every persistence backend below a thin sink.

### 7B. The write-sink ladder

| Level | Sink | How | Fit |
|---|---|---|---|
| **L1** | **localStorage overlay** | draft JSON per path in `localStorage`; on boot, `fetchJSON` result is *overlaid* by any local draft. | Zero backend — matches today's static-host reality (like `chirality.ts`/`mqtt-tree.ts` already persist to localStorage). Personal layouts, instant. |
| **L2** | **Export / Import** | "Download layout" → a `.json` (or a zip of the tree) the user commits to `Routes/**` by hand; "Import" reloads it. | Bridges static hosting to real files with no server. Good for authoring-then-deploy (mirrors `deploy.py`). |
| **L3** | **File System Access API** | `showDirectoryPicker()` on `Routes/` → real `writeFile` back to the same folders the app reads. | Chromium desktop; true single-pane save with no server. **Recommended target.** |
| **L4** | **Tiny write server** | a `PUT /Routes/**` endpoint (write file + rewrite `index.json`); optionally git-backed for history. | Multi-user, audit trail, the "production" answer. Pairs with the MQTT bus for live multi-console sync. |

> **Recommendation:** build **L1 immediately** (it's the same pattern the app
> already uses twice and needs no infra), expose **L2 export** so nothing is ever
> trapped in a browser, and architect the draft store so **L3/L4** are a
> swap-the-sink change, not a rewrite. Folder create/rename/delete + `index.json`
> rewrite (needed for §4D/§8) require L3 or L4 — localStorage can *overlay* new
> nodes but a real new folder needs a real filesystem.

### 7C. What "save" must write

For a moved/edited container: rewrite the owning `Production` file's `twists[]`.
For a reordered/renamed tab: rewrite the folder's `index.json` (order) and possibly
rename the `NNN_Name.json` file. For a new room: create `NNN_Name.json` + add to
`index.json`. Every write is "emit canonical JSON + fix the manifest," because
`listDirectory` trusts `index.json` first (`discovery.ts`).

---

## 8. Adding rooms & productions, adding containers (the create flows)

- **Add a room** — "+" on a footer group, or drop a Room template (§3B) onto a
  group. Creates `Routes/Destinations/<Category>/<Group>/NNN_New Room.json` with the
  template `twists[]`, appends to `index.json`, opens the new tab in edit mode.
- **Add a production** — same gesture at the category level; a production is just a
  room whose tab renders a program row (`renderPrograms` handles both).
- **Add a category/group** — "+" on the footer root / a group creates a folder +
  `index.json`, `Footer.addGroup` renders it live (already supports nesting +
  color).
- **Add a container** — drag a tool from the grab-bag (§3A) onto the canvas (or onto
  a specific row band). Appends a `TwistConfig` to `twists[]` and re-renders.
- **Duplicate** — right-click a room/twist → "duplicate" clones the JSON with a new
  `id`/`NNN_` prefix. (Rooms are so template-like that duplicate-then-tweak will be
  the most common authoring path.)

All of these are **folder/`index.json`/`twists[]` mutations** — no new concepts,
just the write side of what discovery already reads.

---

## 9. Maturity Assessment (L0–L4) and the Delta

| Dimension | Now | Target | Delta |
|---|---|---|---|
| Render destinations from JSON | **L4** ✅ | L4 | none — this is the spec |
| Hold/multi-select/drag sources | **L3** ✅ | L4 | promote group→saved container |
| Crosspoint reorder (caret) | **L3** ✅ | L4 | reuse for authoring reorder |
| Edit declaration (name/title/color) | **L0** | L3 | inline typed forms (§5) |
| Grab-bag palette of tools | **L1** (editors exist, not surfaced) | L4 | invert registry → droppable templates (§3) |
| Group destinations into rooms/bands | **L0** | L3 | marquee + `row`/extract (§4C) |
| Move containers / reorder tree | **L0** (built once at boot) | L3 | drag-reorder + reparent (§4D) |
| Backup / secondary path | **L0** (field absent) | L3 | model field + shadow drop-zone (§6) |
| **Persist changes to JSON** | **L0** (read-only) | L3→L4 | draft store + write sink (§7) |
| Add room/production/container | **L0** | L3 | create flows over index.json (§8) |

**Headline:** the *rendering, drag, selection, and cap-enforcement* engine is already
L3–L4. The entire delta is **authoring affordances + a write path**. There is no
hard research problem here — it is a build-out of the mirror image of code that
already ships.

---

## 10. Build Order (recommended)

1. **Draft store (§7A)** — parse-to-model, dirty flags, `serialize()`, re-render from
   draft. Nothing is user-visible yet, but it unblocks everything.
2. **L1 localStorage overlay + L2 export (§7B)** — so edits survive reload and can
   leave the browser. Prove the round-trip on one hand-edited room.
3. **Inline declaration forms (§5A–5B)** — name/title/color/status + twist fields.
   Highest value-per-effort; immediately useful even before drag-authoring.
4. **Grab-bag palette (§3)** — invert `registry.ts` into droppable tool templates;
   drop-to-add container on the canvas (§8 "add container").
5. **Authoring drag on the canvas (§4C–4D)** — reorder twists, set `row` by band,
   move between rooms. Reuse `interact.ts` selection + `matrix.ts` caret.
6. **Footer tree editing (§4D, §8)** — tab reorder/reparent, "+" add room/group.
   (Needs `index.json` rewrite → gate the *persist* behind L3/L4.)
7. **Backup path (§6)** — model field + shadow drop-zone + fault-driven failover;
   publish to the bus.
8. **Talent compound editor (§5C)** — the single-file source+kit editor.
9. **File System Access (L3) / write server (L4) (§7B)** — swap the sink; unlock
   real folder create/rename/delete and multi-user.
10. **Save-as-template (§3C)** — close the loop: operator rooms become grab-bag items.

---

## Sources (in-repo)

- `src/model/index.ts` — `Production` (:27), `TwistConfig` (:118), `StageBox` (:14),
  `SourceLeaf`/person model (:84), `LowerThird` (:42), `Status`/`Accepts`.
- `src/ui/console/destinations.ts` — `renderPrograms` (:19), row bucketing (:53–64),
  `addDestinationTree`/`buildDestinations` (:71,:105), `kit.twists→twists` (:88).
- `src/ui/console/footer.ts` — nested groups + D-tabs, `addGroup`/`addTab`, lazy
  panes, idle-collapse (the tree to make editable).
- `src/ui/sources/interact.ts` — press-hold (:12), multi-select (:15,:80), group
  drag (:90), chirality ghost (:99).
- `src/ui/console/matrix.ts` — drop/cap enforcement, `xp-caret` reorder,
  `publishCrosspoints` (bus projection).
- `src/editors/registry.ts` — the 19-editor glob = the grab-bag roster; `types.ts`
  the `EditorPlugin`/`EditorContext` contract.
- `src/platform/discovery.ts` — the **read-only** data layer (the write-path gap).
- Sample shapes: `Routes/Destinations/001_Control Rooms/002_Secondary/002_Production 7.json`
  (full PCR), `Routes/Destinations/002_Floors/002_2nd Floor/002_Room 2.json` (flat
  room), `Routes/Destinations/003_Encoders/002_Encoder 2.json` (minimal).
- Related audits: `Teleprompter-Source-Audit.md` (source-as-routable pattern),
  `TWIST-MQTT-Advertising-Audit.md` (bus projection for backup/failover state),
  `LCARS-Hover-Tooltips-Production-Tips-Audit.md` (promote-to-shared-module pattern),
  `Production-Entities-People-Places-Things-Audit.md` (the entity model).
