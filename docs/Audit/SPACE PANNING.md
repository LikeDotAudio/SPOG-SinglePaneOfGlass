# CMDP Space Panning — 3D Object Visualization & Multidimensional Control Audit

**Status:** proposal · **Date:** 2026-07-03 · **Author:** production
**Subject:** expand the existing **CMDP panner** into a full 3D spatial audio visualizer, incorporating an interactive 3D cube, dual POV metering, and mapping hardware potentiometers directly to Z-axis (height) control.

---

## 0. TL;DR

A live CMDP (Central Multidimensional Positioning) source already exists as an audio panner. Currently, it functions as a standard positioning interface. 

The brief in this ticket is an **expansion of the existing deployment** to handle complex spatial audio formats (5.1.2, 9.1.4, Atmos) via a highly visual, multidimensional interface:

```
┌──────────────┬─────────────────────────┬──────────────┐
│  POV 1 (Top) │   3D CUBE RENDER        │  POV 2 (Side)│
│  X/Y Grid    │   (Listener inside)     │  Z-Axis      │
│  [meters]    │   🟢 Obj 1   🟢 Obj 2   │  [meters]    │
│  Vol In (VU) │   (imaginary speakers)  │  Folded Out  │
└──────────────┴─────────────────────────┴──────────────┘
```

**Recommendation:** don't build a separate spatial panner plugin. Extend the existing CMDP source with a **3D render mode**. Map the existing hardware/UI **potentiometers to control the HEIGHT (Z-axis)**. The X/Y logic is already established; the work is adding a **WebGL/Three.js 3D visualization layer**, **dual-POV side panels**, and **downmix metering**. Est. 4–5 focused days.

---

## 1. What exists today (reuse inventory)

Assuming the CMDP (`src/editors/cmdp/index.ts`) already handles basic positioning. Reusable as-is:

| Layer | Symbol | Reuse verdict |
|---|---|---|
| Audio Engine | Web Audio API / routing graph | **Keep** — core audio routing remains |
| Data model | `Position { x, y }`, `divergence` | **Keep**, extend to `{ x, y, z }` |
| UI Controls | Knobs, faders, coordinate input | **Keep**, repurpose pot. to Z-axis |
| MQTT surface | `publishParam` for `pan.x`, `pan.y` | **Keep**, extend with `pan.z` |

**The gap** is purely spatial visualization and vertical control:
1. There is **no Z-axis (height) control** actively mapped for object-based panning.
2. The UI lacks a **3D spatial representation** (the "room" with imaginary speakers).
3. The interface does not provide immediate feedback on how objects translate to **5.1.2 or 9.1.4 folded outputs**.

---

## 2. The delta at a glance

| | CMDP (Current) | CMDP 3D (This proposal) |
|---|---|---|
| Geometry | 2D X/Y plane | **Interactive 3D Cube + Dual 2D POVs (Top/Side)** |
| Height Control | None / Buried | **Hardware/UI Potentiometers explicitly mapped to Height** |
| Visualization | Basic nodes | **3D rendered person inside cube, 3D object spheres** |
| Metering | Stereo/Main Out | **Input VU bank + Folded Out (9.1.4, 5.1.2, 5.1, 2.0)** |
| Output Targets | Standard beds | **Imaginary speaker grids mapped to physical setups** |

---

## 3. The 3D Cube & Visualization (The core of the ticket)

**Decision: implement a lightweight 3D canvas (e.g., Three.js) for the center console, flanked by traditional 2D orthographic grids.**

*   **The Listener (Sweet Spot):** A rendered human head/torso sits at `(0,0,0)` in the 3D cube, providing absolute scale and perspective.
*   **Audio Objects:** Individual audio sources are represented as distinct 3D nodes (green spheres).
*   **Imaginary Speakers:** The bounds of the 3D space will display faint, glowing speaker icons representing the selected output array (5.1.2 or 9.1.4). As an object moves near an imaginary speaker, the speaker pulses, showing the object-to-bed rendering relationship.

### 3.1 Dual-Perspective UI (Addressing the "Secret UI" problem)
Moving in 3D on a 2D screen causes "slippage". The CMDP solves this via flanking panels:
*   **Left Panel (POV 1):** Top-down X/Y view.
*   **Right Panel (POV 2):** Side-profile Z-axis view. 

---

## 4. Hardware Integration: Potentiometers as Height

The brief explicitly calls for the **potentiometers to become the HEIGHT control**. 

*   **Why:** X and Y (width/depth) are easily controlled via a mouse/puck dragging across a grid. Height (Z) is notoriously difficult to grab on a screen. 
*   **Implementation:** The physical or virtual "audito positioner" potentiometers are decoupled from X/Y and locked strictly to Z. Turning the pot translates the object vertically in the 3D cube and the POV 2 (Side) panel instantly.

---

## 5. Metering & Downmix Feedback

Spatial audio requires constant awareness of how a mix translates. The CMDP editor will feature:

*   **Bottom Left (Input):** A bank of traditional **VU meters**. This displays the raw, un-panned volume of the sound coming in.
*   **Bottom Right (Output):** High-resolution digital meters for the folded output. This is a multi-tabbed or stacked view showing sound levels specifically for:
    *   **9.1.4** (L, C, R, Wides, Surrounds, Rears, 4x Heights, LFE)
    *   **5.1.2** 
    *   **5.1** (Standard Surround)
    *   **Stereo** (Folddown)

---

## 6. The Editor (On-Air / Console View)

The UI becomes a massive situational awareness dashboard.

```
┌─ CMDP · SPATIAL AUDIO PANNER ──────────────────────────────────────┐
│ [ 2D MODE | ▓3D ATMOS▓ ]       Target: [ 9.1.4 ▾ ]    ⟳ 10:00      │
├────────────────────────────────────────────────────────────────────┤
│  ┌─ POV 1 ─┐ ┌─────────── 3D RENDER CUBE ───────────┐ ┌─ POV 2 ─┐  │
│  │    ^    │ │                                      │ │    ^    │  │
│  │  < O >  │ │        [ 🟢 Obj 1  (x,y,z) ]         │ │    |    │  │
│  │    v    │ │            ( 👤 Listener )           │ │  --O--  │  │
│  └─────────┘ └──────────────────────────────────────┘ └─────────┘  │
│  ┌─ INPUT (VU) ────────┐   ┌─ OUTPUT (9.1.4 FOLDDOWN) ──────────┐  │
│  │ ||||||  ||||        │   │ L |||| C |||| R |||| LFE ||||      │  │
│  └─────────────────────┘   └────────────────────────────────────┘  │
│  Control: [ 🎛 POTENTIOMETERS ASSIGNED TO HEIGHT (Z-AXIS) ]         │
└────────────────────────────────────────────────────────────────────┘
```

---

## 7. MQTT / Control Surface

Current parameters likely only track `pan.x` and `pan.y`. Add:

| Param | Dir | Use |
|---|---|---|
| `pan.z` | rw | Height value driven by the potentiometer |
| `format` | rw | `9.1.4`, `5.1.2`, `stereo` — flips the imaginary speakers and meters |
| `spread` | rw | Object size/divergence |

---

## 8. Phases

| Phase | Deliverable | Est |
|---|---|---|
| **P0** | Data model update — add Z-axis to internal state, map potentiometer input to Z. | 0.5 d |
| **P1** | 3D Visualization — integrate Three.js, render cube, head, and spheres. | 1.5 d |
| **P2** | Dual POVs — build the 2D orthographic side panels hooked to the same state. | 1 d |
| **P3** | Imaginary Speakers & Metering — visual overlay of 9.1.4/5.1.2 arrays and folding logic. | 1 d |
| **P4** | MQTT `pan.z`/`format` wiring. | 0.5 d |
