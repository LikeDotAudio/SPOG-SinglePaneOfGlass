# DVE Makeover — a touch-first, direct-manipulation DVE editor

*Audit + proposal. Scope: `src/editors/vision-mixer/dve.ts` (the DVE editor drawer)
and its mount in `src/editors/vision-mixer/index.ts`. Front-end simulation only —
the transform math already tweens a CSS 3D pose onto the keyer PIP chip; this
proposal changes **how a human steers that pose**, not what it renders.*

---

## §0 · TL;DR

The DVE editor is a **row of seven native sliders and a numeric box**. It works
with a mouse and is actively hostile on a tablet: thin hit targets, no direct
manipulation of the picture, a browser `prompt()` for save, a native `<select>`
for recall, and a modal A/B toggle. You edit *numbers* and watch the result on a
tiny PIP chip parked on a monitor **somewhere else on the surface**. That is the
1981 joystick-and-keyframe console rebuilt as an HTML form.

The makeover: **make the picture the control.** Drop a WYSIWYG "DVE stage" into
the drawer — a 16:9 frame with the live picture chip in it — and put **handles on
the chip**: eight scale handles, a rotate ring, a move body, and a **crop frame**
(a genuine model gap today). Sliders survive only as an optional fine-tune tray.
Add a **fast touchpad grammar** — marquee-grab multiple handles, `Shift` to
constrain, `⌘/Ctrl` to duplicate a keyframe, corner-drag to scale-from-anchor —
so a preset that takes ~40 slider drags today is three gestures.

---

## §1 · What ships today

`buildDveEditor()` (`dve.ts:62`) renders one drawer:

| Control | Element | `dve.ts` |
|---|---|---|
| Preset recall | native `<select>` | `:67` |
| Edit A / Edit B | two toggle buttons (modal) | `:78` |
| POS X, POS Y, PUSH Z, SCALE, PITCH, YAW, ROLL | seven `<input type=range>` | `:85` |
| Duration | `<input type=number>` | `:97` |
| PLAY A→B | button | `:101` |
| SAVE AS… | button → **`window.prompt()`** | `:105–107` |
| RESET | button | `:116` |

The model it drives (`src/model/switcher.ts:18`):

```
DVEKeyframe = { x, y, z, scale, rotX, rotY, rotZ }   // 7 scalars. No crop.
DVEPreset   = { id, name, a: KF, b: KF, ms }          // two poses + a duration
```

The result is previewed by `poseToCss(poseAt(...))` (`dve.ts:34`) painted onto the
`.vm-pip` chip in the animation loop (`index.ts:878`) — i.e. **on the monitor, not
in the editor.** The editor and the thing it edits are in two different places.

---

## §2 · Why it is touch-hostile

**§2.1 — The sliders are the whole problem.** `.vm-range` (`styles.ts:130`) is a
bare native range input, `flex:1`, default track height (~4px thumb-catch on
tablet). Seven of them:

- **Thin hit target.** A finger is ~9mm; the thumb is a few px tall. You miss,
  you scrub the wrong axis, or you scroll the drawer instead.
- **No coarse/fine.** One pixel of travel on a 320px track spanning `-180…180`
  (`rotX/Y/Z`, `dve.ts:48`) is ~1.1° — you cannot land on `0` or `90` reliably
  with a fingertip. There is no modifier for precision.
- **Value is read-only.** `.vm-rangeval` is a `<span>` (`dve.ts:90`). You cannot
  type `90`; you can only drag toward it and hope.
- **Seven axes, one at a time.** Framing a corner PIP means dragging X, then Y,
  then SCALE, then maybe YAW — four sequential drags to express *one* spatial
  intent ("put it top-right, smaller, angled in") that a hand wants to do in one
  motion.

**§2.2 — No direct manipulation.** There are no handles anywhere. The picture you
are transforming lives on a `.vm-pip` chip over the PGM/PVW monitor
(`index.ts:861`), which may be scrolled off-screen relative to the drawer. Your
eyes ping-pong between the sliders you're touching and the result you're
watching. Every DVE tool a shooter has ever used — Photoshop free-transform, AE
layer handles, a switcher's DVE joystick — puts the grab **on the picture**.

**§2.3 — Modal A/B editing.** `editing: 'a' | 'b'` (`dve.ts:64`) is a hidden mode
toggled by two buttons (`:78`). The sliders silently repoint. On a small tablet
you lose track of which keyframe you're sculpting — there is no persistent "you
are editing B, A looks like this" cue. A→B is the entire point of a DVE move and
it is the least visible thing in the UI.

**§2.4 — Browser-chrome escape hatches.** SAVE AS is `window.prompt()`
(`dve.ts:107`); recall is a native `<select>` (`:67`); MS wants a keyboard
(`:97`). On a tablet these summon OS keyboards and native pickers that blow away
the LCARS surface and, for `prompt()`, are non-existent in some kiosk/PWA display
modes — the app is a PWA (`[[cache-prefs-audit]]`), so `prompt()` is a genuine
reliability risk, not just an aesthetic one.

**§2.5 — No crop, at all.** The user's ask — "crop and scale and handles like
Photoshop / After Effects" — exposes a real model gap. `DVEKeyframe` has scale
but **no source-crop rectangle** (`switcher.ts:18`). Real DVEs crop *then* scale
(you trim the input raster, then size/position the trimmed picture). Today you
can only shrink the whole frame; you cannot say "take the right two-thirds of
this camera and fly *that* into the corner." Every OTS/PIP look in the starter
library (`schema.ts:22`) would be tighter with crop.

---

## §3 · The makeover — a DVE stage with handles

Replace the slider stack with a **WYSIWYG DVE stage**: the same surface the WYSIWYG
editor (`src/editors/wysiwyg/view.ts`) already proves out, specialised for one
picture. Layout of the drawer becomes:

```
┌──────────────────────────────────────── DVE EDITOR ─────────┐
│  [ PRESET ▾ chips ]      ● KF-A  ○ KF-B      MS 400   ▶ PLAY │
│ ┌───────────────── 16:9 STAGE (the frame) ─────────────────┐ │
│ │   ┌───────────────┐            ·· A ghost (start pose) ·· │ │
│ │   ◉───────────────◉   ← 8 scale handles (corners+edges)   │ │
│ │   │   LIVE PIC     │   ← move body (drag anywhere inside)  │ │
│ │   │   ⟳ rotate ring│   ← drag ring = ROLL; corner+alt=3D  │ │
│ │   ◉───────────────◉                                        │ │
│ │        ▚ crop shade (dim = trimmed-away source)            │ │
│ └───────────────────────────────────────────────────────────┘ │
│  ▸ FINE TUNE (collapsible slider/numeric tray — unchanged math)│
└────────────────────────────────────────────────────────────────┘
```

**§3.1 — Handles map to the existing math, no model change for transform.** The
grabs write straight into the `DVEKeyframe` scalars `onPreview()` already consumes
(`dve.ts:88`, `index.ts:440`):

| Grab | Writes | Notes |
|---|---|---|
| Move body (drag inside) | `x`, `y` | 1:1 with the frame; the picture goes where the finger goes |
| Corner handle | `scale` (+ `x`,`y` to hold the opposite anchor) | proportional by default |
| Edge handle | non-uniform → **needs crop** (see §3.3) or aspect scale | |
| Rotate ring | `rotZ` (ROLL) | drag angle = roll |
| Ring + two-finger tilt / `Alt`-corner | `rotX`,`rotY` (PITCH/YAW) | 3D from the same handle set |
| Pinch | `scale` | native tablet gesture |
| Two-finger twist | `rotZ` | native tablet gesture |

The transform pipeline (`poseToCss`, `poseAt`, the RAF loop) is **untouched**. We
are only adding a second, spatial way to author the same seven numbers — the
sliders become the "fine tune" tray, kept for precision and accessibility.

**§3.2 — A→B becomes visible, not modal.** Draw **keyframe A as a translucent
ghost** and **B as the solid live chip** on the same stage (or vice-versa by which
pill is armed). Editing stays a pick — `● KF-A / ○ KF-B` — but now you *see* both
poses at once and the move between them is the arrow from ghost to solid. Drag the
ghost to reshape the start; drag the solid to reshape the end; PLAY sweeps between
them. This kills §2.3 outright.

**§3.3 — Crop: the one real feature add.** Extend the model minimally:

```ts
// src/model/switcher.ts
export interface DVECrop { l: number; r: number; t: number; b: number; } // 0..100 % trimmed per edge
export interface DVEKeyframe {
  x; y; z; scale; rotX; rotY; rotZ;
  crop?: DVECrop;   // optional → every existing preset & authored JSON stays valid
}
```

`crop` is optional, so `FULL` (`schema.ts:16`) and every authored production JSON
keep resolving unchanged (`resolveDef`, `schema.ts:90`). Render it as a CSS
`inset(...)` clip on the chip in `poseToCss` — a two-line addition, still pure
front-end sim. In the UI it is a **second, inset handle set** (dashed frame,
Photoshop marquee convention) with the trimmed-away source dimmed. Edge handles
in "crop mode" trim; edge handles in "transform mode" scale. One toggle in the
stage toolbar (`⤢ transform / ⛶ crop`), the AE convention.

---

## §4 · Fast touchpad grammar — grab many, edit fast

*(Per request: quick-grabbing multiple things, faster editing, better scaling,
Shift/⌘ modifiers, cropping — the touchpad workflow.)*

The point of a stage is not just prettier sliders — it's that a **hand can express
several axes in one motion** and a **flick can recall a preset**. The grammar:

**§4.1 — Marquee-grab multiple handles / multiple keyers.** Drag an empty patch of
the stage to rubber-band select. Catch several handles (scale all corners at once
= uniform frame resize) or, when several keyers are armed (`me().keyers`,
`index.ts:862`), catch **several PIP chips** and transform them as a group. Quad-
split (`schema.ts:41`) becomes: marquee all four, pinch, done — instead of four
presets × seven sliders. A live selection count sits in the toolbar; nothing is
"selected" invisibly.

**§4.2 — Modifier grammar (mouse *and* touch equivalents).** Consistent, learnable,
each modifier is *one* rule everywhere:

| Modifier | On a scale drag | On a move drag | On rotate |
|---|---|---|---|
| *(none)* | proportional from opposite corner | free | free |
| **`Shift`** | lock aspect ratio | constrain to H/V/45° axis | snap 15° |
| **`Alt`/`Opt`** | scale from **center** | duplicate-drag (leave a copy) | — |
| **`⌘`/`Ctrl`** | snap to grid / thirds / edges | snap to safe-area & frame edges | snap to 0/90/180 |

Touch equivalents where there's no keyboard: a **long-press mode ring** (radial
menu at the finger — "aspect · center · snap") and **two-finger = center-scale**,
so a bare tablet never needs a keyboard. `Shift`-to-constrain and `⌘`-to-snap are
the two that matter most for landing clean framings fast.

**§4.3 — Better scaling: anchors + snap targets.** Scaling today drifts because
`scale` alone shrinks about the frame center while `x/y` stay put, so the picture
appears to *slide* as it shrinks. On the stage, a corner drag **holds the opposite
corner fixed** (writes `scale` *and* compensating `x/y`) — the Photoshop
invariant. Snap targets: frame edges, center, rule-of-thirds lines, title/safe
area, and **the other selected chips' edges** (align two PIPs by feel). Snapping
is what makes fingertip framing feel precise without a numeric readout.

**§4.4 — Duplicate & vary a keyframe (`⌘`/Alt-drag).** The A→B workflow is almost
always "B is A, moved." `Alt`-drag the A ghost to **drop a copy as B**, then nudge
— instead of RESET-ing B and re-dialing seven sliders. This is the single biggest
speed win for authoring moves (squeeze-backs, tumble-ins — `schema.ts:28–30`).

**§4.5 — Preset chips replace the `<select>`; flick to arm.** Swap the native
`<select>` (`dve.ts:67`) for a **horizontal chip strip** of preset thumbnails
(each a tiny rendered pose — reuse `poseToCss` on a mini stage). Tap = load; tap-
hold = context (rename/delete/overwrite); this also **kills `prompt()`** — SAVE AS
opens an inline LCARS name field on the stage, not an OS dialog (§2.4). The chips
double as the visual library the current UI lacks.

**§4.6 — Nudge & type, always.** Every handle is also keyboard/numeric reachable:
select a handle, arrow-keys nudge (1 unit; `Shift`+arrow = 10), or tap the value
to type. Accessibility floor + the fast path for "exactly 90°, exactly 50%." The
"fine tune" tray (§3) is where these live, collapsed by default.

---

## §5 · Delta & phasing

Everything is front-end sim; the transform math, MQTT advertise
(`[[twist-mqtt-audit]]`), and preset model are reused, not replaced.

| Phase | Deliverable | Touches | Model change? |
|---|---|---|---|
| **P0** | DVE **stage** with move + corner-scale handles on the live chip; A-ghost/B-solid | new `dve/stage.ts`; `dve.ts` mount | none |
| **P1** | Modifier grammar (`Shift` aspect / axis-lock, snap targets, opposite-anchor scaling) | `stage.ts` | none |
| **P2** | Kill browser chrome: preset **chip strip** + inline SAVE-AS field (drop `<select>`+`prompt()`) | `dve.ts` | none |
| **P3** | **Crop** frame + `DVECrop` on `DVEKeyframe`; `inset()` in `poseToCss` | `switcher.ts`, `dve.ts`, `schema.ts` | +optional `crop?` |
| **P4** | Marquee multi-select + group transform; `Alt`-drag duplicate-to-B; rotate ring / 3D handles | `stage.ts`, `index.ts` PIP wiring | none |

Split note: `dve.ts` is 142 lines today; the stage is its own concern → new
`src/editors/vision-mixer/dve/stage.ts`, keeping both under the 200-line rule
(`[[file-size-audit]]`). Math (`easeInOut`/`lerpKf`/`poseAt`/`poseToCss`) stays in
`dve.ts` as the shared core; the switcher test (`switcher.test.ts`) keeps passing
unchanged.

**Non-goals:** no change to what the DVE *renders* (still a CSS 3D chip, still a
sim); no new dependency (handles are `pointerdown`/`pointermove` on divs, the
WYSIWYG pattern); never require a keyboard (every keyboard/modifier path has a
touch equivalent — §4.2).

---

## §6 · The one-line thesis

**Stop making people type the picture's coordinates and start letting them grab
the picture.** The math is already right; the surface is a 1981 control panel
wearing HTML. Put handles on the chip, a crop frame in the model, and a
`Shift`/`⌘`/marquee grammar under the finger — and a corner PIP goes from ~forty
slider scrubs to three gestures, on a tablet, without a keyboard.
