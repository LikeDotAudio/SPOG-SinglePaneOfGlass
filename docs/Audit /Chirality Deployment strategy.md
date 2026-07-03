# Chirality Deployment Strategy — Making LCARS *Swing Both Ways*

**Companion to:** `Chirality.md` (the evidence base — read it first). This document is the **build strategy + style guide**: how to turn every LCARS element in TwistRouting into a *mirrorable* object driven by a single left/right switch, and the standing rules that keep it that way.

**The mandate.** One control — *"I'm left-handed" / "I'm right-handed"* — and the **entire console reflects**: rails swap edges, elbows curl the other way, drag ghosts and menus emit off the other side, editor chrome flips — while **text, data order, meters, transport and clock stay upright and readable**. Chirality becomes a *continuous framework*, not a one-off feature: from here on, **every new LCARS element is authored to swing both ways by construction.**

**The one-line engineering thesis.** A console with a controlled DOM and no third-party embeds should mirror by **reflecting the geometry layer and counter-flipping the content leaves** — a `scaleX(-1)` on the skeleton, a `scaleX(-1)` back on anything the eye must read — governed by a small token + class contract so the ~60 hard-coded `left/right` declarations mostly *stop mattering* instead of each needing a rewrite.

---

## 0. What We Learned (the findings that drive every decision here)

Re-reading `Chirality.md`, five findings are load-bearing for this strategy:

1. **Occlusion is the physics (§4).** The hand/arm covers up to **47%** of a tablet, always **South-East** for a right-hander (**South-West** for a left-hander). Feedback, menus, and drag ghosts must be emitted to the **non-occluded side — and that side flips with the hand.** → *The framework must expose the occluded quadrant as a first-class, flippable value.*
2. **Reach + accuracy are chiral (§2).** The reachable corner is bottom-dominant-side; the bottom edge and the opposite corner are the inaccurate/stretch zones. → *Primary controls belong in the dominant reachable corner and must mirror; stretch-zone targets must grow.*
3. **TwistRouting today is right-hander-hostile (§8A).** Sources pinned **LEFT** + a **left→right drag** onto a **BOTTOM** footer is the exact overshoot-and-occlude case — the operator drags a node *under their own forearm* onto a target their arm covers, in the screen's least-accurate band. → *The sources rail edge and the drag direction are the two highest-leverage flips.*
4. **Mirror ≠ RTL (§5, §7).** Flip *controls, drawers, callouts, affordances, directional glyphs*. **Never** flip *text, matrix data order, media transport, clocks, meters, spatial-memory anchors, or brand iconography meaning.* → *The framework needs an explicit "fixed set" that is reflection-immune.*
5. **Detect, but decide by toggle (§3, §7).** Handedness is inferrable from swipe-curvature sign, but the operating hand is a *momentary grip state*. → *Detection seeds a suggestion; a visible, sticky, per-operator toggle decides and persists. Flips are deliberate, global, animated once — never per-gesture thrash.*

Everything below is the mechanical realisation of those five.

---

## 1. Mechanism Selection — How Do We Actually Flip?

Three candidate engines were considered. TwistRouting picks a **hybrid with a clear primary**.

| Engine | How | Auto-mirrors elbows & clip-paths? | Flips text (bad)? | Rewrite cost | Verdict |
|---|---|---|---|---|---|
| **A. CSS logical properties + `dir`** | Convert `left/right`→`inline-start/inline-end`; flip inline axis with `direction` | No (physical `border-left` elbows stay put) | Yes — `direction:rtl` reverses text; needs per-leaf counter-work | Rewrite all ~60 declarations **and** fight text bidi | Purist, but high cost + text footgun |
| **B. Geometry reflection (`scaleX(-1)`) + content counter-flip** | Reflect the skeleton; counter-flip (`scaleX(-1)`) every leaf the eye reads | **Yes — free.** Elbows, clip-paths, radii, spines all mirror automatically | No — content leaves are counter-flipped upright | Low: don't rewrite the 60; add ~1 boundary class + counter-flips | **PRIMARY** |
| **C. `--chir` sign token (+1/−1)** | JS/CSS read a `±1` scalar for computed offsets (drag ghost, popover side, animation origin) | N/A (for dynamic placement only) | No | Tiny | **Adjunct** to B for JS-driven placement |

### Decision: **B as the core engine, C for anything computed in JS, governed by a style-guide contract (§3). Logical properties become the *authoring habit* for new CSS (future-proofing), not a migration project.**

**Why B wins *for this codebase specifically*:**
- The genuinely hard-to-mirror parts are the **three elbow primitives** (super-pool `::before`, media-group elbow, and the two other `border-left`+`border-top`+left-radius blocks) and the **`.program-row::after` right spine**. Under logical properties these need hand-authored mirror shapes. Under a `scaleX(-1)` reflection **they mirror for free** — the border that was on the left is now on the right, the 40px bottom-**left** radius is now bottom-**right**, the elbow curls the other way. Zero shape code.
- The **six clip-paths** (V/A trapezoids, prompter hood, camera/control hexagon) are already vertically symmetric, so they survive reflection unchanged — *and* if we ever add an asymmetric one, reflection handles it.
- The DOM is **ours, end-to-end** — no ads, no iframes, no third-party widgets that would break under a parent transform. The classic `scaleX` footguns (text selection, third-party layout) are bounded and controlled here.
- The ~26 `left:` + ~16 `right:` absolute anchors **stop needing individual attention** — the parent reflection relocates them. We fix them opportunistically (or leave them), instead of a 60-site edit.

**The cost we accept (and mitigate in §5):** a reflected subtree renders text mirror-reversed until counter-flipped; box-shadow/gradient *directions* reverse; and hit-testing works but must be reasoned about. All are handled by the boundary-class contract.

---

## 2. The Single Switch — State, Attribute, Persistence

```
 detection (seed)          the decision              the render
 swipe-curvature  ──toast──▶  chirality toggle  ──▶  data-chirality="left|right"
 sign (interact)   suggest      (sticky, per-op)        on #app  ──▶  --chir + reflection
```

- **State.** One field on a small global UI store (new `src/app/ui-state.ts`, or fold into `context.ts`'s host): `chirality: 'right' | 'left'` (default `'right'` — the majority, per `Chirality.md` §1).
- **The DOM switch.** Set `data-chirality` on **`#app`** (the single boot root — `index.next.html` line 21). *Not* `<html>` (keeps the flip inside the app, and `#app` becomes the reflection's containing block for `position:fixed` overlays, which is exactly what we want).
- **The CSS token.** `#app[data-chirality="left"]` sets `--chir: -1` (default `--chir: 1`). Everything computed reads `--chir`; nothing hard-codes a side.
- **Persistence.** `localStorage['twist.chirality']` for the device default, **plus** per-operator on the auth/user model (`src/ui/console/auth-panel.ts`, `src/platform/auth.ts`) so a login restores the operator's hand. Device value seeds before auth resolves; operator value wins once known.
- **Seeding (suggest-only).** `src/ui/sources/interact.ts` already owns pointer/drag geometry — have it estimate swipe-curvature sign (`Chirality.md` §3) and, on a confident left-hand read against a right-set console, raise a **one-time suggestion toast** ("Looks like you're left-handed — flip the console?"). **Never auto-apply** (§0.5). Gate behind hysteresis so a two-handed grip doesn't nag.
- **The flip is a deliberate mode change.** Animate the reflection once (~200ms), globally, so spatial memory re-forms cleanly. Never flip mid-drag, never per-gesture.

**Toggle UI.** A persistent LCARS control: a hand glyph in the footer corner + an entry in settings. It reads and writes the store; the store writes the attribute; CSS does the rest.

---

## 3. The Style Guide — The Continuous Framework (author *everything* this way)

This is the contract. Every LCARS element, existing or new, is classified into exactly one of three chirality roles. **New code that doesn't declare its role is a bug.**

### 3.1 The three roles

| Role | Class | Behaviour under flip | Use for |
|---|---|---|---|
| **MIRROR** (default) | *(implicit — inherits the reflection)* | Position/geometry reflects across the vertical axis | Rails, panels, elbows, spines, footers-as-chrome, drawers, drag affordances, menu/popover **containers**, overlay chrome, animation origins |
| **FIXED** | `.chir-fixed` | Counter-flipped `scaleX(-1)` → renders upright & un-reversed | **Text**, labels, values, prompter copy, **meters/scopes**, waveforms, **matrix data cells**, transport/clock glyphs, DNA-helix, any raster/media, brand marks |
| **ANCHOR** | `.chir-anchor` | Reflection-immune position (does **not** move with the flip) | Elements whose *screen location* is spatial-memory-critical and must stay put even as chrome around them mirrors (rare — use sparingly; document each) |

> **The golden rule of the reflection: exactly one counter-flip.** A FIXED leaf gets *one* `scaleX(-1)`. Never nest a `.chir-fixed` inside another `.chir-fixed` (double-flip = re-mirrored = broken). Counter-flip at the **content-leaf boundary**, not at intermediate containers.

### 3.2 The base CSS (foundation — ships in C0)

```css
/* --- chirality engine ------------------------------------------------ */
#app                       { --chir: 1; }
#app[data-chirality="left"]{ --chir: -1; }

/* The geometry reflection: applied to the skeleton/shell, animated once. */
#app[data-chirality="left"] .chir-mirror-root {
  transform: scaleX(-1);
  transition: transform .2s ease;
}

/* Content leaves ride back upright. Because --chir is -1 only in left mode,
   this is identity in right mode and a counter-flip in left mode — so the
   SAME markup is correct in both, no per-mode class toggling in JS. */
.chir-fixed { transform: scaleX(var(--chir, 1)); }

/* Anchors opt out of the reflection entirely (re-flip, then translate is
   authored in logical terms). Use only with a documented reason. */
.chir-anchor { transform: scaleX(var(--chir, 1)); }
```

Apply `.chir-mirror-root` to the **shell skeleton** (the container holding the sources rail + matrix + footer + overlay layer). Tag content leaves `.chir-fixed`. That's the whole engine.

### 3.3 Authoring rules (the standing law)

1. **Never write physical `left`/`right` in *new* CSS.** Use logical properties (`inset-inline-start`, `margin-inline`, `padding-inline`, `border-inline-start`, `text-align: start`). Under the reflection they're already correct; and if we ever drop the reflection, the intent survives. *(A CI grep, §7, enforces this on new rules.)*
2. **Directional glyphs swap, they don't reflect.** A back-chevron `‹` must become `›`, not a mirror-image of `‹`. Use a `.chir-glyph` whose content is chosen from `--chir` (or swap textContent in JS). Same for any arrow that encodes navigation.
3. **JS-computed placement reads `--chir`.** Drag ghosts, popover/menu side, tooltip side, animation origin — compute `side = chir === 1 ? 'left-of-finger' : 'right-of-finger'` (emit to the **non-occluded** side, `Chirality.md` §4D). Never hard-code "left".
4. **Meters, waveforms, timelines, transport, clock, DNA-helix → `.chir-fixed`.** Real-world direction is semantic (§0.4). Play still points →.
5. **Matrix data order → FIXED.** You may mirror which *edge* axis-headers hug (chrome), but **never** reorder rows/columns — that destroys the mental model (`Chirality.md` §8B).
6. **Every new component declares its role in review.** PR template line: *"Chirality: which parts MIRROR, which are `.chir-fixed`, which (if any) `.chir-anchor` and why."*

### 3.4 The fixed set, enumerated for TwistRouting (tag these `.chir-fixed`)

`src/ui/console/clock.ts` (clock + PTP), any transport, `src/editors/meter-input/**` (meters/scopes), `src/editors/graphics-engine/**` waveform/preview canvases, the DNA-helix SVG in `destinations.ts`, all `.signal-node` **labels**, `.twist-title` text, matrix cell contents, Captain's-Log text, prompter copy (`src/editors/prompter`), and the LCARS wordmark/brand glyphs.

---

## 4. What Flips, Concretely (the TwistRouting mirror set)

Directly from `Chirality.md` §8B, now mapped to files and mechanism:

| Element | Right (default) | Left (mirror) | File(s) | Mechanism |
|---|---|---|---|---|
| **Sources rail** | docks **RIGHT** *(new default — dominant hand)* | docks **LEFT** | `sources/panel.ts`, `.ingress-panel` | reflection (edge swaps for free) |
| **Super-pool elbows** | left-curl | right-curl | `lcars.css` `.super-pool-container::*` | reflection (border/radius mirror free) |
| **Destination spine** | right spine | left spine | `.program-row::after` | reflection |
| **Drag direction** | source→twist outboard | mirror | `sources/interact.ts` | `--chir` |
| **Drag ghost / drop preview** | emit **NW/left** of finger | emit **NE/right** | `sources/interact.ts` | `--chir` (JS) |
| **Context menus / node popovers** | open **left** of touch | open **right** | wherever popovers mount | `--chir` (JS) |
| **Editor overlay chrome** | back/close + primary on dominant side; `border-radius:0 0 16px 44px` | mirror | `platform/overlay.ts` | reflection + `.chir-glyph` for `‹` |
| **Drawer/reveal animation origin** | from dominant edge | mirror | per-component | `--chir` |

**Fixed (do not flip):** matrix data order (`matrix.ts`), destinations footer twist identity/order (`destinations.ts` — only the *drop-feedback callouts* obey chirality), all text, clock/transport/meters/DNA-helix, LCARS brand language.

---

## 5. The Reflection Model — Gotchas & Discipline

`scaleX(-1)` is powerful but has sharp edges. The contract handles each:

| Gotcha | Effect | Mitigation |
|---|---|---|
| **Text renders mirror-reversed** | Unreadable | `.chir-fixed` on every text leaf (the counter-flip). This is the #1 rule. |
| **Double counter-flip** | Content re-mirrored (broken) | *Exactly one* counter-flip per leaf; never nest `.chir-fixed`. Lint for nesting. |
| **`position:fixed` overlays** | Fixed elements resolve against the transformed `#app`, not the viewport | Intended — keep the reflection root at `#app` so overlays flip *with* the console. |
| **Box-shadow / gradient direction** | A left→right sheen now runs right→left (e.g. `.signal-node::after` scanline) | Cosmetic; leave (sheen is direction-neutral) or express offset via `--chir`. |
| **Directional glyphs** | `‹` becomes a reversed `‹` (looks like `›` but is a flipped glyph — subtly wrong) | `.chir-glyph`: swap the actual character, don't rely on the reflection. |
| **Pointer/hit-testing** | Works (browser maps transformed geometry) but drag math in JS must use `getBoundingClientRect()` (post-transform), not manual left math | `interact.ts` already uses rects — keep it; never compute positions from raw `style.left`. |
| **Focus ring / caret** | Fine (caret is in a counter-flipped leaf) | No action. |
| **Nested transforms** (V/A `filter: drop-shadow`, `.gang-cell` transforms) | Compose correctly with the parent reflection | No action; verify in snapshot test. |

**Discipline in one line:** *reflect the shell, counter-flip the content, swap the glyphs, compute placement from `--chir`, and never measure position from `style.left`.*

---

## 6. Deployment Roadmap — Phased, Leverage-Ordered

Each phase is independently shippable and independently verifiable (§7). Ordered by occlusion-payoff-per-effort.

### C0 — Foundation *(no visible change in right mode)*
- Add `chirality` state + `data-chirality` on `#app` + `--chir` token + base engine CSS (§3.2) + the persistent toggle control + persistence (localStorage → auth).
- Add `.chir-fixed` to the enumerated fixed set (§3.4). Add `.chir-mirror-root` to the shell skeleton.
- **DoD:** toggling in right mode = identity; toggling to left reflects the shell; all text still reads correctly; no horizontal page scroll.
- **Files:** new `src/app/ui-state.ts`, `src/app/main.ts` (wire toggle + attribute), `lcars.css` (engine), `context.ts`/`auth.ts` (persist).

### C1 — Sources rail + drag ghost *(the highest occlusion win — `Chirality.md` §8A)*
- Sources rail edge flips via reflection; **change the default dock to RIGHT for right-handers.** Drag ghost + drop preview emit off the non-occluded side via `--chir` in `interact.ts`.
- Convert any physical `left/right` in `panel.ts`/`pools.ts` rail CSS to logical or let the reflection carry them; tag pool node **labels** `.chir-fixed` (V/A shapes are symmetric — no change).
- **DoD:** in both modes the drag goes *outboard/short* (not cross-body under the arm); ghost never sits under the finger; pool text upright.
- **Files:** `sources/panel.ts`, `sources/pools.ts`, `sources/interact.ts`, `lcars.css` super-pool block.

### C2 — Editor overlays + popovers
- Overlay topbar mirrors (`border-radius`, back/close positions) via reflection; the `‹` back arrow becomes `.chir-glyph`. Context menus / node popovers open on the non-occluded side via `--chir`.
- Editor primary actions + close land on the dominant reachable side.
- **DoD:** back/close reachable and un-occluded in both modes; `‹`/`›` correct (not flipped glyphs); popovers never under the hand.
- **Files:** `platform/overlay.ts`, any popover mount, editor `styles.ts` where controls are pinned.

### C3 — Matrix + destinations footer callouts
- Matrix **data order stays fixed**; only axis-header chrome edge + drop-feedback callouts obey chirality. Footer twist order/identity fixed; drop callouts flip.
- Tag matrix cells + DNA-helix `.chir-fixed`.
- **DoD:** identical routing/mental model in both modes; only feedback moved.
- **Files:** `console/matrix.ts`, `console/destinations.ts`.

### C4 — Detection seeding + per-operator memory
- Swipe-curvature-sign estimate in `interact.ts` → suggestion toast (suggest-only, hysteresis). Persist chirality per operator on the auth/user model; device default seeds pre-login.
- **DoD:** a confident left-hand read offers a flip once; accepting persists across logins; declining doesn't nag.
- **Files:** `sources/interact.ts`, `auth-panel.ts`, `platform/auth.ts`.

### C5 — Ergonomic floors + polish *(chirality-independent but part of "done")*
- Enforce **WCAG 2.2 SC 2.5.8** target floors (≥24×24 CSS px) on twists & nodes; enlarge stretch-region targets; audit contrast of the toggle.
- Optional bigger move (flag for discussion): a **dockable destinations rail** to the vertical edge opposite sources — turning the core gesture into a short two-rail outboard drag (`Chirality.md` §8B note). At that point chirality just swaps which rail is which.
- **DoD:** all interactive targets pass 2.5.8; stretch targets larger.

---

## 7. Verification & Governance (keeping it swinging)

**Dual-chirality snapshot harness** (extend the existing puppeteer setup used to verify People):
- Boot the app, snapshot **right**; set `data-chirality="left"`, snapshot **left**.
- Assert: (a) sources rail `getBoundingClientRect().left` swaps sides; (b) a known text node's rendered string is **not** reversed (OCR-free: compare `textContent` + check computed `transform` resolves to upright on `.chir-fixed`); (c) **no horizontal document overflow** in either mode; (d) the drag ghost mounts on the non-occluded side for a synthetic drag in each mode.
- Run in CI on any change under `src/ui/**`, `lcars.css`, `overlay.ts`.

**Lint gate (author-time law):** a grep check fails CI when a *new/changed* CSS rule under review introduces physical `left:`/`right:`/`margin-left`/`border-left`/`text-align:left` **outside** the three grandfathered elbow blocks. New code uses logical properties (§3.3.1).

**Review checklist (PR template):** *"Chirality role of each new element (MIRROR / `.chir-fixed` / `.chir-anchor`)? Any new directional glyph swapped, not reflected? Any JS placement computed from `--chir`, not a hard-coded side? Snapshot diff attached for both modes?"*

**Governance principle:** the reflection is a **backstop, not a license**. Author direction-agnostic (logical properties, `--chir`, glyph swaps) so the UI would *degrade gracefully* even without the reflection — the reflection then makes it pixel-perfect and free.

---

## 8. Make It So — the definition of done

TwistRouting *swings both ways* when:

1. **One switch** (`data-chirality` on `#app`, backed by a sticky per-operator toggle) reflects the whole console, animated once.
2. **The mirror set moves** — sources rail edge, elbows, spine, drag direction, drag ghosts, menus, overlay chrome, animation origins — and its **default sits on the dominant (right) hand**.
3. **The fixed set never moves or mirrors** — text, matrix data order, meters, transport, clock, DNA-helix, LCARS identity — enforced by `.chir-fixed` and the lint gate.
4. **Placement obeys occlusion** — feedback always emits to the non-occluded side, and that side flips with the hand (`--chir`).
5. **Detection suggests, the operator decides, the account remembers.**
6. **CI proves it** — dual-chirality snapshots pass, no horizontal overflow, text upright, and no new physical-direction CSS slips in.

> **One sentence:** make the console a *reflection* — flip the geometry with a single `scaleX(-1)` switch, ride the content back upright with one counter-flip, swap the few directional glyphs, compute every placement from a `±1` chirality sign, and lock text/data/transport/brand out of the mirror — so the drag-a-source-onto-a-twist gesture is a short, unoccluded, dominant-hand move for **every** operator, and every LCARS element we ever add is born ambidextrous.
