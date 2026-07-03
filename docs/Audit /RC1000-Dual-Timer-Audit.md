# Audit — The RC1000 Dual-Channel Timer (as a Source)

**Companion to:** `Teleprompter-Source-Audit.md` (the other *generated* source — file-in, playhead-on-the-bus), `Graphics-Engine-Audit.md` (renderer-vs-engine split), `TWIST-MQTT-Advertising-Audit.md` (the bus that stands in for GPI/timecode wiring), `Chirality.md` (the handed keypad/panel), `Production-Entities-People-Places-Things-Audit.md` (who watches the count — director / floor manager / talent). **Extends the shipped `src/editors/clock/` "WORLD CLOCKS" source** (`Routes/Sources/006_Graphics/003_World Clocks.json`).

**Primary source.** Masterclock *RC1000 Dual-Channel Up/Down Timer — User Manual v1, 2019.04* (42 pp., read in full), plus the [RC1000 product page](https://www.masterclock.com/masterclock-dual-channel-production-timer.html), the modern software analog [stagetimer.io/broadcasting](https://stagetimer.io/use-cases/timer-for-broadcasting/), and production-workflow grounding ([Ross Video GPI→timer](https://support.rossvideo.com/hc/en-us/community/posts/360040398872-GPI-trigger-to-start-countdown-timer)). Vendor identifiers kept only where they name a real protocol; technology only.

**What this audits.** How a broadcast **production timer** actually works — the RC1000 specifically — and how it maps onto TwistRouting as a **new SOURCE**: a *generated count* (up or down, two channels at once) that is **routed into a Control Room twist** and driven live from a keypad panel, exactly as the clock and teleprompter sources already are. The image the request supplied is the RC1000 §3 Operation panel: two stacked 6-digit red readouts (`12:34:56` / `12:34:56`), DISPLAY + CHAN channel selectors, a GPI / SEC-FRM / UP-DN / INPUT / CLEAR function row, and a calculator keypad with PRESET, INC (+), DEC (−), SHIFT, and START/STOP.

**The one-line thesis.** *A clock reads the time; a timer **makes** the time.* The clock source I just shipped is a **read-out** — it renders time-of-day (UTC / local ±3h) with no state of its own. A timer is the opposite: it is a **count engine with a transport** — its running value, direction, preset bank and follow-buffer are *authored state* that must be started, paused, calculated on, and *fanned to every display at once*. The RC1000's "dual" is two of these engines side-by-side (Channel A + Channel B), one readout stacked above the other. In TwistRouting terms this is **one source that generates two synchronized counts, with the transport state on the bus** — the same shape as the prompter's playhead, and the natural second half of the clock work.

---

## 0. The Critical Framing — Clock vs. Timer vs. the Two Channels

Three things are easy to conflate. The whole design falls out of keeping them apart:

| | **Clock** (shipped) | **Timer** (this audit) |
|---|---|---|
| Value is… | *read* from the wall (TOD) | *produced* by a count engine |
| State it owns | none (pure function of `now`) | running value, direction, run/pause, preset, follow-buffer |
| Driven by | nothing — it just ticks | a **transport**: START/STOP, PRESET, +/−, INC/DEC |
| Faces | LED ring · analog sweep | **dual 6-digit LED read-out** (A over B) |
| Fan-out | N displays render the same `now` | N displays render the same **count**; count also leaves as SMPTE + GPI |

And the "dual" is not two devices — it is the **canonical broadcast timer pattern**: one channel counts *down to the next hard event* (top-of-hour, end of break, hit) while the other counts *the current segment* (elapsed, or down to this item's out). The RC1000 makes both first-class, switchable with one **CHAN** key, each with its own direction, format, preset and timecode output.

```
          ┌──────────────────────────────────────────────────────────────┐
          │         DUAL-CHANNEL TIMER  (this audit — the "engine")        │
          │   Keypad ► [count value] ► direction ► transport ► calculator  │
          │   Channel A: 00:60 ▼ down     Channel B: 12:34:56 ▲ up          │
          │   Preset bank ×20   ·   Follow buffer ×8 per channel            │
          └───────────────────────────────┬──────────────────────────────┘
                     count + direction + run-state   (the "bus")
        ┌───────────────────────┬─────────┴──────────┬───────────────────────┐
        ▼                       ▼                    ▼                       ▼
  LED WALL CLOCK          CONFIDENCE MONITOR    SMPTE TC OUT →         GPI OUT →
  (TCDS, raw SMPTE)       (studio / talent)     sync deck / VTR       tally / lamp / relay
        └───────── all show the SAME count, frame-locked; GPI IN can START it ─────────┘
```

A display is *dumb* (render this count). The source is where the depth lives: entry, direction, presets, chaining, calculation, and **the count as shared state broadcast to N consumers** — plus the two triggers that make it a *control* device, not just a readout: **GPI in** (a foot-switch / relay starts a count) and **GPI out / timecode** (the count *drives* other equipment). That trigger surface is exactly what the TWIST-MQTT bus already models.

---

## 1. How & Why It Works — the Production Job

Every RC1000 feature serves one of four production jobs ([stagetimer](https://stagetimer.io/use-cases/timer-for-broadcasting/), [Ross Video](https://support.rossvideo.com/hc/en-us/community/posts/360040398872-GPI-trigger-to-start-countdown-timer)):

| Job | What the operator does | Which RC1000 features |
|---|---|---|
| **Countdown to a hard event** ("2:00 to air", "0:30 in break") | Enter time, direction **DOWN**, START; GPI-out fires tally/lamp at `0` | keypad, UP/DN, START/STOP, GPI-out at *End* |
| **Elapsed / segment time** (how long has this item run) | Count **UP** from 0, or *mark* against input timecode | UP/DN, INPUT, "Mark the elapsed time" |
| **Backtime** (given program-end TC, how long until we must hit it) | `INPUT` gives running program TC, press **−**, enter end-of-program → auto down-count | §3.9 Countdown to End of Program |
| **Chained rundown** (a run of countdowns, each following the last) | Stack up to 8 counts per channel into the **follow buffer** | FOLLOW DUAL (SHIFT-START/STOP) |

The **two channels** let one operator serve two of these at once — e.g. A counts *down to end of show* while B counts *up on the current package* — and the **DISPLAY** key decides which channel is echoed to the remote wall/RS-232 display, independent of which channel the keypad is currently editing (**CHAN**). That CHAN-vs-DISPLAY split is the single most important interaction subtlety and the thing a software port most often gets wrong.

**Why hardware GPI matters.** In a live gallery nobody types during a take. The count is *armed* on a preset and fired by a **contact closure** — a director's button, a foot-switch, a relay from the automation system — with a 40 ms minimum closure and each closure restarting from the preset value. Symmetrically, the count *fires outward*: a GPI **output** closes at start, at end-of-count, or at an arbitrary `HH:MM:SS:FF` match, for a programmable 1–25 frame / 1 s pulse — to trip a tally, an on-air lamp, or the next device. This is the "control" half of "count and control applications."

---

## 2. Anatomy of the Panel (the supplied §3 image)

```
   ┌──────────────────────────────┐   ┌──────────┐
   │  1 2 : 3 4 : 5 6   ◄ Chan A   │   │A ●● B     │   DISPLAY  — which channel → RS-232 / remote
   │  1 2 : 3 4 : 5 6   ◄ Chan B   │   │ DISPLAY  │   SHIFT-DISPLAY = lock it
   │   (dual 6-digit 7-seg, red)   │   ├──────────┤
   └──────────────────────────────┘   │A ●● B     │   CHAN     — which channel the keypad edits
                                       │  CHAN    │   SHIFT-CHAN = lock channel
   ┌────────┬────────┬──────────┬──────────┐        (LED shows active channel)
   │  GPI   │ ●●     │ A ●● B   │  CLR ALL  │
   │ SEC/FRM│ UP DN  │  INPUT   │  CLEAR    │        function row
   └────────┴────────┴──────────┴──────────┘
   ┌──────┬──────┬──────┬──────────┐
   │  7   │  8   │  9   │ ○ PRESET │  ← PRESET LED flashes while programming
   ├──────┼──────┼──────┼──────────┤
   │  4   │  5   │  6   │  + (INC) │
   ├──────┼──────┼──────┼──────────┤
   │  1   │  2   │  3   │  − (DEC) │
   ├──────┼──────┼──────┴──────────┤
   │SHIFT │  0   │  START / STOP   │
   └──────┴──────┴─────────────────┘
```

Every physical key carries a **primary** and a **SHIFT** function — the whole control language in one table (verbatim from the manual, §3 Key Functions):

| Key | Primary | SHIFT-<key> |
|---|---|---|
| **DISPLAY** | choose which channel is sent to RS-232 / remote | **lock** DISPLAY on current channel |
| **CHAN** | change the *active* (keypad) channel; LED shows A/B | **lock** channel (no switching) |
| **SEC/FRM** | toggle active channel `HH:MM:SS` ↔ `MM:SS.FF` | **GPI** — enter GPI in/out programming |
| **UP/DN** | shows direction (LED over UP or DN) | **instantly reverse** active channel |
| **INPUT** | select input SMPTE/EBU timecode for this channel | activate/deactivate **Return-to-Input** |
| **CLEAR** | clear keypad entry / edit-correct | **CLR ALL** — clear active channel to dashes |
| **PRESET** | program & recall preset sequences | (digits recall 10–19 with SHIFT) |
| **+** | addition (calculator) | **INC** — +1 second or +1 frame |
| **−** | subtraction (calculator) | **DEC** — −1 second or −1 frame |
| **START/STOP** | enter / start / pause; "=" in calculator | **FOLLOW DUAL** — push into follow buffer, act on *both* channels |
| **0–9** | data entry; store/recall presets 0–9 | store/recall presets 10–19 |

Plus a bank of **SHIFT-digit "special functions"** (a hidden settings menu): `SHIFT-0` frame-rate select, `SHIFT-1` brightness (15 levels), `SHIFT-2` UTC/Local, `SHIFT-3` 12/24-hour, `SHIFT-4` swap A↔B, `SHIFT-7` RS-232 format, `SHIFT-8` firmware/key-test, `SHIFT-9` leading-zero blanking.

**Design reading:** it is a **calculator keypad with a transport bolted on**. START/STOP is literally the `=` key; +/− are literally calculator operators; the presets are `M1..M20` memories. That is the mental model to port — an op who has used a desk calculator already knows 60 % of this device.

---

## 2A. The SHIFT Layer — Every Combination as Its Own Function

On the hardware, **SHIFT is a single modifier that overloads the whole keypad**, and it is *modal*: `SHIFT-6` means "store/recall preset 6" in PRESET mode, but "unused setting" in normal mode, and something else again mid–GPI-programming. That overloading is a hardware economy (18 keys, ~40 functions) — and it is the RC1000's biggest usability tax. **For the port, remove the modifier entirely: every SHIFT combination becomes its own first-class, individually-invocable function** (a flat command palette / button), so nothing is hidden behind a mode. Below is the *complete* enumeration — every SHIFT combination in the manual, what it does, the modal caveat, and the standalone function it becomes.

### Group A — Function-row SHIFTs (the labelled second functions)

| SHIFT combo | What it does (manual) | Standalone function |
|---|---|---|
| **SHIFT-DISPLAY** | *Lock* the DISPLAY selector on the current channel so the remote/RS-232 echo can't be switched by accident. Press again to unlock. | `lockDisplayChannel(on)` — toggle; freezes which channel is echoed out. |
| **SHIFT-CHAN** | *Lock* the active (keypad) channel; blocks all channel switching until pressed again. | `lockActiveChannel(on)` — toggle; guards the edit channel. |
| **SHIFT-SEC/FRM  ( = GPI )** | Enter **GPI programming** mode. Repeated presses walk the ports (see Group E). | `enterGpiProgramming()` — opens the GPI editor; the port replaces "count the presses" with explicit port pickers. |
| **SHIFT-UP/DN** | **Instantly reverse** the active channel's count direction, even mid-run. | `reverseDirection(chan)` — flip up↔down live. |
| **SHIFT-INPUT** | Toggle the **Return-to-Input** feature: after a countdown, the channel lands back on live input timecode. A *third* press mid-countdown re-enables it if disabled. | `setReturnToInput(chan, on)` — explicit tri-state (off / armed / re-armed), no press-counting. |
| **SHIFT-CLEAR  ( = CLR ALL )** | Clear the active channel to all dashes (`--:--:--`) — a full reset vs. CLEAR's single-entry edit. | `clearAll(chan)` — reset channel to blank. |

### Group B — Transport SHIFTs

| SHIFT combo | What it does (manual) | Standalone function |
|---|---|---|
| **SHIFT-START/STOP  ( = FOLLOW DUAL )** | Push the current entry into the **follow buffer** (chain), and operate on **both channels at once** (start/stop A *and* B together). | `followDual()` — append to chain **and** `startStopBoth()`. In the port, split into two explicit fns: `pushFollow(chan, value)` and `startStopBoth()`. |
| **SHIFT-+  ( = INC )** | Increment the count by the **smallest displayed unit** — +1 second in `HH:MM:SS`, +1 frame in `MM:SS.FF`. | `nudge(chan, +1)` — sign +, granularity = current format. |
| **SHIFT-−  ( = DEC )** | Decrement by the smallest displayed unit (−1 sec or −1 frame). | `nudge(chan, -1)`. |

### Group C — SHIFT-digit "special functions" (the hidden settings menu, normal mode)

These fire only when **not** in PRESET mode. Several show a value on the read-out and use **+** to cycle the choices — in the port each becomes a direct setter with an explicit argument (no "press + to cycle").

| SHIFT combo | What it does (manual) | Standalone function |
|---|---|---|
| **SHIFT-0** | Show/set **SMPTE frame-rate** generation on the selected channel; **+** cycles available FPS. | `setFrameRate(chan, 24\|25\|30\|29.97df)` |
| **SHIFT-1** | Adjust **display brightness**, brightest→dimmest in small steps; **15 levels**. | `setBrightness(level 0-14)` |
| **SHIFT-2** | Show/set **output time base**; **+** cycles **UTC ↔ Local**. | `setTimeBase(utc\|local)` |
| **SHIFT-3** | Show/set **hour format**; **+** cycles **12 ↔ 24 hour**. | `setHourFormat(12\|24)` |
| **SHIFT-4** | **Swap / transpose Channel A ↔ B** immediately (same as §3.11). | `swapChannels()` |
| **SHIFT-5** | **Not used** — a free hardware slot. | *(reserved)* — a spare command slot in the port. |
| **SHIFT-6** | **Not used** — a free hardware slot. | *(reserved)* |
| **SHIFT-7** | Show/set **RS-232 port format**; **+** cycles `HH:MM:SS ↔ HH:MM:SS:FF`. | `setSerialFormat(hms\|hmsf)` |
| **SHIFT-8** | Display **firmware version + release date**; performs a **key test** (with a Telnet command). | `showFirmware()` / `runKeyTest()` |
| **SHIFT-9** | Toggle **leading-zero blanking** on the selected channel (remote displays unaffected). | `toggleLeadingZeroBlank(chan)` |

### Group D — SHIFT-digit in PRESET mode (the modal collision)

| SHIFT combo | What it does (manual) | Standalone function |
|---|---|---|
| **SHIFT-0 … SHIFT-9** *(PRESET mode)* | Store or recall **presets 10–19** (unshifted `0–9` = presets 0–9). This is why the digits are overloaded: same keys, different job under PRESET. | `storePreset(n)` / `recallPreset(n)` with `n` = 0–19 directly — the port addresses all 20 memories by number, so there is **no** shifted second bank and the collision with Group C disappears. |

### Group E — GPI programming (multi-press SHIFT-GPI, and SHIFT-±/CLEAR within it)

The one place the hardware counts *how many times* you press the combo. The port replaces press-counting with explicit targets:

| SHIFT combo | What it does (manual) | Standalone function |
|---|---|---|
| **SHIFT-GPI ×1 / ×2** | Program GPI **output #1 / #2** (`PO n C FF`: port, channel, closure-duration in frames). | `programGpiOut(port 0\|1)` |
| **SHIFT-GPI ×3 / ×4** | Program GPI **input #1 / #2** (`PI---n`: which input → which preset → which channel). | `programGpiIn(port 0\|1)` |
| **SHIFT-+**  *(within GPI-out)* | Set the output to fire **at the START** of the count. | `gpiOutTrigger(port, 'start')` |
| **SHIFT-−**  *(within GPI-out)* | Set the output to fire **at END / zero** (display shows `E`). | `gpiOutTrigger(port, 'end')` |
| **SHIFT-CLEAR** *(within GPI)* | **Exit** GPI programming without storing. | `cancelGpiProgramming()` |
| **SHIFT-CLR ALL** *(within GPI-in)* | **Exit** GPI-input programming and return to normal display. | `exitGpiProgramming()` |

**Net effect for the port.** The RC1000's ~24 SHIFT combinations collapse into ~22 discrete, unambiguous commands (two are hardware-only spares). Because each is its own function, the port can expose them however the operator wants — a command palette, right-click menu, MQTT param, Stream Deck button, or keyboard shortcut — with **zero modal state** and no "press-count." The `SHIFT-digit` overloading (Group C vs D) that trips up hardware operators is designed *out*: presets are addressed by number, settings are named setters. This flat catalog is the command surface the T2/T4 editor exposes and the T5 MQTT bridge advertises.

---

## 3. The Data Model

```
Timer (the source)
 ├─ meta: { name, format: HH:MM:SS | MM:SS.FF, hour: 12|24, brightness, fps: 24|25|30|29.97df }
 ├─ Channel[A,B]                       ← two independent count engines
 │   ├─ value       : frames           ← the live count (single source of truth)
 │   ├─ direction   : up | down
 │   ├─ state       : idle | running | paused | marked
 │   ├─ format      : HH:MM:SS | MM:SS.FF   (per-channel — SEC/FRM)
 │   ├─ inputMode   : off | showInput | returnToInput
 │   └─ followBuffer: value[]  (≤ 8)    ← chained countdowns, FIFO
 ├─ presets: value[20]                 ← M0..M19, each {value, direction}
 └─ routing (runtime, NOT in the file):
     { displayChannel: A|B (DISPLAY), activeChannel: A|B (CHAN),
       displayLocked, channelLocked, gpiIn[2], gpiOut[2] }
```

Two invariants the manual is strict about, and a port must honour:

1. **Value is frames, not a string.** Everything (rollover at `23:59:29`→`00:00:00`, add/subtract, INC/DEC by one frame, format toggle, fps) is integer-frame math. Rendering `HH:MM:SS` vs `MM:SS.FF` is a *view* over the same integer. Storing "12:34:56" as text is the classic bug.
2. **CHAN ≠ DISPLAY.** The channel you *edit* and the channel you *echo to the wall* are separate selectors, each independently lockable (SHIFT-CHAN, SHIFT-DISPLAY). Editing B must never disturb what the audience sees on A.

---

## 4. Operations Catalog (§3.1–3.22, condensed)

| # | Operation | Gesture | Notes for the port |
|---|---|---|---|
| 3.1 | Enter time + direction | CHAN → SEC/FRM → digits → UP/DN → START | seconds auto-normalise (`100`→`1:00`) |
| 3.2 | Program preset | digits → dir → PRESET (LED flashes) → `0-9` / SHIFT-`0-9` | 20 memories |
| 3.3 | Recall preset | CHAN → PRESET → memory key → START | |
| 3.4 | Elapsed time | count vs input-TC **mark**, or 2-channel A/B ping-pong | "mark" freezes one channel while the other runs |
| 3.5 | Send to remote (RS-232) | DISPLAY selects channel → out at 9600-8-N-1 | continuous `HH:MM:SS[.FF]` |
| 3.6 | Pause / restart | START/STOP toggles; **SHIFT-START/STOP stops *both*** | |
| 3.7 | Reverse direction | SHIFT-UP/DN (instant, mid-count) | |
| 3.8 | Show input timecode | INPUT toggles display of live TC | requires TC in |
| 3.9 | Countdown to end-of-program | INPUT → **−** → enter end TC → START (auto down-count) | *backtime* |
| 3.10 | Return-to-input after countdown | SHIFT-INPUT (LED flashes) → count → lands back on live TC | |
| 3.11 | Swap channels | SHIFT-4 | transpose A↔B |
| 3.12 | Add/sub to running count | +/− → digits → START(=) | live math on a running timer |
| 3.13 | Nudge (small increments) | SHIFT-INC / SHIFT-DEC → ±1 sec or ±1 frame | granularity = current format |
| 3.14 | Calculator | time `+/−` time `=`; result storable as preset | START = `=` |
| 3.15 | Follow buffer (chain) | FOLLOW DUAL stacks ≤8 counts; auto-advances | may append while running |
| 3.16/17 | Disable DISPLAY / CHAN select | SHIFT-DISPLAY / SHIFT-CHAN | operator lock-out |
| 3.18 | Program GPI **out** | SHIFT-SEC/FRM → `PO n C FF` (port, chan, frames) → Start/End/@match | pulse 1–25 frames / 1 s |
| 3.19 | Program GPI **in** | SHIFT-GPI ×3/×4 → `PI---n` → pick preset → CHAN → store | closure loads+runs a preset |
| 3.20–22 | Brightness / lead-zero | SHIFT-1 / SHIFT-9 | 15 levels; blanking is local-only |

---

## 5. I/O Map (rear panel — the "wiring" the bus replaces)

| Interface | Detail | TwistRouting analog |
|---|---|---|
| **TC out A / B** | 2× independent SMPTE/EBU 24/25/30/29.97df, SE or balanced (DB25 pins 10/23, 12/25) | publish each channel's count to the bus → clock/timecode destinations render it |
| **TC in** | 1× auto-detect SMPTE 24/25/30/df + IRIG-B0/B1, AGC (pins 8/21) | a *reference feed* routed into the timer (INPUT modes) |
| **GPI in ×2** | opto-isolated, NO, closure→0 V, 40 ms min; each fires a preset on A or B | `onParam('trigger.gpiIn.n')` → load+run preset |
| **GPI out ×2** | opto-isolated, fires at start / end / `@match`, 1–25 fr or 1 s | `publishParam('event.gpiOut.n', …)` on the matching condition |
| **RS-232** | 9600-8-N-1, continuous `HH:MM:SS[.FF]` of the DISPLAY channel | a text-feed projection of the display channel |
| **Network** | 10/100, NTP client, drives Masterclock **NTDS** network clocks; raw SMPTE drives **TCDS** clocks | routing the timer feed to N clock/graphic destinations |
| **Power** | dual/redundant DC (8–28 V) **or** PoE 48 V | n/a (front-end sim) |

**The family.** The RC1000 replaces the legacy **UDT-5700**; its single-channel sibling is the **RC600 Count Controller**; its displays are the **TCDS** (raw SMPTE) and **NTDS** (network) clock series. 99-hour max count, 20 presets, 6-deep sequence chaining per the product page. Only the RC1000 is *dual-channel* — which is precisely the "dual display" the request is about.

---

## 6. Map to TwistRouting — What Exists vs. the Delta

**Already shipped (the clock work this extends):**

| Piece | File | Reused for the timer |
|---|---|---|
| Clock **source** JSON in `006_Graphics` | `Routes/Sources/006_Graphics/003_World Clocks.json` | sibling `004_Production Timers.json` |
| **Distinctive node** (`clock-source`, `◷` badge) | `src/ui/sources/pools.ts` `CLOCK_NODE_CSS` | add `timer-source` (`⧗` badge) |
| **Content-aware dispatch** (a clock feed opens the clock face) | `src/app/main.ts` `hasClock` branch | add `hasTimer` branch → `pluginFor('TIMER')` |
| **LED / analog canvas faces** | `src/editors/clock/index.ts` `drawLed`/`drawAnalog` | `drawLed` becomes the timer's dual read-out (render two, stacked) |
| **rAF lifecycle, DPR-crisp canvas** | `ctx.dispose.raf`, `ctx2d` | identical |
| **MQTT param bridge** (advertise/publish/onParam) | `EditorServices` (see prompter/clock `face` param) | the **GPI + timecode** surface |
| Dispatch parity **test** | `src/editors/dispatch.test.ts` | add `['Timer','timer']`, count 20→21 |

**The delta (what a timer needs that a clock doesn't):**

1. **A count engine** — integer-frame value, direction, run/pause, rollover; ticked off `performance.now()` deltas, not wall-clock.
2. **A transport + keypad panel** — the §3 panel: dual read-out, CHAN/DISPLAY selectors, UP/DN, SEC/FRM, calculator keypad, PRESET, INC/DEC, START/STOP.
3. **Preset bank (20) + follow buffer (8/channel)** — authored state, persisted like other Routes JSON.
4. **The trigger surface** — GPI-in (bus/keyboard/foot-switch → run a preset) and GPI-out (count event → publish), mapped onto the MQTT bus, **not** real opto-isolated pins (see §8 — this stays a front-end sim, consistent with the RFSA finding that TwistRouting is 100 % front-end simulation).

---

## 7. Proposed Build — the "Dual-Display Timer" Source + Editor

### 7A. Source data — `Routes/Sources/006_Graphics/004_Production Timers.json`
Mirrors the clocks leaf: `kind:"video"`, `extraClass:"timer-source"`, `video[]` naming the routable timer feeds — e.g. `"SHOW CLOCK ▾ A/B"`, `"SEGMENT ▴"`, `"BREAK ▾ 2:00"`, `"BACKTIME"`. Optional authored `presets[]` and `format` seed the editor. Drops on any video destination; the `timer-source` class opens the timer editor via the same content-aware dispatch the prompter and clock use.

### 7B. Editor — `src/editors/timer/index.ts` (`match: /\btimer\b|count.?down|stopwatch/i`, order ~7)
A faithful, chirality-aware RC1000 panel wired to a pure count engine:

```
 ┌───────────────────────────── DUAL READ-OUT (canvas, reuses drawLed) ─────────────────────────────┐
 │   A ▸  0 0 : 0 1 : 0 0   ▾ down   ● running        ← channel A (active = brighter bezel)          │
 │   B ▸  1 2 : 3 4 : 5 6   ▴ up     ‖ paused         ← channel B                                    │
 └───────────────────────────────────────────────────────────────────────────────────────────────────┘
   [A|B DISPLAY]  [A|B CHAN]        GPI · SEC/FRM · UP/DN · INPUT · CLR ALL          PRESET ○
   ┌ keypad (chirality-mirrored per Chirality.md) ┐   7 8 9 +    4 5 6 −    1 2 3    SHIFT 0 [START/STOP]
```

- **Count engine** is a **pure module** (`src/domain/…/timer-core.ts`, DOM-free, unit-tested) — `tick(dt)`, `add/sub(frames)`, `nudge(±sec|±frame)`, `rollover`, `format(view)`. Parallels `routing-core`; it is the WASM-portable half.
- **Dual read-out** reuses `drawLed` from the clock editor — render **two** stacked LED rows (A over B), red on black, with the second-tick ring repurposed as a *progress ring* (fraction of preset elapsed) so a countdown reads at a glance. The active (CHAN) channel gets the brighter bezel; the DISPLAY channel gets a small "◂ ON AIR" marker.
- **Transport** = keypad + START/STOP, with the calculator semantics intact (`+ … =`, presets as memories).
- **The bus is the GPI/timecode wiring** (TWIST-MQTT audit): the editor `advertiseParams` the whole control surface — `value.A`, `value.B`, `direction.A/B`, `run.A/B`, `preset`, `displayChannel`, `format` — so an external panel (a Stream Deck / Companion button, another console) can drive it exactly like a real GPI closure ([Ross Video](https://support.rossvideo.com/hc/en-us/community/posts/360040398872-GPI-trigger-to-start-countdown-timer)). `onParam('gpiIn.n')` loads+runs a preset (the GPI-**in** analog); `publishParam('gpiOut.n')` fires at start / end / `@match` (the GPI-**out** analog).
- **Captain's Log** entries on START / STOP / PRESET-recall / end-of-count — the same event surface the Edit-Layout log already uses, so the gallery has an audit trail of every count fired.
- **Fan-out for free.** Because each channel publishes its count to the bus, routing the timer feed to a `clock`/graphic destination lets *that* destination render the running count — i.e. TwistRouting's routing graph **is** the RC1000's "TC out → TCDS/NTDS displays."

### 7C. Why this is the right shape
It reuses everything the clock work introduced (source JSON pattern, `timer-source` node, content dispatch, LED canvas, rAF, MQTT bridge, dispatch test) and adds only the two genuinely new things — a **count engine** and a **transport panel** — keeping the timer a *source* alongside the clock and the prompter, not a bolted-on widget.

---

## 8. What to Skip (front-end sim boundary)

Consistent with the RFSA/Delta finding that TwistRouting is a 100 % front-end simulation, **do not** attempt real hardware: no opto-isolated GPI pins, no SMPTE/EBU or IRIG-B signal generation, no RS-232 framing, no NTP/PoE. Their *behaviour* is modelled on the bus (a param write = a closure; a published count = timecode out). Also skip, for a first cut: drop-frame subtleties beyond a `df` flag, the 15 hardware brightness levels (one CSS brightness is enough), and firmware/key-test menus. Keep: the count-engine math, CHAN/DISPLAY separation, presets, follow buffer, calculator, UP/DN, SEC/FRM, and the GPI-as-bus trigger surface — that is the RC1000's *soul*.

---

## 9. Phased Plan

| Phase | Deliverable | Touches |
|---|---|---|
| **T0** | `timer-core.ts` pure engine + unit tests (frames, rollover, add/sub, nudge, format) | `src/domain/` |
| **T1** | `004_Production Timers.json` source + `timer-source` node badge | `Routes/…`, `pools.ts` |
| **T2** | `src/editors/timer/` — dual LED read-out (reuse `drawLed`) + keypad transport | new editor |
| **T3** | Content-aware dispatch `hasTimer` + blurb + dispatch test (`['Timer','timer']`, 20→21) | `main.ts`, `dispatch.test.ts` |
| **T4** | Presets (20) + follow buffer (8) + calculator + INPUT/backtime modes | editor |
| **T5** | MQTT surface = GPI-in/out + per-channel count "timecode" fan-out + Captain's Log | `EditorServices`, `mqtt`, `captains-log` |
| **T6** | Chirality pass on the keypad/panel (mirror geometry, not `scaleX`) | `chirality.ts` |

---

## 10. One-Paragraph Executive Summary

The RC1000 is a **dual-channel up/down production timer**: two calculator-style count engines in one box, each entering time on a keypad, running up or down, storing 20 presets and chaining up to 8 countdowns, and fanning its count out as SMPTE timecode, to network clocks, over RS-232, and as GPI pulses — while GPI closures fire counts back *in*. TwistRouting already has the *readout* half (the shipped `clock` source: LED-ring and analog faces of time-of-day). The delta to a full RC1000 is a **pure count engine** plus a **transport panel**, wrapped as a **`timer` source** that reuses the clock's LED canvas for a **dual stacked read-out**, uses the **MQTT bus as its GPI/timecode wiring**, logs every count to the **Captain's Log**, and — because a timer is a *source* — fans its running count to any destination through the routing graph the app already is. Ship it as T0–T6 above; keep it a front-end simulation.
