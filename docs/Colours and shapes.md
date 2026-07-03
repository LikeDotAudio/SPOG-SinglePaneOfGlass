# Colours & Shapes — Colour-Vision Accessibility Audit + Colour-Engine Strategy

**Status:** Audit + strategy proposal · **Date:** 2026-07-03
**Scope:** Colour-blindness / low-vision UX audit of the live LCARS UI, plus a design for a
composable **Colour Engine** driving four presentation modes — *low-visibility*,
*high-visibility*, *grey*, and *monochrome* — as the substrate under every module and style.
**One-line thesis:** *signal category* already has shape redundancy (V/A/hex clip-paths), but
*state* (fault, active, alarm) is coded by **colour + motion alone**, and there is no
contrast/chroma path anywhere; the fix is not a new palette but an **engine** — a unified
semantic token layer + a shape/glyph redundancy layer for state — switched by a single
`html[data-vision]` attribute, exactly the way the shipped **Chirality Engine** switches
handedness with `html[data-chirality]`.

---

## 0. TL;DR for the impatient

1. **The accessibility hole is real and specific — and narrower than you'd fear.** Signal
   *category* is already shape-coded (video = trapezoid, audio = inverted trapezoid, camera =
   hexagon; `lcars.css:477-546`), so it survives colour-blindness. **The actual gap is *state*:**
   fault / alarm / active are coded by hue (violet `#CC99CC`, orange `#FF9C63`, blue `#646DCC`,
   red `#ff3b3b`) **plus a pulse animation and nothing else** (`lcars.css:1068-1107`) — no glyph,
   no label. Violet vs blue is also the *exact* pair that merges under deuteranopia/protanopia
   (~8% of men). And there is **no** high-contrast, grey, or mono path anywhere in the codebase.
2. **The four "modes" the user asked for are really three orthogonal axes.** *Low-vis ↔
   high-vis* is a **contrast/luminance** axis. *Grey* and *monochrome* are points on a
   **chroma** axis (full-colour → desaturated → single-hue). CVD-safety is a third axis
   (palette selection). Building four hardcoded themes is a trap; building **three composable
   axes** gives you the four named presets *and* every combination for free.
3. **You already have the switching mechanism.** The Chirality Engine
   (`lcars.css:19-40`) proves the house pattern: an `html[data-*]` attribute flips CSS custom
   properties, and JS reads a signed var (`--chir`) for canvas placement. The Colour Engine is
   the same machine pointed at colour. This is why "late in the game" is survivable.
4. **The cost is dominated by one debt: colour is scattered across ~40+ files.** `lcars.css`
   alone has 106 hardcoded hex; on top of that, **17 `src/editors/*/styles.ts` blocks inject
   their own CSS** (via `addStyles()`, `src/ui/dom.ts:29`) with hundreds more literals, ~21
   files set canvas/inline colour, and there is a **second, disconnected palette source of
   truth** in `src/ui/palette.ts`. The engine itself is ~1 day; unifying these into semantic
   tokens is the real work. It is mechanical and low-risk (the token names already exist) but
   it is *broad*, not one file.
5. **Shapes are the accessibility win, not colours.** A colour-blind-*safe* palette still fails
   in greyscale printouts, on cheap projectors, and for total achromatopsia. A **glyph per
   signal category** (▷ video, ◈ audio, ▚ program) that ships in *every* mode is what actually
   makes the UI robust. Colour becomes an enhancement, not the message.

---

## 1. Where the app is today (the audit)

### 1.1 The single styling surface

- **`lcars.css`** — 52 KB, ~1,300 lines, root of repo. The header comment
  (`lcars.css:1-3`) states it is *"SHARED … for BOTH the live js/ app (index.htm) and the A.8
  TypeScript build (index.next.html) … shared, never forked."* It is the **primary** surface —
  but not the only one (see below).
- **Injected per-editor CSS.** 17 `src/editors/*/styles.ts` modules push their own `<style>`
  blocks at runtime via `addStyles()` (`src/ui/dom.ts:29`), carrying *hundreds* more hardcoded
  hex (densest: `camera-control/styles.ts` 56, `graphics-engine/styles.ts` 54,
  `audio-mixer/styles.ts` 42). A colour engine that only touches `lcars.css` leaves all of these
  untouched. **The tokens must be global (`:root`) so injected CSS can `var()` them.**
- **A second palette source of truth.** `src/ui/palette.ts` holds JS colour arrays
  (`AUDIO_POOL_COLORS`, `SOURCE_POOL_COLORS`, `DEST_TAB_COLORS`) consumed by
  `console/destinations.ts` and `sources/panel.ts`. This and the CSS `:root` are two disconnected
  palettes that the engine must **reconcile into one**.
- **The category palette is even defined twice *inside* `lcars.css`** — `673-679` and
  `1057-1066` — with *different* hues (a base set and a switcher-context override). Reconcile
  these during migration.
- A **nascent token layer** exists in `:root` (`lcars.css:4-17`):

  ```css
  :root {
      --bg-color: #050a15;
      --panel-bg: rgba(10, 20, 40, 0.8);
      --cyan:  #00ffff;
      --magenta: #ff00ff;
      --blue:  #4d94ff;
      --text-main: #e0f0ff;
      /* Signal category colours */
      --video-color:   #CC99CC;   /* violet */
      --audio-color:   #FF9C63;   /* orange */
      --program-color: #646DCC;   /* blue   */
      --glow-cyan:    0 0 10px var(--cyan), 0 0 20px rgba(0,255,255,0.4);
      --glow-magenta: 0 0 10px var(--magenta), ...;
  }
  ```

- **But the layer is not enforced.** `lcars.css` contains **106 hardcoded hex literals**
  (16× `#ffaa00`, 12× `#000`, 6× `#ff3b3b`, 6× `#cc99cc` — *the same violet as `--video-color`,
  written raw*, etc.). The semantic signal vars are referenced only **9 times**. In other words:
  the design intent ("colours are tokens") exists as documentation but the code overwhelmingly
  bypasses it. **This is the single biggest obstacle to any theming, and it must be paid down
  regardless of which strategy you pick.**

### 1.2 A second colour surface: canvas / JS

CSS variables do not reach `<canvas>` fills or programmatically-set styles. Colour literals
live in the TypeScript build in at least:

- `src/ui/console/helix.ts` — the DNA-helix console render
- `src/ui/loudness.ts`, `src/ui/audio-scope.ts` — meter / scope rendering (`fillStyle` / `strokeStyle`)
- `src/ui/console/footer.ts`, `src/ui/sources/panel.ts`, `src/ui/widgets.ts`, `src/app/context.ts`

Any engine that only touches CSS will leave these surfaces stuck in full-colour. They need a
**JS token accessor** that resolves the same semantic names (§4.3).

### 1.3 What has redundancy and what doesn't

| Meaning            | Encoded by                    | Redundant (non-colour) cue? |
|--------------------|-------------------------------|-----------------------------|
| **Video** category | violet `--video-color`        | ✅ **trapezoid** clip-path `lcars.css:480` |
| **Audio** category | orange `--audio-color`        | ✅ **inverted trapezoid** (reads "A") `lcars.css:498` |
| **Camera-control** | light-blue `#6FC8F0`          | ✅ **hexagon** `lcars.css:521` |
| **Program** signal | blue `--program-color`        | ⚠️ colour + text label only |
| **Alarm / fault**  | red `#ff3b3b` + `faultPulse`  | ❌ **colour + animation only** `lcars.css:1068-1107` |
| **Active / on-air**| amber `#ffaa00` + glow        | ⚠️ position/glow only |
| Producer / auth    | `--prod-color: #ffaa00`       | ❌ colour only |

**Good news, corrected from first read:** signal *category* already ships intentional
colour-blind redundancy — the V/A/hex clip-paths (`lcars.css:477-546`, confirmed by the
source comment and CHANGELOG "Source node shapes read as V / A"). **The genuine gap is *state*:**
fault, alarm, active, and auth-role are communicated by hue (+ a pulse) with **no glyph, no
label, no shape**. That is the redundancy layer §5 must add — and it's a much smaller job than a
from-scratch icon set, because the shape *pattern* already exists to copy.

### 1.4 Accessibility posture: effectively none

`grep` for `prefers-contrast`, `prefers-color-scheme`, `forced-colors` → **zero hits**.
`prefers-reduced-motion` appears in **exactly one** file (`src/ui/console/lcars-pulse.ts:27`,
disabling only the pulse strip) — the many other animations (`faultPulse`, DNA-helix motion,
blink) ignore it. The only `@media` queries in `lcars.css` are responsive breakpoints
(`123`, `1285`). There is no light/dark toggle, no high-contrast path, no
system-preference respect. The aesthetic is a single fixed dark-glow LCARS theme.

Note the **glow** motif (`--glow-cyan`, `text-shadow: 0 0 10px …` everywhere): glow *lowers*
effective contrast (it bleeds a bright halo into the dark background around edges) and is
actively hostile to low-vision users. Any high-visibility mode must be able to **kill glow**,
which means glow too must become a token, not a literal.

### 1.5 The precedent that makes this cheap: the Chirality Engine

`lcars.css:19-40` already ships a mode engine:

```css
html { --chir: 1; }
html[data-chirality="left"] { --chir: -1; }
.chir-fixed { transform: scaleX(var(--chir, 1)); }
```

An `html[data-*]` attribute flips CSS custom properties; JS reads a var (`--chir`) for
canvas-side placement. **The Colour Engine is architecturally identical** — a
`html[data-vision]` (+ `data-cvd`, `data-chroma`) attribute that re-points semantic tokens, plus
a JS accessor for the canvas surfaces. You are not inventing a pattern; you are cloning a
shipped one.

---

## 2. Deep research: what the literature actually says

### 2.1 Colour vision deficiency, by the numbers

- **~8% of men, ~0.5% of women** have some CVD — for a professional broadcast tool with a
  male-skewed operator population this is not an edge case, it's roughly *1 in 12 operators*.
- Types: **deuteranomaly/deuteranopia** (green-weak/blind, most common), **protanomaly/
  protanopia** (red-weak/blind), **tritanopia** (blue-yellow, rare), and **achromatopsia**
  (total, very rare — sees luminance only). The first two collapse the **red-green axis**;
  everything that differs *only* along red↔green (and, critically, **violet↔blue**, because
  violet is red+blue and loses its red component) becomes ambiguous.
- **Our exact failure:** `--video-color` violet `#CC99CC` and `--program-color` blue `#646DCC`
  both reduce toward a muddy grey-blue under deuteranopia. Orange `--audio-color` survives
  (orange/blue is the *one* pair CVD reliably preserves — which is why the whole world uses it).

### 2.2 The non-negotiable principle: never encode by colour alone

Every source converges on one rule, and it is codified in **WCAG 2.1 SC 1.4.1 (Use of Color, Level A)**:
*colour must not be the only visual means of conveying information.* The practical toolkit:

- **Dual coding / redundant cues** — pair every colour with a second channel: a **shape**, an
  **icon**, a **text label**, a **fill pattern**, or **position**. Status → colour *and* glyph
  (✓ / ! / ✕). Data series → colour *and* stripe/dot/hatch.
- **Luminance contrast, independent of hue** — WCAG AA: **4.5:1** for normal text, **3:1** for
  large text (≥18px, or 14px bold) and for UI component/graphical-object boundaries (SC 1.4.11).
  AAA raises text to **7:1**. Contrast is a *luminance* relationship, so it keeps working when
  hue is destroyed — this is why it is the backbone of a monochrome mode.
- **The grayscale test** — desaturate the whole UI; anything that becomes ambiguous was relying
  on hue. This test is *free* to run once the engine has a grey mode, and doubles as CI.

### 2.3 The gold-standard categorical palette: Okabe-Ito

Okabe & Ito (2002), popularised by Wong in *Nature Methods* (2011): **eight colours engineered
to stay distinguishable under protan, deutan, and tritan CVD, *and* to span a wide luminance
range so they survive greyscale.** Journals (Nature, Science, Cell) recommend it. Hex:

| Name           | Hex       | Role in our app (proposed) |
|----------------|-----------|-----------------------------|
| Orange         | `#E69F00` | **Audio** (keeps our orange semantics) |
| Sky blue       | `#56B4E9` | **Program** (replaces `#646DCC`) |
| Bluish green   | `#009E73` | Available / OK / connected |
| Yellow         | `#F0E442` | On-air / active |
| Blue           | `#0072B2` | secondary / info |
| Vermillion     | `#D55E00` | **Alarm / fault** (survives CVD, unlike pure red) |
| Reddish purple | `#CC79A7` | **Video** (replaces `#CC99CC`; distinct from blue under CVD) |
| Black/grey     | `#000000` | ground |

The critical move: recolour **video → reddish-purple `#CC79A7`** and **program → sky/true-blue**,
so the two most-confused categories now differ along an axis CVD preserves *and* have different
luminance (so they still differ in grey and mono modes).

### 2.4 The switching mechanism: tokens + attribute, per modern design-systems practice

The universally-recommended structure is a **two/three-tier token model**:

- **Tier 1 — primitives:** raw values, one source of truth: `--ok-orange: #E69F00`.
- **Tier 2 — semantic/alias:** intent, not value: `--sig-audio: var(--ok-orange)`. *Components
  reference only Tier 2.*
- **Tier 3 — component (optional):** `--meter-fill: var(--sig-audio)`.

Themes are then implemented by **re-pointing Tier 2 under an attribute selector** —
`html[data-cvd="okabe"] { --sig-video: var(--ok-purple); }` — while component CSS never
changes. This is the exact same lever as `prefers-contrast` / `prefers-color-scheme`, but under
*our* control so the user can override the OS. This is precisely how the Chirality Engine
already works here (§1.5).

---

## 3. Design: disentangle "four modes" into three axes

The request names four modes. Treat them as **presets over three orthogonal axes**, so any
combination is reachable and the matrix stays small:

```
AXIS A — CONTRAST / LUMINANCE  (html[data-vision])
    low        →  dim, dark-adapted, glow ON, on-air-safe (won't wreck night vision)
    normal     →  today's look (default)
    high       →  max luminance separation, glow OFF, AA/AAA contrast, thick borders

AXIS B — CHROMA  (html[data-chroma])
    full       →  full colour (default)
    grey       →  desaturated; hue removed, luminance + shape carry meaning
    mono       →  single-hue phosphor (amber/green "1990s CRT"); pure luminance UI

AXIS C — CVD PALETTE  (html[data-cvd])
    default    →  current LCARS hues
    okabe      →  Okabe-Ito CVD-safe categorical remap (recommended default)
    protan / deutan / tritan  →  optional per-type tuned variants (later)
```

The four requested modes then fall out as named **presets**:

| Requested mode      | = axis settings                          | Who it's for |
|---------------------|------------------------------------------|--------------|
| **Low visibility**  | vision=`low`, chroma=`full`, cvd=`okabe` | on-air / dark control room / night ops; dim & non-distracting |
| **High visibility** | vision=`high`, chroma=`full`, cvd=`okabe`| bright room, low-vision, AA/AAA, glow off |
| **Grey**            | vision=`high`, chroma=`grey`             | CVD-agnostic; the built-in "grayscale test"; also print |
| **Monochrome**      | vision=`high`, chroma=`mono` (amber)     | achromatopsia; CRT nostalgia; e-ink/projector; ultimate fallback |

> **Domain note on "low visibility."** In broadcast this reads two ways and both are valid:
> (a) *low-vision accessibility* and (b) *low-light / dark-adapted on-air operation* where a
> bright UI would bloom on-camera or destroy an operator's night vision. The preset above serves
> (b) — dim, low-luminance, calm; **high-visibility serves (a)**. Worth confirming with the user
> which they meant; the engine supports both because they are just different points on axis A.

**Grey and monochrome are not decoration — they are the safety net.** They work for *every* CVD
type including total, they survive B&W printouts and bad projectors, and grey mode *is* the
grayscale accessibility test institutionalised as a shippable feature. This is why the user's
instinct ("these modes are the basis of all modules") is correct: if the UI is legible in
**mono**, it is legible for everyone, and colour is pure enhancement on top.

---

## 4. The Colour Engine — architecture

### 4.1 Token pyramid (all in `lcars.css :root`)

```css
:root {
  /* Tier 1 — primitives (Okabe-Ito + greys). Never referenced by components. */
  --ok-orange:#E69F00; --ok-skyblue:#56B4E9; --ok-green:#009E73; --ok-yellow:#F0E442;
  --ok-blue:#0072B2;   --ok-vermillion:#D55E00; --ok-purple:#CC79A7;
  --grey-0:#000; --grey-1:#1a1a1a; ... --grey-9:#fff;

  /* Tier 2 — semantic. THE ONLY THING COMPONENTS MAY USE. */
  --sig-video:   var(--ok-purple);
  --sig-audio:   var(--ok-orange);
  --sig-program: var(--ok-skyblue);
  --state-alarm: var(--ok-vermillion);
  --state-onair: var(--ok-yellow);
  --state-ok:    var(--ok-green);
  --ink:         var(--grey-9);      /* text */
  --ground:      var(--grey-0);      /* bg   */
  --glow:        0 0 10px;           /* glow radius token, killable per-mode */
}
```

### 4.2 Mode layers = attribute selectors that re-point Tier 2

```css
/* CVD remap — swaps only the primitives behind the semantics */
html[data-cvd="okabe"]  { /* already the default above */ }
html[data-cvd="default"]{ --sig-video:#CC99CC; --sig-audio:#FF9C63; --sig-program:#646DCC; }

/* CHROMA — grey: collapse every semantic to a luminance ramp */
html[data-chroma="grey"] {
  --sig-video:var(--grey-7); --sig-audio:var(--grey-5); --sig-program:var(--grey-3);
  --state-alarm:var(--grey-9); /* alarm = brightest, differs by luminance not hue */
}
/* CHROMA — mono: single amber phosphor, luminance-only */
html[data-chroma="mono"] {
  --ink:#ffb000; --ground:#0a0600;
  --sig-video:#ffb000; --sig-audio:#ffb000; --sig-program:#ffb000;   /* hue carries nothing */
  --glow: 0 0 6px;   /* signal is now shape + luminance + label, never colour */
}

/* CONTRAST — high: thicken borders, kill glow, force AA/AAA inks */
html[data-vision="high"] {
  --glow: 0 0 0;                          /* glow off */
  --ink:#fff; --ground:#000;
  --border-w: 3px;                        /* components read this */
}
html[data-vision="low"]  { --ink:#8fb0d0; --ground:#02040a; /* dim, calm */ }

/* Respect the OS out of the box, still overridable by the toggle */
@media (prefers-contrast: more)          { html:not([data-vision]) { /* = high */ } }
@media (prefers-color-scheme: light)     { html:not([data-vision]) { /* light primitives */ } }
@media (prefers-reduced-motion: reduce)  { *{ animation:none !important; } }
@media (forced-colors: active)           { /* map to system colours */ }
```

### 4.3 The JS bridge (for canvas surfaces `src/ui/**`)

A ~30-line module so canvas code speaks the same token names — sibling to how `--chir` is read
for placement today:

```ts
// src/ui/theme/tokens.ts
const css = getComputedStyle(document.documentElement);
export const token = (name: string) => css.getPropertyValue(`--${name}`).trim();
export const sig = (kind: 'video'|'audio'|'program') => token(`sig-${kind}`);
// invalidate the cache on mode change:
new MutationObserver(() => location /* or a re-render hook */)
  .observe(document.documentElement, { attributes:true, attributeFilter:['data-vision','data-chroma','data-cvd'] });
```

Then `helix.ts` / `loudness.ts` / `audio-scope.ts` call `ctx.fillStyle = sig('audio')` instead
of a literal. On any mode change, re-read + re-render.

### 4.4 The switch UI

One control cluster next to the existing chirality toggle (`.chir-toggle`, `lcars.css:31`) — a
segmented picker for the four presets plus an "advanced" disclosure exposing the three raw axes.
Persist to `localStorage` (mirror whatever chirality does) and set the attributes on `<html>` at
boot before first paint (inline head script) to avoid a flash.

---

## 5. Shapes — the redundancy layer (the actual accessibility win)

Category shapes already exist (§1.3). This section **extends the same pattern to *state***, which
is the real gap, and adds fill patterns so the UI reads in grey/mono. Colour-safe palettes still
fail for achromatopsia, greyscale print, and glare, so the durable fix is a **glyph vocabulary**
shipped in *every* mode, so meaning never depends on hue:

| State (the gap)      | Glyph | Rationale |
|----------------------|-------|-----------|
| **Alarm / fault**    | ▲! (triangle + bang) | ISO warning convention; replaces "red + pulse only" `lcars.css:1068-1107` |
| **On-air / active**  | ● + ring             | filled ≠ hollow, position-anchored |
| **OK / connected**   | ✓                    | universal |
| **Muted / off**      | ⦻ / hollow ○         | hollow = absence |
| **Producer / auth**  | ★ / badge            | role, not colour |

*(Category glyphs already shipped: video ◄trapezoid►, audio ▲inverted▲, camera ⬡ — leave as-is,
just make sure their **fill** is a token so grey/mono modes work.)*

Rules:
- The glyph rides **leading** every chip/row/node that today uses colour to mean *state*. Shape is
  primary; colour tints the same glyph. Start with **fault** (`lcars.css:1068-1107`) — highest
  safety value.
- **Fill patterns** (hatch/dot/solid) on meter bars, matrix crosspoints (`src/ui/console/matrix.ts`),
  and category nodes so the routing matrix reads in grey and mono. A CSS `background-image`
  linear-gradient hatch keyed off the same Tier-2 token.
- Glyphs are **font/SVG**, so they inherit `--ink` and survive every mode automatically.
- This layer is *independent of the colour engine* and can ship first for immediate WCAG 1.4.1
  compliance even before the token migration finishes.

---

## 6. What it takes to deploy — retrofit plan & effort

"Late in the game" is fine **because the switching machine already exists** and one CSS file is
the whole surface. Ordered by value-per-effort:

| Phase | Work | Effort | Risk | Unblocks |
|-------|------|--------|------|----------|
| **P0 — State glyphs** | Add the shape/glyph layer (§5) to *state* — fault first (`lcars.css:1068-1107`), then active/OK/mute/auth. Category shapes already exist. No engine needed. | ~1 day | Low | WCAG 1.4.1 *now*; mono-mode substrate |
| **P1 — Token pyramid** | Add Tier-1 primitives + Tier-2 semantics to `:root`; wire OS `@media` respect. Pure addition, nothing removed yet. | ~0.5 day | None | everything below |
| **P2 — Hex migration** | Replace the **106 hex in `lcars.css`** *plus* the literals in the **17 `src/editors/*/styles.ts`** injected blocks with `var(--…)`, and fold `src/ui/palette.ts` into the token layer. Mechanical (names exist) but broad. Do it in themed groups (signal → state → chrome), editor by editor. | **~4-6 days** | **Medium** (volume across ~40 files, visual regressions) | grey/mono/high modes actually working |
| **P3 — CVD remap** | Flip the default signal hues to Okabe-Ito (`data-cvd="okabe"`); keep `data-cvd="default"` for the classic look. Reconcile the twice-defined category palette (`lcars.css:673-679` vs `1057-1066`). | ~0.5-1 day | Low | 1-in-12 operators |
| **P4 — Chroma + contrast layers** | Add `data-chroma=grey|mono` and `data-vision=low|high` selectors (§4.2). Only possible *after* P2. | ~1 day | Low | the four requested modes |
| **P5 — JS bridge** | `tokens.ts` accessor + re-render on mode change; convert canvas literals in the ~21 canvas/inline files (`matrix.ts`, `helix.ts`, `loudness.ts`, `audio-scope.ts`, `palette.ts`, editor canvases). | ~1-1.5 days | Medium | canvas surfaces stop being stuck in colour |
| **P6 — Switch UI + persistence** | Segmented preset picker beside the chirality toggle; `localStorage`; pre-paint boot script. | ~0.5 day | Low | user-facing feature |

**Total ≈ 8-11 focused days**, of which **P2 (hex/palette migration) is ~half and is the only
genuinely tedious part** — it is broad (≈40 files) rather than deep. Everything else is small
because the patterns (attribute engine, JS var read, toggle-by-`<html>`-attribute, `localStorage`)
are all already in the repo.

**Ship-early option:** P0 alone (glyphs) closes the worst accessibility gap and is independent of
the engine — do it this week even if the engine slips.

---

## 7. Risks, gotchas, and decisions to confirm

- **Regression surface of P2.** Swapping 106 literals for vars *will* shift some pixels. Do it in
  small themed commits, screenshot-diff each, and keep `data-cvd="default"` as a pixel-for-pixel
  escape hatch so the classic look is always one attribute away.
- **Glow is anti-contrast.** The pervasive `text-shadow: 0 0 10px` / `--glow-*` must become a
  token so high/mono modes can zero it. Non-negotiable for a real high-vis mode.
- **Canvas is a separate world.** CSS-only work leaves `helix/loudness/audio-scope` full-colour.
  P5 is not optional if those surfaces carry meaning by colour (the meters do).
- **Deploy path.** Per the deploy gotcha in project memory, `lcars.css` and new `src/ui/theme/`
  files must actually reach the server — bare `npm run deploy` only ships git-uncommitted Routes;
  use the `--all` path and confirm `lcars.css` is in the bundle. Verify the `dist/assets/main-*.css`
  rebuild picks up the new tokens.
- **Decision — meaning of "low visibility."** Confirm with the user: dim/dark-adapted on-air
  (interpretation used here) vs. low-vision-accessibility. The engine serves both, but the
  *default preset naming* should match intent.
- **Decision — default palette.** Recommend shipping **`data-cvd="okabe"` as the default** (safe
  for everyone, still colourful) with the classic LCARS hues one toggle away. Confirm the brand is
  OK with video going purple-pink and program going sky-blue.
- **Don't over-fork.** Resist per-editor colour overrides. The whole point is that **all 13+
  editors inherit Tier-2 tokens**; a module that hardcodes its own colour breaks every mode. Add a
  lint/grep CI check that fails on a raw `#hex` in `lcars.css` **or in any `src/editors/*/styles.ts`
  injected block**, and on `fillStyle`/`strokeStyle` string literals in `src/ui/**` and
  `src/editors/**`, once P2/P5 land. This is what stops the 40-file scatter from re-growing.

---

## 8. Appendix — sources

Colour vision & accessible UI:
- [Designing for Color Blindness — colorblind.io](https://colorblind.io/guides/designing-for-color-blindness)
- [Color Blindness Accessibility — Level Access](https://www.levelaccess.com/blog/color-blindness-accessibility-what-designers-need-to-know/)
- [Color blindness in user interfaces — UX Collective](https://uxdesign.cc/color-blindness-in-user-interfaces-66c27331b858)
- [Color Coding — Penn State Accessibility](https://accessibility.psu.edu/color/colorcoding/)
- [Investigating Color Blind UI Accessibility (arXiv)](https://arxiv.org/pdf/2401.10357)

Okabe-Ito / CVD-safe palettes:
- [Okabe-Ito hex reference](https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference)
- [Okabe-Ito guide — Vizcept](https://vizcept.com/blog/okabe-ito-palette-guide)
- [Coloring for Colorblindness — David Nichols](https://davidmathlogic.com/colorblind/)

Design-token engines & CSS theming:
- [Color tokens: light & dark modes (Bootcamp)](https://medium.com/design-bootcamp/color-tokens-guide-to-light-and-dark-modes-in-design-systems-146ab33023ac)
- [Accessible Color Tokens for Enterprise Design Systems](https://www.aufaitux.com/blog/color-tokens-enterprise-design-systems-best-practices/)
- [prefers-contrast — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-contrast)
- [forced-colors — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors)
- [Windows High Contrast & CSS Custom Properties — Smashing Magazine](https://www.smashingmagazine.com/2022/03/windows-high-contrast-colors-mode-css-custom-properties/)
