# ICON VIEW — a second aesthetic for the console chrome
### Audit & deployment plan: replacing the LCARS text bars with the macOS-style icon tiles
*Audit date: 2026-07-04 · Repo state: TS build (post-cutover), gang elbows + vertical footer tree shipped, icon sets generated.*

---

## 1. Thesis

The console already has TWO orthogonal presentation engines that prove the pattern this
feature needs:

| Engine | Axis | Mechanism |
|---|---|---|
| **Chirality** | `html[data-chirality]` = `right \| left` | attribute on `<html>`, CSS re-aims geometry, JS reads `--chir` |
| **Colour** | `html[data-vision]`, `html[data-chroma]`, `html[data-cvd]` | attributes + inline tokens, painted before first render, persisted as one JSON blob |

The ICON VIEW is a **third engine — a FACE axis** (`html[data-face]` = `lcars | icons`),
implemented the exact same way. It is an *overlay*, not a rebuild: the DOM the console
builds today stays byte-identical; a `data-face="icons"` attribute swaps what the CSS
paints on the same elements, and a ~40-line resolver stamps each chrome element with the
URL of its icon tile. Nothing about routing, drops, editors, authoring, or MQTT changes.

**Estimated effort: 2–3 days** (P0 ½ day, P1 1 day, P2 1 day, polish ½ day).

---

## 2. The assets (already shipped)

Both icon sets were generated 2026-07-04 in the macOS Big-Sur "dock tile" style —
512×512 squircle (rx 108), accent gradient matched to the LCARS category colour, white
glyph, SVG + transparent PNG, with a self-contained generator (`make-icons.mjs`) living
in each folder:

| Folder | Tiles |
|---|---|
| `Routes/Destinations/.icons/` | control-rooms · floors · encoders · edit-suites · test-tools · people |
| `Routes/Sources/.icon/` | sound · video · streams · play · prod · graphics · prompter · people · portals |

The file *slug* is the lookup key: `slug(label)` = lowercase, non-alphanumeric → `-`
(same rule as the deep-link hash in `main.ts`). Every current top-level category label
resolves to a tile with zero mapping tables: `CONTROL ROOMS → control-rooms.svg`,
`SOUND → sound.svg`, etc. New categories self-serve by dropping a tile with the right
name — the same "add a file, zero code edits" contract the Routes tree already follows.

---

## 3. The surfaces (with receipts)

### 3.1 Footer destination tree — the "main menu"
*Built in `src/ui/console/footer.ts` (`Footer.addGroup` / `Footer.addTab`; CSS in
`FOOTER_CSS`), fed by `buildDestinations`/`addDestinationTree` in
`src/ui/console/destinations.ts`.*

- **`.lcars-group-label`** — the coloured pill per category (CONTROL ROOMS, FLOORS,
  ENCODERS, EDIT SUITES, TEST TOOLS, PEOPLE) and per nested group (PRIMARY, 1ST FLOOR…).
  → In icon face: top-level groups render their **category tile** (48–56px) with the
  text demoted to a small caption under the tile (or a tooltip at the tightest density).
  Nested groups keep text pills — they have no tiles yet (see §6 monograms).
- **`.lcars-tab`** — the leaf tabs (PRODUCTION 1, ROOM 3…), now a vertical stack.
  → No per-room artwork exists. P1 keeps them as text; P2 mints **monogram tiles**
  (§6) so the whole tree reads as a dock.

### 3.2 Sources sidebar super-pools — the "sub sources"
*Built in `src/ui/sources/panel.ts` `buildSuperPool()` (`.super-pool-container` with
`::before` cap / `::after` bar, `.super-pool-title`, `.super-pool-emoji`); PORTALS clone
in `src/ui/console/portals.ts` `ensureSourcePool()`.*

- Folded pool = 25px LCARS bar + glyph cap. → In icon face: the whole folded pool
  renders as its **source tile** (~56px) + caption; the bar/cap pseudo-elements are
  suppressed (`data-face="icons"`-scoped `display:none` on `::before/::after`).
- Open pool: the tile stays as the header (replacing bar+cap), content below unchanged.
  The spine that frames an open pool can stay — it is the container, not the label.

### 3.3 Destination category fixtures (inside rooms)
The gang bars / twist elbows inside a room are **routing furniture, not menu chrome —
explicitly out of scope.** The user ask is "main menu buttons and the sub sources and
destinations" — i.e. the *navigation* chrome, not the patch surface. (A later phase
could icon-badge the gang summary bars; noted in §8.)

---

## 4. The mechanism

### 4.1 FACE axis on the colour engine (`src/ui/console/colour-scheme.ts`)
The whole engine extension is mechanical because the engine was built for axes:

1. `type Face = 'lcars' | 'icons'` + `FACES` array + `isFace()` guard — mirrors
   `Vision`/`Chroma` exactly.
2. `ColourScheme` gains `face: Face` (default `'lcars'`); `getScheme()`/`paint()`
   read/write `html[data-face]`; the persisted blob at `localStorage['twist.colour']`
   picks the field up for free (the parser already default-fills unknown/missing keys).
3. The **Fine control** section gains one segmented row — `FACE · LCARS | ICONS` — by
   adding one entry to the `AXES` table; the existing `sync()`/`aria-pressed` plumbing
   renders it with zero new UI code.
4. Optional preset: an "ICON DECK" preset in the preset row (face:icons + current
   palette), so the mode is one click from the palette button.
5. `applyStoredColourScheme()` runs before first render (already called in
   `buildConsole()`), so the console lands directly in the chosen face — no flash.

### 4.2 Icon resolution — stamp once, style everywhere
A tiny shared helper, `src/ui/icon-face.ts`:

```ts
export const iconUrl = (kind: 'src' | 'dest', label: string): string =>
  `Routes/${kind === 'src' ? 'Sources/.icon' : 'Destinations/.icons'}/${slug(label)}.svg`;
export function stampIcon(el: HTMLElement, kind: 'src' | 'dest', label: string): void {
  el.style.setProperty('--face-icon', `url("${iconUrl(kind, label)}")`);
  el.classList.add('has-face-icon');
}
```

Call sites (one line each):
- `Footer.addGroup` → stamp the label element (`kind:'dest'`) for **top-level** groups
  (depth 0 — the call from `buildDestinations` and the PEOPLE/PORTALS groups).
- `buildSuperPool` (+ portals' `ensureSourcePool`) → stamp the container (`kind:'src'`).

No fetch, no existence check needed: the CSS layer only *shows* the icon in
`data-face="icons"`, and a 404 background-image simply doesn't paint — the caption
remains, so an un-tiled label degrades to a text chip, never to a hole. (Optional
polish: a one-time `HEAD` probe per URL to drop `has-face-icon` on misses.)

### 4.3 CSS overlay (append to `lcars.css`, ~60 lines)
All rules scoped `html[data-face="icons"] …` — the LCARS face is untouched, and
flipping the attribute is instant both ways:

```css
/* footer: category pill → dock tile + caption */
html[data-face="icons"] .lcars-group-label.has-face-icon{
  background:transparent; border-radius:14px; padding:4px 6px;
  flex-direction:column; gap:4px; font-size:8px; letter-spacing:1px; color:#cfe0ff;}
html[data-face="icons"] .lcars-group-label.has-face-icon::before{
  content:''; width:52px; height:52px; border-radius:13px;
  background:var(--face-icon) center/contain no-repeat;
  box-shadow:0 4px 10px rgba(0,0,0,.45);}
html[data-face="icons"] .lcars-group-label.has-face-icon .lcars-group-caret{display:none;}

/* sidebar: folded pool bar+cap → tile + caption */
html[data-face="icons"] .super-pool-container.has-face-icon::before,
html[data-face="icons"] .super-pool-container.has-face-icon::after{display:none;}
html[data-face="icons"] .super-pool-container.has-face-icon{padding:2px 2px 2px 66px; min-height:56px;}
html[data-face="icons"] .super-pool-container.has-face-icon .super-pool-emoji{
  top:0; left:0; width:56px; height:56px; font-size:0;
  background:var(--face-icon) center/contain no-repeat;}
html[data-face="icons"] .super-pool-title{ /* becomes the caption beside the tile */ }
```

(Exact numbers to be tuned against screenshots, like every pass this week — the point
is the *shape*: pseudo-element swap + caption, zero DOM change.)

Free consistency win: the colour engine's chroma/vision root filter
(`html{filter:var(--f-chroma) var(--f-vision)}`) already applies to background images —
grey/mono/high-contrast modes grade the icon tiles exactly like the LCARS bars, so the
two engines compose with no extra work. Chirality also composes: tiles are symmetric
squares; only caption alignment needs a one-line RTL rule.

---

## 5. Change inventory

| # | File | Change | Size |
|---|---|---|---|
| 1 | `src/ui/console/colour-scheme.ts` | FACE axis: type, scheme field, attribute, AXES row, (preset) | ~25 lines |
| 2 | `src/ui/icon-face.ts` (new) | `slug` / `iconUrl` / `stampIcon` | ~20 lines |
| 3 | `src/ui/console/footer.ts` | stamp top-level group labels; accept an `icon?: boolean` opt | ~8 lines |
| 4 | `src/ui/console/destinations.ts` | pass `icon:true` for the category-level `addGroup` calls | ~4 lines |
| 5 | `src/ui/sources/panel.ts` | stamp in `buildSuperPool` | ~3 lines |
| 6 | `src/ui/console/portals.ts` | stamp the portals pool | ~2 lines |
| 7 | `lcars.css` | the `data-face="icons"` overlay block | ~60 lines |
| 8 | `docs/LCARS.md` | note the FACE axis beside chirality/colour | ~6 lines |

Nothing else. `dispatch.test.ts` unaffected; no editor, matrix, or Routes-schema change.

---

## 6. Gaps & how they close

1. **Leaf tabs have no artwork** (PRODUCTION n, ROOM n, EDIT 10n, ENCODER n).
   Close with **monogram tiles**: port the squircle template out of `make-icons.mjs`
   into `icon-face.ts` as `monogramTile(label, accentHex): string` returning an inline
   `data:image/svg+xml` URL — same gradient/sheen/radius, glyph = the tab's 1–3-char
   monogram ("P1", "R3", "E4") in the group's colour. Every tab then gets a tile with
   ZERO asset files, and authored rooms can still override by dropping
   `Routes/Destinations/.icons/<slug>.svg`. (The generator already encodes the whole
   template — this is a copy-paste-and-parameterise job, ~40 lines.)
2. **Nested groups** (PRIMARY, 2ND FLOOR…) — same monogram path, colour from the group.
3. **Fault states.** LCARS face pulses the bar red; the icon face needs an equivalent:
   reuse the existing `.fault` class → red ring + dot badge on the tile (÷ colour-blind
   safe because it is a shape change, consistent with docs/Colours and shapes.md).
4. **Density.** A dock of 52px tiles is taller than a 25px bar row. The sidebar stack
   currently runs ~9 pools ≈ 306px; at 56px tiles + caption it is ~600px. Acceptable in
   a 1000px viewport, but P2 should add a `compact` variant (40px, no caption, tooltip
   only) selected automatically when the sidebar is sash-narrowed below ~140px — the
   sidebar already collapses to icon-caps today, so this is the natural continuation.
5. **A11y.** The caption keeps the accessible name in the DOM; where P2 drops captions,
   the label moves to `aria-label` + `title` (the elements already carry the text —
   only CSS hides it, so screen readers are unaffected).

---

## 7. Risks

- **CONFIRMED — `.icons` never deploys.** `deploy.py::_under_roots()` rejects any path
  containing a dot-prefixed segment, so `Routes/**/.icons/**` is invisible to BOTH the
  incremental and `--all` upload sets. (The manifest walk prunes dot-dirs too — that
  half is *correct*: it keeps the icon folders out of the app's discovery tree, which
  is exactly why dot-names were chosen.) **Fix in P0:** allowlist asset dot-folders in
  `_under_roots` (`.icons`/`.icon` segments pass, still excluded from `write_manifest`)
  — ~4 lines in `deploy.py`. Until then the icons exist only locally.
- **Dot-folder serving** — after the deploy fix, verify the static host serves
  `.icons/.icon` dot-paths (some hosts block dotfiles). Fallback: serve the tiles from
  an app-bundle `icons/` directory instead — the resolver (`icon-face.ts`) is the only
  place that knows the path, so relocation is a one-line change.
- **CSP/`background-image` with SVG** — served same-origin, no issue expected.
- **The emoji cap element is reused as the tile anchor** (`.super-pool-emoji`) — its
  chirality mirror rules (left/right swap) must be re-checked in icon face; both
  variants are one `left/right` override each.

---

## 8. Phasing

- **P0 — the axis (½ day).** FACE axis in colour-scheme.ts + attribute + persistence +
  segmented row + `icon-face.ts` resolver. Ship dark: no CSS yet, attribute flips are
  observable in devtools.
- **P1 — the two headline surfaces (1 day).** Footer top-level groups + sidebar pools
  (incl. portals) + fault ring + chirality captions. This is the user-visible deliverable:
  palette → ICONS → the main menu and source pools become a dock.
- **P2 — full tree (1 day).** Monogram tiles for tabs/nested groups; compact density
  mode; optional icon-badges on gang summary bars.
- **Later.** Per-room authored tiles (room JSON `icon:` field → resolver override);
  icon face for the radial destination selector; TwistBus-advertised face state so an
  external panel can flip the console's skin.

---

*Companion knowledge: the two `make-icons.mjs` generators are the tile style's source
of truth — any new surface (monograms, badges) should derive from that template, not
fork the styling.*
