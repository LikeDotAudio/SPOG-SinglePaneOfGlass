# Audit — Chirality (Handedness) as the Heart of Touchscreen UX

**Companion to:** `Signal-Conditioner-Row-Design-Audit.md`, `Graphics-Engine-Audit.md`, `Teleprompter-Source-Audit.md`, `General-Patch-Matrix-Routing-Audit.md`, `Production-Entities-People-Places-Things-Audit.md` (shares the "TwistRouting is a touchscreen console" premise).

**What this audits.** The **handedness (chirality)** of touchscreen interaction — the fact that a left-handed and a right-handed operator are *mirror images* at the glass, and that a serious touch UI is therefore a *chiral* object that should be flippable. It surveys the external evidence (thumb-zone ergonomics, hand/arm occlusion, handedness detection, and shipping ambidextrous UI patterns from Vogel & Balakrishnan, Baudisch, Samsung, Wacom, Microsoft, WCAG, and Material Design), then maps it onto TwistRouting — an LCARS routing console whose **SOURCES panel is pinned LEFT**, whose **DESTINATIONS run along the BOTTOM**, and whose core gesture is a **drag from a source node onto a destination twist**. Client identifiers stripped; technology and human factors only.

**The one-line thesis.** A touchscreen UI is **chiral**: it has a handedness baked into where controls sit and which way the hand reaches, and for ~10% of operators (plus the ~30% of right-handers who don't use their dominant hand) the *default* layout is the *wrong-handed mirror*. The reaching hand and forearm physically **occlude up to ~47%** of a tablet-sized display, always on the dominant-hand side, so **feedback, menus, and drag ghosts must be emitted to the non-occluded side — and that side flips with the hand.** The correct design is not "make it symmetric" (impossible — reach and occlusion are asymmetric) but **"make it mirrorable"**: one chirality axis, one toggle, a defined set of things that flip (controls, drawers, callouts, drag affordances) and things that don't (text, spatial-memory anchors, media transport icons).

---

## 0. The Critical Framing — Why a Touch UI Is a *Chiral* Object

A mouse cursor is a dimensionless point that approaches every target from nowhere and hides nothing. A **finger, thumb, or stylus is a physical limb** attached to an arm attached to a shoulder on one specific side of the body. That single fact makes touch interaction fundamentally asymmetric in three ways that a mouse UI never has to think about:

1. **Reach is asymmetric.** A right thumb sweeps a comfortable arc anchored at the bottom-right; the top-left is the "stretch" corner. For a left thumb the whole map mirrors.
2. **Occlusion is asymmetric.** The hand/arm sits *below and to the dominant side* of the contact point and covers everything there — so the "safe place to draw feedback" is the *non-dominant* side, which flips with handedness.
3. **Input accuracy is asymmetric.** Even *where the thumb lands* is systematically offset and curved by which hand holds the device — enough that you can detect handedness from the touch stream alone.

None of these are preferences or accessibility niceties. They are geometry and biomechanics. A UI that ignores them is silently optimised for one chirality — almost always **right-handed** — and is a mirror-wrong experience for the rest. The rest of this audit establishes each asymmetry from primary sources, then argues TwistRouting should treat handedness as a **first-class, toggleable layout axis**, exactly the way a prompt head treats mirror-mode as a per-consumer render flag (`Teleprompter-Source-Audit.md` §1A).

---

## 1. The Population & The Grip — Who Is Actually At The Glass

The naïve number is "~10% left-handed, ignore it." The real distribution is worse for a single fixed layout, because *dominant hand ≠ operating hand*.

| Fact | Value | Source |
|---|---|---|
| Right-handed (survey) | **90%** | Nelavelli & Ploetz 2018 (arXiv:1805.08367) |
| Use phone with their **dominant** hand | only **70%** — the other 30% operate with the **non-dominant** hand | Nelavelli & Ploetz 2018 |
| Most-frequent grip = **one-handed** (single thumb) | **68%** | Nelavelli & Ploetz 2018 |
| Two-handed grip (both thumbs) | **30%** | Nelavelli & Ploetz 2018 |

**Consequence.** Even in a right-hander-dominated population, roughly **30% of sessions are driven by a non-dominant / left-operating hand** at any moment (left-handers + right-handers holding a coffee, a rail, a document, or a phone in the other hand). "Handedness" at the glass is therefore a *momentary grip state*, not a fixed biographical fact — which is exactly why detection (§3) and a quick toggle both matter. A prompter operator standing at a wall console with a script in one hand is the broadcast analogue.

**Confidence: high** (single primary source, unanimous 3-0, but a modest descriptive survey — grip stats are stable and non-extraordinary).

---

## 2. Thumb Zones & Input Accuracy — The Reach Map Is Chiral

For **one-handed thumb** use the screen is not uniform. Park & Han's 40-subject study (75 touch-key designs) found:

- **Input accuracy varies by region:** for a **right-handed** thumb the **LEFT part of the screen is accurate** while the **BOTTOM-EDGE regions are inaccurate** — a directly chirality-relevant asymmetry that mirrors for the left thumb (Park & Han 2010, *Int. J. Industrial Ergonomics*, S0169814110000806).
- **Size AND location jointly determine accuracy:** success rate rises with target size, and each size has its own identifiable **"accurate region"** — a 9 mm key can hit ~90% in the reachable corner and far worse in the stretch corner (Park & Han 2010; corroborated by Parhi et al., MobileHCI 2006, ~9.2 mm discrete / 9.6 mm serial thresholds).

This is the empirical spine under the popular **thumb-zone / reachability maps** (Hoober, Hurff): a comfortable green arc anchored at the holding hand's bottom corner, a yellow stretch band, and a red "ow" corner diagonally opposite — a map that is **mirror-symmetric about the vertical axis under handedness**. Put the most frequent, most important actions in the reachable corner; the corner is bottom-**right** for a right thumb and bottom-**left** for a left thumb.

**Design rule:** important/frequent controls belong in the dominant-thumb reachable corner and **mirror to the opposite corner when the operating hand changes**; targets in the stretch/opposite region must be made larger to compensate.

**Confidence: high** (primary peer-reviewed ergonomics, one 2-1 vote on the mirror extrapolation which the claim itself hedges with "would"; thumb biomechanics are stable so 2010 age is not disqualifying).

---

## 3. Handedness Is *Detectable* From The Touch Stream Alone

You do not need a gyroscope, an accelerometer, or a settings prompt to know which hand is driving. The gesture geometry gives it away:

- **Swipe curvature.** Model a swipe as a quadratic `x = A + By + Cy²`. Because the thumb is hinged at one side with limited lateral range, **left-thumb and right-thumb swipes curve in opposite directions**; the **sign of the curvature coefficient C** classifies the hand, consistent for **99.53%** of collected swipe points and 194/196 test swipes across 12 users (Nelavelli & Ploetz 2018, arXiv:1805.08367).
- **Scroll arcs + touch offset.** Scroll traces form an **arc that points to the holding side**, and a user's **horizontal touch offset from a button's center** is a strong handedness indicator (Matínez-Fernández / PeerJ CS 2021, PMC8093950, n=174).
- **Accuracy from touch data only.** A PART decision tree reached **99.92%** handedness accuracy after 7 scroll actions, and **98.16% after a single scroll** — using *only* touchscreen data, no internal sensors, beating prior sensor-based work (PMC8093950).

So handedness can be inferred *implicitly and fast* from ordinary interaction. Vogel & Balakrishnan's occlusion model uses an even cheaper heuristic: **if the contact point `p′` is left of a reference center `c′`, the user is right-handed, else left-handed**, and the whole occlusion model is simply **"flipped"** for left-handers (Occlusion-Aware Interfaces, CHI 2010).

**Caveat worth stating in-product:** these detectors read the **currently-interacting hand / grip**, not inherent dominance — which, per §1, is exactly the signal a handedness-adaptive UI wants. Sample sizes are modest (12–174 users, few left-handers) and one is an arXiv preprint, so treat auto-detect as a *suggestion that seeds a visible, overridable toggle*, never as a silent irreversible layout flip.

**Confidence: high** (three primary sources agree on the phenomenon; medium on the exact accuracy numbers generalising beyond single lab datasets).

---

## 4. Hand Occlusion — The Core of the Problem (Vogel & Balakrishnan, Baudisch)

This is the deepest, best-evidenced part of the literature and the part most directly load-bearing for a **drag-based** console.

### 4A. How much, and where
- **How much:** with tablet-sized direct pen input the **pen, hand, and forearm occlude up to 47% of a 12-inch display** — a grip-dependent maximum, not a mean (Vogel, Cudmore, Casiez, Balakrishnan, Keliher, "Hand occlusion with tablet-sized direct pen input," CHI 2009, DOI 10.1145/1518701.1518787).
- **Where:** for a **right-handed** user the occluded region sits **below and to the right (South-East)** of the contact point — modeled geometrically as a scalable circle over the fist plus a pivoting rectangle for the forearm. The rule of thumb: **"avoid the area South-East of the cursor for right-handed users,"** and the model is **flipped** for left-handers (Vogel & Balakrishnan, "Occlusion-Aware Interfaces," CHI 2010; DGP Toronto).

### 4B. What occlusion breaks
Occlusion is **empirically linked** (the authors hedge "likely," but their own studies substantiate) to **errors, fatigue, inefficient movements, and impeded performance** — problems that simply **do not exist with a mouse** (CHI 2010). Concretely observed:
- **Missed status messages** hidden under the hand.
- **Missed real-time previews** occluded by a formatting toolbar / the hand.
- **Inefficient dragging:** users make **movement deviations past or away from the target** when dragging **left-to-right into the occluded direction** — i.e., a right-hander dragging *toward* the destination overshoots because the destination is under their own arm (CHI 2009 / CHI 2010).

### 4C. The "fat finger" is really an occlusion problem
Unaided finger touch on small targets fails **not primarily from poor motor accuracy** but from **occlusion of the target by the finger plus an ambiguous selection point** — so accuracy-enhancing techniques *alone* don't fix it; **the target must be shown in a non-occluded location** (Vogel & Baudisch, "Shift," CHI 2007). Error rates hit **81% (fingertip) / 63% (fingernail)** on the smallest targets, making plain touch unreliable at small sizes (Shift, CHI 2007).

### 4D. The fix is always "emit to the non-occluded side, and flip it by hand"
Every mitigation in this literature is the *same move*: relocate feedback to where the hand isn't, and mirror that placement under handedness.

| Technique | Placement rule | Handedness behaviour | Result |
|---|---|---|---|
| **Shift** callout (CHI 2007) | Copy the occluded area into a callout **~22 mm above** the touch point (Offset-Cursor strategy); near the top edge, place **to the left, then right** | Placement **reversed for left-handers** via handedness detection | Clears the hand for most postures |
| **Occlusion-Aware Viewer** (CHI 2010) | Six candidate callout directions **(W, SW, S, N, NE, W)** | Directions **flipped for left-handers** | Task time **−23%** when the value was in an often-occluded position |
| **Occlusion-Aware Dragging** (CHI 2010) | Show the area **in front of the cursor** in a non-occluded callout when dragging into an occluded zone | Model flipped by handedness | Removes the drag overshoot of §4B |

**Confidence: high** (multiple foundational, heavily-cited, unanimous primary sources; occlusion geometry is anatomical, not time-sensitive).

---

## 5. Shipping Ambidextrous / Mirrorable Patterns (The Prior Art Works)

Handedness-adaptive UI is not theoretical — real products ship it, and they converge on the same primitives.

| Product / spec | Mechanism | What it teaches |
|---|---|---|
| **Microsoft "Enhanced on-object context menus"** (US7058902B2) | System determines handedness; places the on-object menu **on the opposite side from the resting hand** — **left of the touch point for right-handers, right for left-handers** — so the hand never obscures the menu | Context menus are a **solved, flippable** placement problem; side is a function of handedness |
| **Vogel occlusion menus / Hancock & Booth** | Occlusion-aware menu placement; left/right handers show **mirrored** selection patterns | Menus should *adapt*, not sit at a fixed offset |
| **Samsung One-Handed Mode** (Galaxy) | **Scales the whole screen down** into a bottom corner; swipe down center-bottom / double-tap home to invoke; **tap the white arrow to switch which side** it docks to | Ships a **user-chosen side** for left/right reach — an explicit toggle, not auto-only |
| **Wacom Cintiq 13HD** (left-handed setup) | Left-handed support = **rotate the whole device 180°**, relocating hardware ExpressKeys left→right; OS set to "Landscape Flipped" / 180° | Sometimes the honest answer is a **full mirror/flip of the surface**, not per-control remapping |
| **iPadOS / floating keyboard, Android reachability** | Movable/dockable input; reachability pull-down | Reach is treated as adjustable per session |

### The one thing you must NOT mirror: text and directional semantics
Mirroring is **not** RTL. Material Design's bidirectionality guidance draws the exact line the chirality toggle must respect:
- **Mirror:** directional icons (arrows), **back/forward** navigation (the "most important icons for mirroring"), and navigation buttons shown in **reverse order**.
- **Do NOT mirror / reverse:** **text stays readable** and is re-aligned, not reversed ("*Don't: LTR text shouldn't be displayed in reverse order*"); and clocks, **media-playback transport**, and progress indicators keep their real-world direction (Material Design, Bidirectionality).

So a handedness flip moves *controls, drawers, callouts, and affordances* — it never mirrors labels, waveforms, timelines, or a play/pause glyph.

**Confidence: high** for the individual product behaviours (primary manufacturer/patent/spec docs); medium that any *one* pattern is the universally-best choice.

---

## 6. Big Screens — Wall Consoles & Desks, Not Just Phones

TwistRouting is a **console**, so the standing/desk-operator case matters as much as the thumb case.

- **Reach envelope, not thumb arc.** At a wall or large desk touchscreen the constraint becomes shoulder/arm reach and standing position. A right-handed operator standing centred reaches comfortably to the **right and center-low**; the **far upper-left is the stretch**; and their arm **occludes the lower-right** of whatever they touch — the same South-East occlusion as §4, scaled up to a forearm across a 32–55" panel. A left-hander mirrors: reach favours the left, occlusion falls **South-West**.
- **Bimanual use.** Large surfaces invite two-handed operation (non-dominant hand frames/holds context, dominant hand acts). Primary controls belong on the **dominant-hand side**; the non-dominant hand takes the persistent/anchoring role.
- **Target size floors (chirality-independent but essential).** **WCAG 2.2 SC 2.5.8 (AA)** requires pointer targets **≥ 24×24 CSS px** unless one of five exceptions applies (Spacing, Equivalent, Inline, User-Agent-Control, Essential) (W3C Understanding 2.5.8). Ergonomics pushes higher: **≥ 9–9.6 mm** physical for reliable one-handed thumb hits (Park & Han 2010; Parhi 2006), and larger still in the stretch region and on wall panels at arm's length. ISO 9241 (ergonomics of human-system interaction, incl. 9241-400/-9 input-device and 9241-960 gesture guidance) is the standards umbrella for reach ranges and target ergonomics on such surfaces.
- **Where the operator stands is itself a chirality signal.** On a shared console, a right-handed operator drifts to stand slightly *left of* a target zone so their right arm sweeps in without crossing the body; a left-hander drifts right. A mirrorable layout lets each operator keep the acting hand *outboard* (away from body center), which is less fatiguing and less occluding.

**Confidence: high** for the WCAG/target-size facts (authoritative spec); medium for the standing/reach specifics (extrapolated from the pen/thumb occlusion geometry + ISO framing rather than a single console-specific study).

---

## 7. A Chirality Decision Framework (What Flips, What Doesn't)

Synthesising §§1–6 into a reusable rule set:

**Detect vs. toggle:** offer **both**. Seed from cheap implicit detection (§3: swipe-curvature sign / contact-point-vs-center), but *never* silently re-lay-out. Surface a **visible, sticky, one-tap handedness toggle** (the Samsung lesson). Detection *suggests*; the toggle *decides* and persists. This respects the §1 fact that the operating hand is a momentary grip state.

**What MIRRORS (flips across the vertical axis on handedness change):**
- Primary/frequent **controls and action buttons** → move to the dominant-thumb/dominant-hand reachable corner (§2, §4-Nelavelli).
- **Edge drawers / panels** (source lists, tool rails) → dock to the dominant-hand edge or its opposite per the occlusion rule (§5 Samsung/Wacom).
- **Context menus & popovers** → open on the **non-occluded side** of the contact point: left-of-touch for right-handers, right-of-touch for left-handers (§4D, §5 Microsoft patent).
- **Callouts / previews / status feedback / drag ghosts** → emit into the non-occluded quadrant (avoid SE for right, SW for left), flipped by hand (§4D six-direction set).
- **Animation origin/direction** for drawers and reveals → slide from the dominant-hand edge; flip with it.

**What STAYS FIXED (never mirrors):**
- **Text** — labels, values, script/prompter copy stay LTR and re-aligned, never reversed (§5 Material).
- **Real-world-directional glyphs** — clocks, **media transport** (play →), timelines, meters/waveforms, progress (§5 Material).
- **Spatial-memory anchors** — do not flip layout *mid-task* or on every gesture; flipping is a deliberate mode change, because muscle/spatial memory is a feature. Auto-flip thrash is a top pitfall.
- **Iconography meaning** — mirror a *directional* arrow, but never mirror an icon whose flipped form means something else or reads as broken.

**Pitfalls (the failure modes to design against):**
1. **Mirroring text or transport icons** → instant "broken/foreign UI" read.
2. **Auto-flip thrash** → detection firing on a two-handed or ambiguous grip and re-laying-out mid-drag; gate behind an explicit toggle + hysteresis.
3. **Breaking spatial memory** → operators memorise where things are; a chirality flip must be rare, global, and announced, not per-gesture.
4. **Assuming dominance = operating hand** (§1) → detect the *grip*, honour the *toggle*.
5. **Symmetric-but-cramped compromise** → don't center everything to "please both"; that abandons the reachable corner for everyone. Mirror instead.

---

## 8. Applied — A Chirality Model for TwistRouting

### 8A. Where TwistRouting stands today (the chiral audit of the current layout)
Current layout (`src/ui/sources/panel.ts`, `src/ui/console/destinations.ts`, `src/ui/console/matrix.ts`, `src/platform/overlay.ts`):

```
   ┌──────────┬───────────────────────────────────────┐
   │ SOURCES  │                                        │
   │ (pinned  │            central MATRIX              │
   │  LEFT    │        (source × destination)          │
   │  edge)   │                                        │
   │  ▓ node ─┼──────────────drag──────────────▶ ▓     │   ← the core gesture
   │  ▓ node  │                                        │
   ├──────────┴───────────────────────────────────────┤
   │  DESTINATIONS footer  (twists / drop targets)     │   ← drop zone along BOTTOM
   └───────────────────────────────────────────────────┘
        editor OVERLAYS (src/platform/overlay.ts) open full-screen
```

**The current layout is right-hander-hostile in exactly the ways §§2–4 predict:**

1. **Sources pinned LEFT + drag rightward = worst case for a right-hander.** The core gesture is **grab a node on the left edge and drag it right/down onto a footer twist**. That is a **left-to-right drag into the occluded direction** — precisely the movement Vogel & Balakrishnan measured as producing **overshoot/deviation** because the right arm covers the destination (§4B). A right-hander literally **drags their signal node under their own forearm** and drops it on a footer target their arm is covering. The left-pinned panel actually favours a **left-handed** reach (short pull inboard), while the drop target (bottom + wherever) is occluded for the right-hander doing the long cross-body drag.
2. **DESTINATIONS on the BOTTOM = the least-accurate band.** Park & Han found the **bottom edge is the inaccurate region** for one-handed thumb use (§2); on a wall console the footer is also where the forearm rests across it. The most-committed action (the drop) lands in the worst zone.
3. **Editor overlays are full-screen and centered** (`overlay.ts` topbar with a left "back" and right "close") — the close button top-right is a stretch/occluded corner for a right-hander leaning in from the right.
4. **No handedness concept exists** anywhere in the UI or model. The layout is silently single-chirality.

### 8B. The proposed "Chirality" model
Introduce **one handedness axis** to the console — a single global `chirality: 'right' | 'left'` state — modelled the way `Teleprompter-Source-Audit.md` models mirror-mode: a **flag that flips placement, not content**.

**The toggle.** A persistent LCARS control (footer corner + a settings entry), seeded once by cheap implicit detection (swipe-curvature sign / contact-point-vs-center per §3) shown as a *suggestion toast* ("Looks like you're left-handed — flip console?"), never auto-applied. Persist per operator (tie to the auth/user model — `src/ui/console/auth-panel.ts`). Flip is **global and deliberate**, animated once, so spatial memory re-forms cleanly (§7 pitfall 3).

**What flips in TwistRouting (the mirror set):**

| Element | Right-handed (default) | Left-handed (mirror) | Rationale |
|---|---|---|---|
| **SOURCES panel** (`sources/panel.ts`) | pin **RIGHT** edge | pin **LEFT** edge | Put the panel under the *dominant* hand so the drag goes **outboard/short**, not cross-body under the arm (§4B, §5). *(Yes — the sources panel should be mirrorable; and its default should arguably move RIGHT for the right-hander majority.)* |
| **Drag direction** | source(right) → twist, arm stays outboard | source(left) → twist | Eliminates the left-to-right drag-into-occlusion overshoot (§4B) |
| **Drag ghost / drop preview** (`sources/interact.ts`) | render ghost **to the LEFT / above** the finger (non-occluded, NW/SW) | render **to the RIGHT / above** | Occlusion-aware dragging callout: show the area *ahead of the cursor* off the occluded side (§4D) |
| **Context menus / node popovers** | open **left** of touch | open **right** of touch | Microsoft on-object-menu rule (§5) |
| **Editor overlay controls** (`overlay.ts`) | primary actions + close on the **dominant (right)** reachable side; keep destructive away from the resting arm | mirror to left | Reach corner + occlusion (§2, §4) |
| **Drawer/reveal animation origin** | slide from dominant edge | mirror | §7 |

**What does NOT flip (fixed set):**

- The **MATRIX grid** semantics and axis labels (`matrix.ts`) — text and the source×destination mapping stay put; mirroring rows/cols would destroy spatial memory and the mental model. (You *may* mirror which *edge* the axis headers hug, but not the data order.)
- **DESTINATIONS footer content/order** — twists keep identity and order; the footer stays a footer (moving it would be a bigger redesign — see note). Only the *drop-feedback callouts* obey chirality.
- **Text**: source names, twist labels, Captain's-Log, prompter copy — all LTR, never reversed (§5 Material).
- **Directional glyphs**: clock (`clock.ts`), any transport, meters/scopes, DNA-helix animation direction — real-world semantics, fixed (§5).
- **LCARS chrome identity** — the elbow/curve language is brand; flip layout *positions*, not the visual language into a broken mirror.

**One optional deeper move (flag for discussion):** because DESTINATIONS-on-bottom is the low-accuracy, arm-occluded band (§2, §4B, §8A-2), the highest-leverage *non-chirality* fix is orthogonal — consider a mode where the **destinations rail can dock to the dominant-hand vertical edge opposite the sources**, turning the core gesture into a **short horizontal outboard drag between two side rails** instead of a long cross-body drag to the floor. That is the Wacom "flip the whole surface" lesson (§5) applied to the console: at that point chirality just swaps which rail is sources and which is destinations.

### 8C. Build path (phased, leverage-ordered)
| Phase | Build | Maps to |
|---|---|---|
| **X1** | Add global `chirality` state + a visible, sticky **handedness toggle** (seed default = right); thread into `src/app/context.ts` | §3, §5 Samsung, §7 |
| **X1** | Mirror the **SOURCES panel** dock edge (`sources/panel.ts`) and **drag-ghost side** (`sources/interact.ts`) off the flag — the two highest-occlusion wins | §4B/§4D, §8B |
| **X2** | Flip **context menus / node popovers** and **editor-overlay primary/close placement** (`overlay.ts`) to the non-occluded side | §4D, §5 patent |
| **X2** | Persist chirality per operator via the auth/user model; add the **implicit-detection suggestion toast** (curvature-sign heuristic) — suggest only, never auto-apply | §3, §1 |
| **X3** | Enforce **target-size floors** (≥24 CSS px / ≥9.6 mm on console) on twists & nodes; enlarge stretch-region targets | §6 WCAG 2.5.8, Park & Han |
| **X3** | (Optional/bigger) **dockable destinations rail** to the opposite vertical edge — the two-rail short-drag layout | §8B note, §5 Wacom |

---

## 9. Bottom Line

- **A touch console is a chiral object.** Reach, occlusion, and even landing accuracy are all mirror-asymmetric about the vertical axis, and ~30% of sessions are driven by a non-dominant/left hand even in a right-hander-heavy population (§1). Designing "symmetric" is impossible; designing **mirrorable** is the correct move.
- **Occlusion is the physics that decides everything.** The hand/arm covers **up to 47%** of a tablet, always South-East for a right-hander (South-West for a left-hander); feedback, menus, and drag ghosts must be emitted to the **non-occluded side, flipped by hand** (§4, Vogel & Balakrishnan; Baudisch Shift). This is a solved problem in the literature and in shipping products (Microsoft menus, Samsung mode, Wacom flip).
- **TwistRouting's current layout is right-hander-hostile.** Sources pinned LEFT + a left-to-right drag onto a BOTTOM footer is the exact overshoot-and-occlude case the research warns against — the operator drags a node under their own arm onto a target their forearm covers, in the screen's least-accurate band (§8A).
- **The fix is one chirality axis:** a seeded-but-explicit handedness **toggle** that mirrors the **sources panel edge, drag direction, drag ghosts, context menus, and editor controls**, while keeping **text, matrix data order, transport/clock glyphs, and LCARS identity fixed** (§7, §8B). Highest leverage first: flip the sources dock and the drag-ghost side.
- **Standards-clean:** target sizes obey **WCAG 2.2 SC 2.5.8 (≥24×24 CSS px)** and ergonomic ≥9.6 mm floors on the console, under the **ISO 9241** ergonomics umbrella (§6).

> **One sentence:** TwistRouting should stop being a silently right-handed console and become a **flippable** one — a single handedness toggle that mirrors *where the hand reaches and what the hand occludes* (sources rail, drag direction, ghosts, menus, editor controls) while never mirroring *what the eye reads* (text, matrix order, transport, LCARS) — turning the drag-a-source-onto-a-twist gesture from a cross-body reach under your own arm into a short, unoccluded, dominant-hand move for **every** operator, left or right.

---

## Sources

1. Martínez-Fernández et al., "Implicit detection of user handedness in touchscreen devices through interaction analysis," *PeerJ Computer Science* 2021 — PMC8093950. https://pmc.ncbi.nlm.nih.gov/articles/PMC8093950/
2. Nelavelli & Ploetz, "Adaptive App Design by Detecting Handedness," 2018 — arXiv:1805.08367. https://arxiv.org/pdf/1805.08367
3. Park & Han, "One-handed thumb interaction of mobile devices from the input accuracy perspective," *Int. J. Industrial Ergonomics* 2010 — S0169814110000806. https://www.sciencedirect.com/science/article/abs/pii/S0169814110000806
4. Vogel, Cudmore, Casiez, Balakrishnan, Keliher, "Hand occlusion with tablet-sized direct pen input," *CHI 2009* — DOI 10.1145/1518701.1518787. https://dl.acm.org/doi/10.1145/1518701.1518787
5. Vogel & Balakrishnan, "Occlusion-Aware Interfaces," *CHI 2010* — DGP Toronto. https://www.dgp.toronto.edu/~ravin/papers/chi2010_occlusionawareinterfaces.pdf
6. Vogel & Baudisch, "Shift: A Technique for Operating Pen-Based Interfaces Using Touch," *CHI 2007*. https://www.patrickbaudisch.com/publications/2007-Vogel-CHI07-Shift.pdf
7. Microsoft, "Enhanced on-object context menus," US Patent 7,058,902 B2. https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7058902
8. Samsung, "How to use One-Handed Mode and One Hand Operation +." https://www.samsung.com/uk/support/mobile-devices/how-to-use-one-handed-mode-and-one-hand-operation-plus/
9. Wacom Support, "I'm left-handed — how do I change my Cintiq 13HD…ExpressKeys on the right side." https://support.wacom.com/hc/en-us/articles/1500006336602
10. W3C, "Understanding SC 2.5.8: Target Size (Minimum) (Level AA)," WCAG 2.2. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
11. Material Design, "Usability — Bidirectionality." https://material.io/archive/guidelines/usability/bidirectionality.html
12. (Corroborating) Parhi, Karlson, Bederson, "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices," *MobileHCI 2006*.
