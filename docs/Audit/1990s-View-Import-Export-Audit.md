# 1990s VIEW — Spreadsheet Import / Export Audit

**Feature:** Export and import the "1990s VIEW" router crosspoint grid as a two‑tab
spreadsheet — one tab **Sources**, one tab **Destinations** — so an engineer can lay
out sources, destinations and routes in Excel/LibreOffice and load them back in.

**Status:** audit + deployment plan. Ships in phases (see §8). Front‑end only, zero
backend, self‑contained (no new npm dependency).

---

## 0. Thesis

The 1990s view is a live, DOM‑derived crosspoint grid. **There is no persisted routes
record anywhere** — a route exists iff a cloned `.signal-node` physically sits inside a
destination twist's `.drop-zone`. The grid, the editors and the MQTT projection all
*reconstruct* routing by scraping the DOM on every read.

Therefore:

- **Export** = snapshot the current DOM crosspoints (via the same readers the grid uses)
  plus the source/destination inventories, and serialize to a workbook.
- **Import** = replay routes into the DOM through the same write path the grid uses
  (`placeSourceInTwist`), after reconciling every named device against the live catalog
  using the app's own naming rules (`stripOrder`, `origin` lineage, feed labels).

The workbook is effectively the **L3/L4 persistence sink** the codebase already
anticipates (`routes-store.ts` documents L1 localStorage → L2 draft blob → L3/L4 file/
server as "a swap‑the‑sink change, not a rewrite").

---

## 1. How the crosspoint works (the model we must round‑trip)

Files: `src/ui/console/router-view.ts` (orchestrator), `router-view-gather.ts` (DOM
readers + `RVState`), `router-view-grid.ts` (grid + make/break), `matrix-place.ts`
(the real write path).

### 1.1 The crosspoint key

`SEP = '␟'` (U+241F). `gatherLinks()` walks every `.twist-container .drop-zone >
.signal-node` and emits:

```
cross.add([origin, label, prod, tname].join(SEP));  // a live route (4‑tuple)
cS.add(origin + SEP + label);                        // a "connected source" identity
cR.add(prod + SEP + tname);                           // a "connected receiver" identity
```

**A route is the 4‑tuple `origin ␟ label ␟ prod ␟ tname`:**

| field    | meaning                     | read from |
|----------|-----------------------------|-----------|
| `origin` | source device lineage       | `node.dataset.origin` (e.g. `"FLOOR 2 — STUDIO A — CAM RACK"`), fallback = label |
| `label`  | the feed's first text line  | `innerText.trim().split('\n')[0]` |
| `prod`   | destination room/production | `tw.dataset.prodName` / `.program-title` |
| `tname`  | the twist (receiver)        | `.twist-title` innerText |

- **Rows (senders):** `gatherSenderNodes()` scrapes `.ingress-panel .signal-node`
  (expanding `.multiplex` boxes to their children), keyed `origin → label → node`.
- **Columns (receivers):** `gatherReceivers()` scrapes every `.twist-container`,
  keyed `prod → tname → twistEl`.
- A cell is **lit** iff `crossSet.has([origin,label,prod,tname].join(SEP))`.

### 1.2 Make / break

- **Make:** `placeSourceInTwist(twistEl, sourceNode)` (matrix-place.ts). Gates on
  `config.accepts` (`video`/`audio`/`camera`/`both`), clones the source node into
  `.drop-zone`, enforces `maxVideo`/`maxAudio`/`inputs.length` caps (evicting oldest),
  numbers `data-xp`, then `publishCrosspoints` (retained MQTT, outbound only).
- **Break:** find the placed clone by `firstLine === label` + matching `data-origin`,
  `node.remove()`; drop an emptied `.dropped-group`.

### 1.3 Round‑trip caveats (baked into the design)

1. **No persistence** — routes live only as DOM. Import must replay through
   `placeSourceInTwist`; export must read `gatherLinks()`.
2. **Twist name has an emoji prefix.** `gatherLinks` keeps the `.twist-title` innerText
   verbatim (emoji + name); `publishCrosspoints` strips leading non‑letters. We pick
   **one convention: the display name with the order prefix stripped** and strip any
   leading emoji/glyph on both export and match (see §7.2).
3. **Cascade is drop‑only.** The interactive drop handler fans one source out to many
   downstream twists; `placeSourceInTwist` does **not** cascade. Replaying the *effective*
   crosspoint set directly therefore reproduces the exact final state without
   double‑cascading — which is what we want.
4. **Caps + accepts** can reject/evict a placement; import replays in a cap‑respecting
   order and reports rejects.
5. **Unrendered sources/dests** must be lazy‑loaded first (`loadAllSources()` /
   `loadAllDest()`), exactly as the grid's "ALL SOURCES / ALL DESTINATIONS" toggles do.

---

## 2. The Routes schema (what "all the devices … how things are named" means)

`Routes/index.json → ["Destinations/","People/","Sources/"]`. Every folder carries an
`index.json` **array manifest** (`"foo/"` = dir, `"bar.json"` = leaf), sorted naturally
(`numeric:true`). Leaves are dispatched by **shape, not folder** (`inferPoolKind`).

### 2.1 Naming rules the importer must honour

- **`NNN_Name` order prefix** on files/folders is *ordering metadata only*, never shown.
  Display uses the leaf's `name`. `stripOrder` = `replace(/^\d{3,}_/, '')` (Sources +
  Destinations display path). Prompter uses **4‑digit** prefixes (`0010_`).
- **Feed label generation:** a *video* stagebox generates labels as `prefix + 1..count`
  (`V101-1`…`V101-8`); *audio* uses explicit `items[]`; graphics/TSG/prompter use explicit
  `video[]`. `video[]` and `items[]` are **semantically distinct and never merged**.
- **`origin` lineage** ("Floor — Room — Device") is the source's row identity and the
  `data-origin` used to disambiguate feeds sharing a label.

### 2.2 Source leaf shapes (each a spreadsheet‑row family)

| shape | key fields | feed labels |
|-------|-----------|-------------|
| Video stagebox | `prefix`,`count`,`extraClass`,`floor`,`level` | `prefix`+1..`count` |
| Audio stagebox | `prefix`,`count`,`items[]` | explicit `items[]` |
| Wireless controller | `type:"wireless-controller"` | — |
| Wireless mic pack | `person`,`pack`,`role`,`type:"wireless-mic"` | — |
| Streams | `streams[]{url,left,right}` | stream names |
| Playout | `players[]→videos[]→stack{video,audio[]}` | V1..V4 / A1..A4 |
| Production (source) | `boxes[]{name,video?,audio[],control[]}` | box feeds |
| Graphics / TSG / Clocks | `kind:"video"`,`title`,`video[]` | explicit `video[]` |
| Prompter | `+wpm`,`blocks[]` | explicit `video[]` |
| Person (dual‑role) | `source{audio[],video[]}` + `kit.twists[]` | source feeds |

**Undeclared but real fields** (`wpm`, `blocks`, `person`, `pack`, `floor`, `level`) must
be **preserved** on round‑trip — a schema‑strict serializer would silently drop them.

### 2.3 Destination shape

A destination = a `Production` leaf `{ id, name, color?, status?, twists[] }`. A twist is
a `string | TwistConfig`:

```ts
interface TwistConfig {
  name: string; accepts?: 'video'|'audio'|'both'|'camera';
  inputs?: string[]; monitor?: boolean; row?: string;
  maxVideo?: number; maxAudio?: number; cameraInput?: boolean;
  backup?: {...}; tip?: TipSpec; switcher?: Partial<SwitcherDef>;
}
```

`row` bands twists visually (`cameras, remotes, iso, graphics, speaker, audiomon, ifb,
lighting, signaling, kit`). People expose twists under `kit.twists[]`, promoted to
`twists` on load. On‑disk `id` is overwritten with a URL‑derived tab id at load and is
**not globally unique** — round‑trip keeps the file's `id` as‑is.

### 2.4 The only existing write sink

`src/platform/routes-store.ts` — per‑URL drafts in `localStorage` (`twist:routes:draft:`
+ fetch URL). `fetchJSON` consults `getDraft(url)` **first**, so a draft wins over disk
and survives reload. `exportDrafts()`/`importDrafts()` already round‑trip the draft blob
`{ [url]: leafJSON }`. `authoring.ts` `downloadText()` is the existing download helper.
There is **no CSV, no `showSaveFilePicker`, no spreadsheet I/O** anywhere today.

---

## 3. The gap

- No way to see/edit the whole routing plan **outside** the app.
- No way to author a routing plan in a spreadsheet and load it (commissioning, dry‑runs,
  handing a wiring list to a facility engineer).
- The 1990s view is the natural home: it already *is* the sources × destinations grid.

---

## 4. The spreadsheet contract (two tabs)

One workbook, two worksheets. Both are **flat, header‑first tables** so Excel filtering /
sorting "just works". A hidden/trailing metadata column carries round‑trip identity that a
human never edits.

### 4.1 Tab "Sources" — the ingress inventory (one row per feed)

| column | meaning | editable | round‑trip key |
|--------|---------|----------|----------------|
| Category | top Sources folder (e.g. `VIDEO`, `SOUND`) | ref | — |
| Origin | device lineage (`data-origin`) | ✔ | ✅ id |
| Feed | feed label (first line) | ✔ | ✅ id |
| Type | `video`/`audio`/`control` | ✔ | — |
| Color | hex | ✔ | — |
| Status | leaf status | ref | — |
| SourceFile | `Routes/Sources/…json` the feed came from | ref | reconcile |

Row identity = **`Origin ␟ Feed`** (= the grid's `cS` key).

### 4.2 Tab "Destinations" — the receiver inventory + routes (one row per crosspoint, plus one row per empty twist)

| column | meaning | editable | round‑trip key |
|--------|---------|----------|----------------|
| Category | Destinations folder (Control Rooms / Floors / …) | ref | — |
| Room | production/room name | ✔ | ✅ id |
| Twist | receiver twist name (order‑prefix + emoji stripped) | ✔ | ✅ id |
| Accepts | `video`/`audio`/`both`/`camera` | ref | cap check |
| Row | visual band | ref | — |
| Routed Origin | the routed source's `Origin` (blank = unrouted slot) | ✔ | ✅ join |
| Routed Feed | the routed source's `Feed` | ✔ | ✅ join |
| Type | routed feed type | ref | — |
| DestFile | `Routes/Destinations/…json` | ref | reconcile |

Row identity of a **route** = **`Room ␟ Twist ␟ Routed Origin ␟ Routed Feed`** (= the
grid's `cross` 4‑tuple). A twist with N routed feeds → N rows; an empty twist → one row
with blank Routed columns (so every receiver is visible + editable).

> A single "Destinations" tab carries the routes rather than a separate crosspoint
> matrix: it keeps the file human‑authorable ("for CAM 3, type the source origin/feed")
> and avoids an O(S×D) sparse grid that Excel handles poorly at facility scale.

---

## 5. Format decision

**Primary: SpreadsheetML 2003 (`.xml`).** A single XML file with multiple `<Worksheet>`
elements that Excel and LibreOffice open as a real multi‑tab workbook (workbook icon,
named tabs). Advantages that decide it:

- **True two tabs** — exactly the ask.
- **Dependency‑free export** — a template string; no zip, no lib.
- **Dependency‑free import** — parse with the built‑in `DOMParser` (`<Worksheet>` →
  `<Row>` → `<Cell>` → `<Data>`), so the round‑trip needs no unzip/OOXML parser.
- Self‑contained; respects the "no new dependency, vendored‑only" project posture.

**Also ship: CSV per tab** (`…-sources.csv`, `…-destinations.csv`) for universal
editing (Google Sheets, `awk`, quick diffs). CSV loses the two‑tabs‑in‑one‑file property,
so it is the convenience path, not the primary.

**Rejected: true `.xlsx`.** OOXML is a ZIP of XML; a dependency‑free writer needs a
store‑only ZIP implementation and the reader needs an unzip + sharedStrings parser — ~10×
the code for no round‑trip benefit over SpreadsheetML in this facility (Excel/LibreOffice)
context. Documented as optional future work if Google‑Sheets‑native `.xlsx` is required.

---

## 6. Export design

`src/ui/console/router-io.ts` (+ `router-io-sheet.ts` for the SpreadsheetML/CSV writer,
kept under the 200‑line rule).

1. `await loadAllSources(); await loadAllDest();` — render everything (same as the grid's
   ALL toggles) so the inventory is complete.
2. Build the **Sources** rows from `gatherSenderNodes()` (+ `typeDot` typing + node color
   + `data-origin`), and augment with the routed‑but‑unrendered sources in `cS`.
3. Build the **Destinations** rows from `gatherReceivers()` × `gatherLinks().cross`,
   emitting one row per route and one blank row per empty twist. Twist names normalized
   via a shared `cleanTwist()` (strip order prefix + leading emoji).
4. Serialize both tabs → SpreadsheetML string → `downloadText()` (reuse authoring's
   Blob+`<a download>` helper, generalized to accept a MIME type).
5. Buttons live in the 1990s toolbar (`.rv-bar`): **⭳ Export** (workbook) with a small
   CSV affordance.

---

## 7. Import design

`router-io.ts` `importWorkbook(file)`:

### 7.1 Parse
- `.xml` → `DOMParser` → per `<Worksheet ss:Name>` a matrix of cells (honour
  `ss:Index` gaps). `.csv` → a tiny RFC‑4180 splitter (quote‑aware). Map header row →
  column indices by name (case‑insensitive), so column order is not load‑bearing.

### 7.2 Reconcile devices (naming‑aware)
- Ensure the catalog is rendered (`loadAllSources`/`loadAllDest`).
- Build lookup maps from the DOM: `senderNode(origin, feed)` and `twistEl(room, twist)`,
  both matched through a shared normalizer — `stripOrder` + strip leading emoji/glyph +
  trim + upper — so a spreadsheet that says `CAM 3` matches a DOM `📹 CAM 3` and a file
  `003_CAM 3`.
- Report rows whose Origin/Feed or Room/Twist do **not** resolve (the "unknown device"
  list) — surfaced in a summary dialog rather than failing the whole import.

### 7.3 Apply routes
- **Diff** the imported route set against the current `gatherLinks().cross`:
  additions → `placeSourceInTwist(twistEl, senderNode)`; removals → the grid's
  `breakRoute` removal (only when the import is a *full replace*, see mode below).
- **Import modes** (dialog): **Merge** (only add the sheet's routes) or **Replace**
  (make the DOM match the sheet exactly — add missing, remove extra). Default = Merge.
- Replay order respects caps: cameras/`maxVideo:1` first, then audio, so evictions don't
  clobber intended feeds. Rejected placements (accepts/caps) are collected into the report.
- After apply: `updateTwistVisuals` per touched twist, rebuild the grid, log a
  Captain's‑Log action, and show the summary (`N routes added · M removed · K unmatched`).

### 7.4 Device‑catalog authoring (Sources tab) — phased
- **P2 (this pass):** the Sources tab is **reference/round‑trip** for routing. New
  Origin/Feed rows that don't match the catalog are *reported*, not silently created.
- **P3 (later):** turn unmatched Sources rows into Routes drafts via `putDraft`
  (reconstruct the correct leaf shape — video `prefix`+`count` vs audio `items[]` vs
  `video[]` — from the grouped rows), so a spreadsheet can *author new devices*. Requires
  the shape‑inference rules in §2.2 and preserving undeclared fields (§2.2).

---

## 8. Deployment plan

| phase | scope | deliverable |
|-------|-------|-------------|
| **P0** | This audit | `docs/Audit/1990s-View-Import-Export-Audit.md` ✅ |
| **P1** | **Export** | `router-io.ts` + `router-io-sheet.ts`; SpreadsheetML + CSV; ⭳ Export in `.rv-bar`; round‑trips the DOM inventory + routes |
| **P2** | **Import (routes)** | `importWorkbook`: parse `.xml`/`.csv`, naming‑aware device match, Merge/Replace apply via `placeSourceInTwist`, summary dialog; ⭱ Import in `.rv-bar` |
| **P3** ✅ | **Import (catalog authoring)** | Sources‑tab rows whose Origin isn't in the catalog → source‑leaf drafts under `Routes/Sources/009_Imported/` (video→`video[]`, audio→`items[]`, split so the person heuristic never fires), registered in the folder + root manifest drafts; `listDirectory` now honours drafted manifests; ingress panel re‑rendered in place (no reload → DOM routes preserved) |
| **P4** | **Polish** | column validation, dropdown data‑validation lists in the workbook, `.xlsx` writer if Google‑Sheets‑native is required |

P1 + P2 shipped together (a usable round‑trip); **P3 shipped** (device authoring + `YYYYMMDD.HHMM` export timestamps). P4 is the remaining follow‑up.

### P3 notes (shipped)
- `src/ui/console/router-io-devices.ts` `authorDevices(sourcesSheet)`; wired first in `importWorkbook` (author → refresh panel → load all → apply routes).
- Enabler: `src/platform/discovery.ts` `listDirectory` now prefers a drafted `index.json` (it previously bypassed the draft overlay that `fetchJSON` already honoured).
- A created device's leaf `name` = the FULL Origin, so the panel‑computed lineage (origin = name at a category root) matches the sheet exactly and routes resolve.
- Export filenames are stamped `1990s-view.YYYYMMDD.HHMM.xml` (and the two CSVs).
- Verified by Puppeteer: import a workbook with a new Sources device + a route to it → device authored, rendered under an IMPORTED super‑pool, route applied.

## 9. File‑by‑file work list (P1 + P2)

- **new** `src/ui/console/router-io.ts` — build the 2‑tab model from the DOM scrapers;
  `exportWorkbook()`, `importWorkbook(file)`, the naming normalizer, the apply/diff.
- **new** `src/ui/console/router-io-sheet.ts` — SpreadsheetML 2003 writer + reader
  (DOMParser) + CSV writer/reader. Pure, unit‑testable.
- **new** `src/ui/console/router-io.test.ts` — round‑trip: model → SpreadsheetML → parse
  → same model; CSV split edge cases (quotes/commas/newlines); the twist‑name normalizer.
- **edit** `src/ui/console/router-view.ts` — add ⭳ Export / ⭱ Import buttons to `.rv-bar`,
  wire to router-io; refresh the grid after import.
- **edit** `src/ui/console/router-view-gather.ts` — export a shared `cleanTwist()`/origin
  normalizer if not already reusable (keep DRY with matrix/topics `stripOrder`).
- **reuse** `router-view-grid.ts` `makeRoute`/`breakRoute` semantics (or their internals)
  for apply; `authoring.ts` `downloadText` (generalized) for the Blob download.

## 10. Risks & mitigations

- **Emoji/order‑prefix drift** between DOM twist titles and file names → one shared
  normalizer used by both export and import match (§7.2); unit‑tested.
- **Cap eviction reorders feeds** → cap‑respecting replay order + reject report (§7.3).
- **Lazy rendering** hides devices → force `loadAllSources`/`loadAllDest` before both
  export and import (§6.1, §7.2).
- **Excel mangling** (leading `+`/`=`, big numbers) → we emit text‑typed cells; identity
  columns are strings.
- **Partial imports** → Merge is the default and is purely additive; Replace is explicit
  and logged/undoable via Captain's Log.
- **200‑line rule** → split writer/reader into `router-io-sheet.ts`; the CI tripwire
  (`scripts/check-file-size.mjs`) gates it.
