# Studio Spaces + Hierarchical Routing Audit

Four linked workstreams, from four locked decisions:

1. **Studio Spaces** — merge `Routes/Sources/001_Sound` + `002_Video` into one on‑disk
   `001_Studio Spaces/` tree. *(decision: restructure on disk)*
2. **3‑layer containment** — the 1990s view shows **three** group layers before the
   leaf channels. Sources: **Space → Wall → Box → channels**. Destinations:
   **Facility → Floor → Room → twist**.
3. **Salvo routing** — routing a *container* to a *container* (production→floor,
   floor→control‑room) creates **one crosspoint per matching leaf** (a bulk salvo).
4. **JSON format** — replace the SpreadsheetML `.xml` export/import with hierarchical
   **JSON** whose parents (studios, walls / facility, floors, rooms) are nesting objects.

---

## 1. Current state (what we migrate from)

- **Sound** (`001_Sound/`): 5 floors × 10 **audio** stage boxes `S<loc>-` + `items[CH 1..12]`
  (`extraClass:"audio-studio"`), each floor also a `000_Wireless_Controller.json`; plus
  `006_Wireless Microphones/` (PRI/BAK packs).
- **Video** (`002_Video/`): 5 floors × 10 **video** stage boxes `prefix:"V<loc>-"`,
  `count:8` (`extraClass:"video-st1"`); plus `006_Remotes/` (Remotes, Sats).
- Location numbering `<floor><NN>` (101…510); a **video SB and an audio SB share each
  location number** = the two boxes of one physical wall.
- Sources are discovered by folder manifest (`index.json` array) and dispatched by leaf
  **shape** (`inferPoolKind`): `prefix`+`count`→video, `items[]`→audio. The panel nests
  arbitrarily deep already (`renderSourceTree` recurses; sub‑dirs lazy‑load on click).
- **Routes are DOM‑only** (no persisted record) — so regenerating the source catalog
  breaks nothing (nothing references a source id on disk; the destinations don't either).

## 2. Phase 1 — Studio Spaces migration (on disk)

**Target tree** (`Routes/Sources/`):

```
001_Studio Spaces/
  001_Studio A/
    001_North Wall/ { 001_Video SB 101.json, 002_Audio SB 101.json }
    002_East Wall/  { 001_Video SB 102.json, 002_Audio SB 102.json }
    003_South Wall/ …   004_West Wall/ …
  002_Studio B/ …            ← 4 walls per studio
002_Wireless/
  001_Controllers/ { one per floor }      002_Microphones/ { PRI/BAK packs }
003_Streams/  004_Play/  005_Prod/  006_Graphics/
007_Remotes/  { Remotes, Sats }           008_Prompter/
```

**Faithful mapping (no device loss):** pair the existing video SB + audio SB by location
number, sort by number, chunk **4 walls per studio** (N/E/S/W); 50 pairs → 13 studios
(last partial). Each box keeps its `prefix`/`count`/`items`/`extraClass`/`color`/`status`;
only renamed for clarity (`VIDEO SB <loc>` / `AUDIO SB <loc>`) so the two boxes read as
distinct layer‑3 boxes under a wall. Root manifest becomes
`["001_Studio Spaces/","002_Wireless/","003_Streams/","004_Play/","005_Prod/","006_Graphics/","007_Remotes/","008_Prompter/"]`
(007 was the free slot; 003‑006/008 unchanged → minimal churn).

Driven by `scripts/migrate-studio-spaces.mjs` (idempotent, git‑reversible). Studios‑per…
parameters live at the top so the facility layout is easy to re‑shape.

**Origin lineage** (set by `renderSourceTree` from the folder chain + leaf name) becomes
`Studio A — North Wall — VIDEO SB 101`, giving the exact **Space → Wall → Box** identity
the grid and export key on.

## 3. Phase 2 — 3‑layer containment in the 1990s grid

Today `router-view-grid` renders **2** header levels (parent + origin/prod) then leaves,
splitting `origin` on the *last* `" — "` (`splitParent`). New: split the full lineage into
**segments** and render up to **3 collapsible header levels** on each axis:
- Rows: `Studio ▸ Wall ▸ Box ▸ channel` (from the `data-origin` "A — B — C" path).
- Cols: `Facility ▸ Floor ▸ Room ▸ twist` (destinations normalized under a facility→floor
  →room spine; control rooms included via a synthetic facility/floor label).

Work: generalize `RowLeaf`/`ColLeaf` from `{parent, leaf}` to a `path: string[]` (segments)
+ per‑level collapse sets; `buildGrid` emits nested `<th>`/`<td rowspan/colspan>` for each
level. Collapse memory extends from 2 sets to N‑level sets in prefs.

## 4. Phase 3 — Salvo routing (container → container)

New gesture in the grid: clicking a **group×group** header intersection (currently inert)
performs a **salvo** — for every source leaf under the row group and every twist under the
col group, apply `placeSourceInTwist` where `accepts` permits, pairing by order/type. So
"PROD 3 ▸ 2nd Floor" wires each production feed into the floor's matching input. Implemented
by reusing `applyRoutes`‑style matching over the group's leaves; reports made/skipped. A
confirm dialog guards large salvos. (Also exposed as a right‑click "salvo" on a group cell.)

## 5. Phase 4 — JSON export/import (replaces XML)

Replace `router-io-sheet` SpreadsheetML with **hierarchical JSON**:

```jsonc
{ "schema": "spog.router/1", "stamp": "YYYYMMDD.HHMM",
  "sources": [ { "name":"Studio A", "children":[
      { "name":"North Wall", "children":[
        { "name":"VIDEO SB 101", "type":"video", "feeds":["V101-1", …] } ] } ] } ],
  "destinations": [ { "name":"FACILITY", "children":[
      { "name":"2nd Floor", "children":[
        { "name":"PROD 3", "twists":[
          { "name":"CAM 1", "accepts":"camera", "routed":[
            { "origin":"Studio A — North Wall — VIDEO SB 101", "feed":"V101-1" } ] } ] } ] } ] } ] }
```

Parents are nesting objects (studios/walls, facility/floors/rooms). Crosspoints live on each
twist's `routed[]`. Import walks the trees: `sources` → device authoring (P3 logic, now
tree‑shaped), `destinations[*].twists[*].routed[]` → `placeSourceInTwist`. Round‑trip +
`norm()` matching unchanged. CSV stays as a flat convenience export; the primary is JSON.

## 6. Deployment plan

| phase | ships |
|-------|-------|
| **P1** ✅ | Studio Spaces on‑disk migration + relocated wireless/remotes; panel renders Space→Wall→Box |
| **P2** ✅ | 1990s grid: 3 collapsible layers per axis (pure planner `router-view-tree` + matrix renderer `router-view-render`; `data-prod-cat` threads the Facility level) |
| **P3** ✅ | Salvo (container→container bulk crosspoint) — click a `.rv-cell.grp` group×group intersection; greedy type-matched pairing via `router-view-salvo`; confirm + made/skipped report |
| **P4** ✅ | JSON export/import replaces XML — hierarchical `router-io-json` (Studio→Wall→Box(→feeds) / Facility→Room→twist(→routed)); import auto-detects JSON vs legacy XML/CSV; a thin nest/flatten layer over the sheet pipeline so device-authoring + route replay are reused |

**ALL FOUR PHASES SHIPPED + verified** (typecheck · 73 tests · Puppeteer: Space→Wall→Box
render, make/break, salvo of 12 feeds, JSON export nests + stores crosspoints + re-imports).
P1 first — it reshaped the data every later phase reads.

## 7. Risks

- **Data migration is destructive‑ish** — runs via a git‑tracked script; the old tree is
  recoverable from git. Verify the panel + a route end‑to‑end before deploy.
- **Origin‑lineage length** grows (3 segments) — the `norm()` matcher already handles
  multi‑segment; export keys on the full `data-origin`.
- **Partial last studio** (2 walls) — accepted; a studio may have <4 walls.
- **Salvo blast radius** — confirm dialog + made/skipped report; never silent.
