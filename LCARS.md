# LCARS Style Guide

The house rules for the LCARS ("okudagram") skin worn by SPOG. This is the design
contract for every panel, rail, elbow, button and window in the app. The live
implementation is [`lcars.css`](./lcars.css) (shared, never forked, by both the
`js/` build and the TypeScript `src/` build); the canonical palette data lives in
[`archive/lcars-styleguide.json`](./archive/lcars-styleguide.json).

---

## 1. The Corner Law

LCARS geometry is defined almost entirely by its rounded corners. Two rules govern
every corner in the system — follow them and a shape reads as LCARS; break them and
it reads as "a rounded rectangle".

### 1.1 Inside corner = ½ the outside corner

Every rounded shape has a chosen **outer radius `R`** (the big, convex, terminal
curve that faces open space). The matching **inner radius is always `R / 2`** — the
concave curve where the shape tucks back into the frame (an elbow's inside of the
bend).

```
        outer radius R                     R = 40px  →  inner = 20px
      ╭────────────────                    R = 30px  →  inner = 15px
      │                ╮  ← inner R/2       R = 16px  →  inner =  8px
      │      ╭─────────╯                    R = 12px  →  inner =  6px
      │      │
```

So an elbow with a `40px` outer curve turns its inner corner with `20px`. A pill
with a `16px` cap tucks its inner joins at `8px`. Never eyeball it — halve it.

### 1.2 Tops and bottoms are square — unless the shape is horizontal

A shape rounds only the corners that **terminate into open space**. The edges where
it butt-joins a neighbour stay **square (radius 0)** so panels tile seamlessly into
one continuous frame.

- **Vertical elements** (rails, spines, stacked column segments): the **top and
  bottom edges are square**. Only the outer *end* that terminates the stack rounds.
  Two stacked segments meet on a flat, square seam — no gap, no bump.
- **Horizontal elements** (bars, pills, header caps, the top rail of an elbow): the
  rule rotates 90°. The **left and right ends round**; the long top and bottom edges
  stay straight. A horizontal LCARS bar is a stadium/pill capped on its short ends.

> Rule of thumb: round the two corners on the **terminating end**, square the two on
> the **joining end**. Orientation just decides which end is which.

### 1.3 Mapping to CSS

`border-radius` takes its four values **top-left, top-right, bottom-right,
bottom-left**. Encode the law by writing `R` on the terminating corners, `R/2` on
the inner corners, and `0` on every square butt-join:

```css
/* Vertical rail terminating at its TOP-LEFT, tucking in bottom-right (R=40) */
.rail        { border-radius: 40px 0 0 0; }        /* only the terminal corner */
.rail-elbow  { border-radius: 40px 0 20px 0; }     /* inner corner = R/2 = 20px */

/* Horizontal bar: both right-hand ends capped (R=12), left edge butt-joins square */
.top-bar     { border-radius: 0 12px 12px 0; }

/* Stacked column segment: square top+bottom, no rounding until it terminates */
.segment     { border-radius: 0; }
```

The chirality engine mirrors these left↔right when `html[data-chirality]` flips (see
§4) — the law is orientation-relative, so a mirrored elbow keeps `R` on its (now
opposite-side) terminal corner and `R/2` on its inner corner.

### 1.4 Canonical radii in the codebase

| Element                         | Outer `R` | Inner `R/2` | Notes |
|---------------------------------|-----------|-------------|-------|
| Super-pool spine (open)         | 40px      | 20px        | the big category elbow |
| Super-pool spine (folded)       | 15px      | —           | tightened so the short block isn't a blob |
| Audio-mixer rail / master elbow | 44px      | 22px        | largest elbow in the app |
| Program title cap               | 30px      | 15px        | `.program-title` |
| Foldable header / pill          | 15px      | —           | pills terminate on both ends |
| Input-group / media bracket     | 8px       | —           | small nested brackets |

When adding a new element, pick `R` from this ladder (`44 / 40 / 30 / 16 / 15 / 12 /
8`) rather than inventing a value, then derive the inner corner as `R/2`.

---

## 2. Palette

Signal **category** is carried by colour *and* shape (shape is the accessible
fallback — see [`docs/Colours and shapes.md`](./docs/Colours%20and%20shapes.md)).
Components read **only** the Tier-2 semantic tokens; never hardcode a category hex.

| Token             | Default   | Meaning |
|-------------------|-----------|---------|
| `--sig-video`     | `#CC99CC` | video (violet / "Lilac") |
| `--sig-audio`     | `#FF9C63` | audio (orange / "Tomato") |
| `--sig-program`   | `#646DCC` | program (blue / "Blue Bell") |
| `--state-alarm`   | `#ff3b3b` | fault / red alert |
| `--state-ok`      | `#39d98a` | healthy |
| `--state-onair`   | `#ffaa00` | on-air / live |
| `--cyan`          | `#00ffff` | helix strand A / accent |
| `--magenta`       | `#ff00ff` | helix strand B / accent |

The full okudagram palette (Standard + ST:VIII / ST:X / com sets, ~90 named swatches
from *Okudagrams Color Complete Set v4.1*) is in
[`archive/lcars-styleguide.json`](./archive/lcars-styleguide.json). The Colour
Engine (`html[data-cvd]` / `[data-chroma]` / `[data-vision]`) re-points Tier-2 for
colour-blind, greyscale, mono-phosphor and high/low-contrast modes — so a compliant
component follows those modes for free.

---

## 3. Typography

- **Family:** `'Courier New', Consolas, monospace` for read-outs and okudagram
  labels; `Arial/Helvetica` only inside clock/analog faces.
- **Labels:** `font-weight: 800–900`, `text-transform: uppercase`,
  `letter-spacing: 1–3px`. Louder = more weight + more tracking, not bigger.
- **Numbers / codes:** LCARS panels carry a code label (e.g. `02-654598`) —
  monospace, right- or bottom-aligned inside the panel.

---

## 4. Chirality

Handedness is an axis: `html[data-chirality="right"]` (default) docks the SOURCES
rail on the dominant right edge; `"left"` is the classic left dock. Geometry that is
asymmetric (elbows, spines, caps) must provide a mirrored rule so the big `R` still
hugs the **outer** edge after the flip. **Never** mirror spatial canvases (scopes,
maps, diagrams) — tag them `.chir-exempt`. See the header of `lcars.css` and
`docs/Audit /Editor-Chirality-Audit.md`.

---

## 5. Motion

- Respect `prefers-reduced-motion` (already globally clamped in `lcars.css`).
- LCARS transitions are quick and mechanical (`.12s–.2s`), not eased-soft. Fold
  chevrons rotate `.2s`; the data-pulse strip blinks; nothing drifts slowly.

---

## 6. Checklist for a new component

1. Pick `R` from the radius ladder; set inner corners to `R/2`; square every
   butt-join edge (§1).
2. Round the **terminating** end per the element's orientation (§1.2).
3. Colour from Tier-2 tokens only; pair colour with a shape cue (§2).
4. Uppercase monospace label, 800–900 weight (§3).
5. Provide a mirrored rule if the geometry is asymmetric (§4).
6. Keep motion quick and honour reduced-motion (§5).
