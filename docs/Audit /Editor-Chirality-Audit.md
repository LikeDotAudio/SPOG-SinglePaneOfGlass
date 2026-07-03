# Audit — Which Editors Benefit From a Chirality Update (C2)

**Companion to:** `Chirality.md` (the ergonomic evidence base — read first), `Chirality Deployment strategy.md` (the build strategy + style guide; this audit **is the concrete flesh of its phase C2, "Editor overlays"**), and `LCARS-Hover-Tooltips-Production-Tips-Audit.md` (the same 19-editor inventory, different lens).

**What this audits.** The 19 twist editors, ranked by **how much a left/right handedness flip would help the operator** — and, for each, exactly *what flips*, *what must never flip*, and *how cheap the flip is*. The console shell already swings both ways (C0+C1). The editors do not — yet.

**The one-line thesis.** Chirality pays off in an editor **only where a single dominant-hand control lives on one side** — a joystick, a fader bank, a T-bar's transition console, a rotary card, an XY surface. Those are the editors where the reach/occlusion physics bite (`Chirality.md` §2/§4). Editors that are *forms, symmetric button grids, or pure monitoring* gain little and should be left alone (beyond marking their meters/scopes exempt). So this is **not** "flip all 19" — it is a **ranked, ~10-editor list**, front-loaded with one near-zero-cost proof.

---

## 0. Two Findings That Frame Everything

**Finding A — editors are a clean slate.** Every editor overlay is appended to `document.body` via `platform/overlay.ts:57` and lives in `.ed-overlay` (`position:fixed; inset:0; z-index:2000`), **outside** the console container that C1 mirrors. No chirality CSS touches it; a repo-wide `grep -rniE "chir|data-chirality|--chir"` over `src/editors/**` returns **nothing**. So editors flip **not at all** today — there is no half-done state to reconcile, and each editor is an independent, opt-in decision.

**Finding B — the shipped mechanism is text-safe by construction.** The strategy doc *proposed* geometry reflection (`scaleX(-1)` + counter-flip). What actually **shipped in C1** is the other approach: explicit per-selector geometry swaps under `html[data-chirality="right"]` plus `direction:rtl` on the grid (`lcars.css:86-142`). Consequence for editors: **nothing is ever `scaleX`-flipped, so text/meters/scopes are never mirror-reversed in the first place.** "Exempt from the flip" therefore does not require a `.chir-fixed` counter-flip — it just means *don't author a rule that moves that element*. That removes the single scariest failure mode (unreadable mirror text) from the entire editor effort. (The one genuine hazard is **spatial diagrams**, §4.)

Net: the editor flip is a **layout-ordering job** (swap which side a control rail docks to), not a pixel-reflection job.

---

## 1. The Decision Criteria

**Benefit** (from `Chirality.md`'s load-bearing findings):
- **§2 reach + §4 occlusion** — a primary control in the *wrong* bottom corner is dragged/reached across the body, under the occluding forearm, in the least-accurate band. *Benefit is high exactly when a dominant-hand control sits on a fixed side.*
- Symmetric grids and read-only monitoring → **benefit ≈ 0** (nothing moves under the hand that isn't mirror-neutral already).

**Effort** (from the code):
- **Cheap:** a two-track `grid-template-columns` (e.g. `1fr 280px`) with the driven controls in the fixed-width column and **no stray `left:`/`right:` pins** → flip = swap the two tracks + reorder the DOM (or `direction:rtl` + child reset). *wysiwyg is the archetype: zero directional CSS.*
- **Costly:** many absolutely-**pinned** panels (`left:`/`right:`) → each pin needs an explicit swap; plus dense **exempt** content (scopes, maps) to route around. *camera-control is the archetype: 17 `left:` pins, scopes docked left, maps docked right.*

---

## 2. The Ranked Verdict (all 19)

Legend — **Hand control** = the dominant-hand thing whose *side* matters · **Flips** = the rail/control that should dock to the dominant side · **Exempt** = never mirror (spatial/meter/scope/text) · **B** benefit · **E** effort · tiers ordered by benefit-per-effort.

### Tier 1 — Do these (a real hand-driven control on a side)
| # | Editor | Hand control & where | Flips | Exempt (never mirror) | B | E |
|---|---|---|---|---|---|---|
| 1 | **audio-mixer** | Fader bank; **left rail ↔ right MASTER tab** (already a mirror-image pair: `.am-rail` 44px-left vs `.am-master-tab` 44px-right) | rail/master swap + strip aux order | VU meters (`column-reverse` fill), dB & channel text | ★★★ | ●● |
| 2 | **camera-control** | **5-axis joystick** + Ped-left/Zoom-right + shading dials on the 580px right rail | rail side; scopes(L)↔maps(R); WB/bars/rec pins | video, vectorscope, RGB parade, **robotics maps**, OSD timecode | ★★★ | ●●● |
| 3 | **ifb** | **Rotary dials + P1/P2 talk buttons** in the right 320px column | grid track swap (clean; status is centered) | input meters, confidence feed, ducking scope | ★★★ | ● |
| 4 | **stagebox-input** | **Rotary dial card** (alias/phantom/keys) in the left 300px card | 3-track grid swap | input meter+peak, history scope, HPF chart | ★★★ | ●● |
| 5 | **vision-mixer** | T-bar is **central (ambidextrous)** but TAKE/AUTO + transition console sit bottom-left | move `.vm-console` (TAKE/AUTO/keyers) to dominant side | PGM/PVW feeds, DSK tags, T-bar green→red scale, ▲▼ | ★★☆ | ●● |
| 6 | **audio-positioner** | **XY/radial drag surface** (center) + floating hint/control/group panels pinned L & R | the pinned panels' edges (`left:`/`right:` ×4 each) | the **room/azimuth field** (mirroring inverts stage L/R!), status numerics | ★★☆ | ●● |

### Tier 2 — Cheap, worthwhile (clean grids; medium benefit)
| # | Editor | Hand control & where | Flips | Exempt | B | E |
|---|---|---|---|---|---|---|
| 7 | **wysiwyg** | **FX sliders + toggles** in the right 280px column; **zero stray directional CSS** | swap the 2 grid tracks + DOM order | 3D stage scene, colour legend scale | ★★☆ | ○ |
| 8 | **lighting** | **Intensity/CT faders** (left strips) vs **scene/cue buttons** (right 360px) | `1fr 360px` track swap | **rig diagram** (stage L/R), beam overlay, DMX text | ★★☆ | ●● |
| 9 | **signal-conditioner** | **Proc sliders** (left) vs 1:1 scope (right) in `.sc-proc-body` | `flex-direction:row → row-reverse` | preview scope/bars, reference LED, readouts | ★★☆ | ● |
| 10 | **person** | **EQ/comp knobs** (center strip); profile(L) ↔ presets(R) rails | `280px 1fr 210px` outer-track swap | waveform/EQ canvas, gain-reduction meter, name text | ★★☆ | ●● |
| 11 | **audio-monitor** | **Volume slider + monitor key grid** in the right 300px card | `1fr 300px` track swap | PPM/loudness meters, Lissajous, correlation axis, LUFS | ★☆☆ | ●● |
| 12 | **graphics-engine** | TAKE/OUT/UPDATE transport (center); rundown(L) ↔ field editor(R) | outer-track swap **only** | ⚠ the on-air preview (`.gfx-stage`) — L3/bug/list are **broadcast-output positions**, NOT chrome | ★☆☆ | ●●● |

### Tier 3 — Skip (marginal or actively wrong to flip)
| # | Editor | Why skip |
|---|---|---|
| 13 | **iso-recorder** | Jog/shuttle is full-width; at most right-align the jog+transport row. Timeline/timecode exempt. Tiny gain. |
| 14 | **multi-viewer** | Symmetric video wall; only the decorative left spine is handed. Low gain. |
| 15 | **signaling** | Symmetric TAKE/PGM/PVW/trigger button grids; swapping outer rails changes nothing meaningful. |
| 16 | **encoder** | Pure selection/monitoring (destination pills, format toggles). No hand-driven control. |
| 17 | **intercom** | Symmetric key matrix, **zero directional CSS** — nothing to gain. |
| 18 | **meter-input** | Pure monitoring; **everything is a scope** (exempt). Only the LCARS pill-spine is handed; flipping risks the scope field for ~no benefit. |
| 19 | **prompter** | **Already owns a deliberate `scaleX(-1)` "Mirror" toggle** for the prompt glass (`index.ts:53,56,62`). That is intentional *content* mirroring — do **not** overload it with operator chirality; confusion risk outweighs the trivial script-left/stage-right flip. |

**Tally:** 6 in Tier 1, 6 in Tier 2, 7 skipped. The realistic program is **~10 editors**, not 19.

---

## 3. Recommended Sequence (leverage-ordered, within C2)

1. **wysiwyg first — the zero-cost proof.** Two grid tracks, no stray pins, spatial canvas that simply rides in whichever column. It proves the editor-flip pattern end-to-end (attribute → track swap → DOM order → exempt canvas) in one tiny diff, and becomes the reference every other editor copies. *(★★☆ benefit for ○ effort — best ratio in the app.)*
2. **audio-mixer + ifb + stagebox-input** — the highest *benefit* with modest effort. The audio-mixer's rail/master pair is already mirror-image geometry, so it's half-built; ifb/stagebox are clean grid swaps. This is where a left-handed A1/comms op feels the difference immediately.
3. **camera-control — the flagship, done carefully last in the first wave.** Highest benefit (RCP joysticks are physically handed) and highest effort (17 pins + scopes-left/maps-right + heavy exempt set). Do it once the pattern and the exempt-class helper (§4) are proven, so the maps and scopes are protected.
4. **Tier 2 as time allows**, with **graphics-engine gated** on getting the broadcast-preview exemption right (§4).

Each editor is independently shippable and independently snapshot-verifiable (strategy §7).

---

## 4. The Exemption Rules — Three Kinds of "Don't Flip"

The audit's universal finding: **every** editor holds ≥1 element that must not mirror. But they are not all the same kind, and conflating them is the trap:

| Kind | Examples (from the inventory) | Rule under the shipped (explicit-geometry) mechanism |
|---|---|---|
| **Text / values** | channel names, dB, LUFS, timecode, telemetry, UMD | Never at risk — no `scaleX` is applied. Just don't write a flip rule targeting them. |
| **Meters & scopes** | VU/PPM (`flex-direction:column-reverse`), vectorscope, Lissajous, waveform, correlation axis, ducking scope, HPF chart | The **container column may swap sides** (fine); the meter's own fill axis is vertical and untouched. Do not reorder a meter's internal L/R. |
| **Spatial diagrams** ⚠ | **camera robotics maps** (pan/tilt geometry), **lighting rig** (light-vs-subject = stage L/R), **audio-positioner room** (azimuth), **wysiwyg 3D scene**, graphics **on-air preview** (L3/bug/list are where they air) | **The genuine hazard.** The panel that *holds* the canvas may dock to the other side, but the canvas **contents must never be horizontally mirrored** — that would invert real-world left/right (stage L becomes stage R). Tag these **ANCHOR** (`Chirality.md` §8B, strategy §3.1): reflection-immune. This is the one place an explicit "do-not-mirror" marker earns its keep. |

**Actionable:** introduce a shared `chir-exempt` / `.chir-anchor` class (none exists yet) and tag the spatial canvases with it as each editor is flipped. Text and meters need no marker under the current mechanism; spatial diagrams do.

---

## 5. Mechanism Guidance (two patterns, pick by shape)

- **Clean two/three-track grid, controls in a fixed column, no stray pins** → *pattern A:* `html[data-chirality="right"] .<ed> { direction: rtl }` + `.<ed> > * { direction: ltr }` (exactly the console's C1 move), or an explicit `grid-template-columns` reversal. Covers wysiwyg, ifb, stagebox, audio-monitor, person, signal-conditioner, lighting, graphics (outer tracks).
- **Absolutely-pinned floating panels / docked scopes** → *pattern B:* explicit per-selector swap of each `left:`/`right:`/`border-*` under `html[data-chirality="right"]`, mirroring the elbow blocks already in `lcars.css`. Covers camera-control, audio-positioner, and the audio-mixer rail/master radii.
- **Central control that shouldn't move** (vision-mixer T-bar) → leave the control centered; only relocate the *action cluster* (TAKE/AUTO) to the dominant corner.

A tiny shared helper — `getChirality()` reading `document.documentElement.dataset.chirality` — lets an editor that positions anything in JS (popovers, drag ghosts, the camera joystick puck origin) honour `--chir` per strategy §3.3.3. None of the editors read it today.

---

## 6. Governance (keeps it swinging, per strategy §7)

- **This audit = the C2 backlog.** File the Tier-1/Tier-2 list as the concrete editor tickets under phase C2.
- **PR rule (strategy §3.3.6):** every editor touched declares *"which parts MIRROR, which are exempt/ANCHOR, and why"* — the spatial-canvas exemption especially.
- **Snapshot harness (strategy §7):** for each flipped editor, boot right + left, assert (a) the driven control's `getBoundingClientRect()` swaps sides, (b) no horizontal overflow, (c) the spatial canvas' internal content is byte-identical (not mirrored), (d) a known label reads upright.
- **Lint gate:** new editor CSS uses logical properties; the spatial canvases carry the exempt marker.

---

## Appendix — Directional-CSS Heft (effort proxy)

Raw count of side-encoding declarations per editor (`grid-template-columns`, `flex-direction`, CSS `order:`, `left/right`, `margin-left/right`, `border-left`). High count ≠ high effort where the hits are centering (`left:50%`) or on-air/data positions — see notes.

| Editor | heft | note |
|---|---|---|
| camera-control | 53 | genuine — pins + docked scopes/maps (Tier 1, high effort) |
| meter-input | 42 | mostly scope cards — **exempt**, so skip |
| graphics-engine | 36 | many are **on-air preview** positions — do NOT flip |
| audio-mixer | 29 | rail/master radii + aux — real, Tier 1 |
| stagebox-input | 27 | dial card + bank grid — real, Tier 1 |
| encoder | 23 | mostly centering — skip |
| vision-mixer | 20 | T-bar central; console relocation only |
| audio-monitor | 19 | meter fills exempt; grid swap is the work |
| person / lighting / audio-positioner | 17 | mix of grid tracks + spatial pins |
| ifb | 16 | clean — Tier 1, low effort |
| signaling / signal-conditioner | 14 | signaling symmetric (skip); conditioner row-reverse (cheap) |
| multi-viewer | 12 | decorative spine only |
| iso-recorder / intercom | 11 | full-width / symmetric — skip |
| prompter | 10 | owns its own Mirror — skip |
| **wysiwyg** | **9** | **cleanest flip in the app — do first** |

---

### Bottom line
Chirality is not a paint job you apply to every editor — it is an **ergonomic fix for controls that live on a side**. Ten editors have such a control; nine do not. Start with **wysiwyg** (a one-diff proof), bank the felt wins in **audio-mixer / ifb / stagebox**, then take on **camera-control** as the flagship once the spatial-canvas exemption is proven. Above all: swap which *side* a control rail docks to, but **never mirror a spatial diagram's contents** — that is the only way this breaks.
