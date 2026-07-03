# Audit — The Teleprompter (as a Source)

**Companion to:** `Flexible-Software-Media-Production-Requirements-Audit.md` (App IDs `AR.x`), `TwistRouting-vs-Requirements-Delta.md` (L0–L4 scale), `Graphics-Engine-Audit.md` (shares the NRCS/MOS rundown spine), `Production-Entities-People-Places-Things-Audit.md` (talent, name pronunciation), `General-Patch-Matrix-Routing-Audit.md` (source→twist routing).

**What this audits.** How a broadcast **teleprompter** (prompter / autocue) actually works — end to end — and how it maps onto TwistRouting as a **new SOURCE**: a *file input* (the script) that is **routed into a Control Room twist** and driven live (scroll, speed, current position, next block, deployment to on-air prompt heads). Grounded in real systems (CueScript CueiT, Autocue/QTV, Telescript, Fortinge ForPrompt, PromptSmart VoiceTrack, CuePrompter, PTZOptics/NDI, and NRCS/MOS newsroom integration). Client identifiers stripped; technology only.

**The one-line thesis.** A teleprompter is not a display — it is a **shared, position-synchronised document with a transport**. The script is the *source*; the "playhead" (current scroll position + speed + which block is live) is the *state that must be advertised to every prompt head and confidence monitor at once*. In TwistRouting terms: **one file-backed source, fanned out to many destinations, with a live playhead on the bus** — which is precisely the routing metaphor the app already models. This is why a prompter belongs as a *source*, not just another editor.

---

## 0. The Critical Framing — Why a Prompter Is a *Source*, Not a Monitor

The naïve model is "a teleprompter is a screen that scrolls text." That is the **prompt head** (the output), and it is the trivial part — an angled 70:30 beam-splitter glass reflects a horizontally-**mirrored** monitor up to the talent's eyeline while transmitting ~70 % of scene light straight through to the lens, so the presenter reads while looking *down the barrel* of the camera ([Teleprompter.com](https://www.teleprompter.com/blog/how-does-a-teleprompter-work), [Wikipedia](https://en.wikipedia.org/wiki/Teleprompter)).

The **product** is the other side: the **script + its live position**, produced upstream and *distributed* to every head. Exactly mirroring the Graphics-Engine audit's renderer-vs-engine split:

```
        ┌───────────────────────────────────────────────────────────┐
        │        PROMPTER SOURCE  (this audit — the "engine")        │
        │  Script ingest (file) → Rundown/blocks → Transport/Playhead│
        │  (scroll · speed · current line · next block · presenter)  │
        └───────────────────────────────┬───────────────────────────┘
                                         │  position + speed + script  (the "bus")
              ┌──────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
     PROMPT HEAD 1 (mirrored)   PROMPT HEAD 2 (mirrored)   CONFIDENCE MONITOR (un-mirrored)
     on Camera 1 pedestal        on Camera 3 pedestal        on studio wall / talent
              │                          │                          │
              └────────── all render the SAME playhead, frame-locked ┘
```

A prompt head is *dumb* (render this document at this position, flipped). The source is where the depth is: ingest, block structure, timing/read-rate math, transport control, and **the playhead as shared state broadcast to N consumers**. That last property is what makes "teleprompter" a first-class TwistRouting **source with a file input that lands into a control room**, exactly as requested.

**Requirements-catalog note.** There is *no dedicated prompter App ID* in the `AR.x` catalog — like Intercom / IFB / Lighting, the teleprompter is a **TwistRouting extension** (see Delta §"extensions"). Its closest catalog neighbour is the newsroom **NRCS/MOS** spine already documented in the Graphics-Engine audit §"NRCS + MOS" — the prompter and the CG are *siblings that share the same rundown*.

---

## 1. How & Why a Teleprompter Works (the physics + the human factor)

Every design decision below exists to serve ONE goal: **let a person read without looking like they are reading.** ([Teleprompter.com](https://www.teleprompter.com/blog/how-does-a-teleprompter-work))

### 1A. The optical path (the head)
| Element | Role | Why it matters |
|---|---|---|
| **Monitor** (below/behind lens) | Displays the scrolling script | Must be bright enough to reflect but shrouded so the *audience* never sees it |
| **Beam-splitter glass** (~45°) | Reflects text to talent's eyes **and** passes scene light to lens | 70:30 (reflect:transmit is the classic ratio — you trade ~1 stop of light for eyeline) ([GlideGear](https://glidegear.net/blogs/news/the-science-behind-teleprompter-beam-splitter-glass)) |
| **Hood / shroud** | Blocks stray light + hides the monitor from the shot | Without it the glass shows a visible rectangle on camera |
| **Mirror mode (H-flip)** | The monitor image is **horizontally flipped** so it reads correctly *in the reflection* | This is a per-head property: prompt heads are mirrored; a **confidence monitor is NOT** (it's viewed directly) ([Teleprompter Online](https://teleprompteronline.net/), [CuePrompter](https://cueprompter.com/blog/confidence-monitor-vs-teleprompter-which-one-is-best-for-you/)) |

**Key consequence for software:** the *same* playhead must render **mirrored on heads** and **un-mirrored on confidence monitors** — a per-consumer render flag, not a property of the source. (Directly relevant to a multi-destination source.)

### 1B. The human-factor constants (why the numbers are what they are)
| Constant | Typical value | Source of truth |
|---|---|---|
| **Comfortable read rate** | ~**150 wpm** default; news anchors **150–170 wpm**; conversational **110–130 wpm** | [Teleprompter.com speaking-speed](https://www.teleprompter.com/tools/speaking-speed-calculator), [SlideModel](https://slidemodel.com/tools/teleprompter/) |
| **Read-zone** | Text is read near a **fixed vertical band** (upper third), NOT the very top/bottom — talent's eyeline stays steady | Why prompters scroll *to* a marker line rather than top-anchoring |
| **Line length** | Narrow measure (few words/line) | Short eye-travel = eyes appear still = "not reading" |
| **Font size** | Large, adjustable to distance | Talent may be 3–6 m from the glass |
| **High contrast** | White/yellow on black default | Legibility through a 70 %-transmissive glass |

Timing math falls straight out of read rate: **estimated duration = word_count / wpm**. This is the "how long is this block" number the director needs — and it is *identical in spirit* to the graphics engine's timing, and to a rundown's segment timing.

---

## 2. Anatomy of the Prompter Source — the Data Model

A prompter source is a **structured script**, not a blob of text. This is the schema depth that justifies "source with a file input."

```
Script (the file)
 ├─ meta: { title, production, presenter(s), language, wpm_default, created, revision }
 ├─ Block[]                    ← a "story" / "segment" / rundown item
 │   ├─ id, order, slug        ← stable id + run-order position (reorderable)
 │   ├─ presenter              ← who reads this (drives multi-presenter cueing)
 │   ├─ camera / cue           ← which camera this block is shot on (tally alignment)
 │   ├─ estDuration            ← word_count / wpm  (computed)
 │   ├─ status                 ← draft | ready | LIVE | done   ("current deployment")
 │   └─ Runs[]                 ← the actual text, paragraphs, + inline markers
 │        ├─ text
 │        └─ marker            ← cue point / "top of block" / colour tag / [PAUSE] / [AD-LIB]
 └─ playhead (runtime, NOT in the file):
     { blockId, lineOffset, pxOffset, speed_wpm, mode, isRolling, presenter }
```

**File in / state out.** The *file* carries the script + block structure (immutable input, like every other TwistRouting source JSON). The **playhead** is *runtime bus state* — never in the file — and is what gets advertised to heads and (later) MQTT. Keeping these separate is the whole trick: one document, many synchronized viewers.

### 2A. What "current position" and "current deployment" mean
The user's brief calls out *"current position and current deployment."* Precisely:
- **Current position** = the **playhead**: the pixel/line offset within a block, plus *which block* is live. This is the shared cursor every head renders against.
- **Current deployment** = *which prompt heads/confidence monitors this script is pushed to, and which block is armed to air* — i.e. the **routing** of the source to destinations **plus** the per-block `status: LIVE`. "Deploy the script to Studio A's three heads and confidence wall; block 4 is live" is a routing statement — TwistRouting's home turf.

---

## 3. The Transport — Scroll, Speed, and Auto-Crawl (three control modes)

The "speed auto crawl … etc." in the brief is the **transport**. Real systems offer three, and a serious source supports all three:

| Mode | How position advances | Who drives it | Real-world |
|---|---|---|---|
| **1. Manual / operator scroll** | A **prompt operator** turns a knob / slider / foot pedal; speed is proportional to displacement and **reversible** | Dedicated operator ("prompter op") | CueScript **CSSC** desktop, **CSFSC** foot, **CSSCW** wireless hand controllers — a slider for speed+direction with quick-jump buttons ([CueScript](https://www.cuescript.tv/product-profile.php?pid=CSSCW-Wireless-Hand-Scroll-Control)) |
| **2. Constant auto-crawl** | Text scrolls at a fixed **wpm**; operator nudges | Set-and-forget; speeches, credits roll | The classic "**crawl**"; default ~150 wpm ([SlideModel](https://slidemodel.com/tools/teleprompter/)) |
| **3. Voice-tracked (ASR)** | Speech recognition **follows the talent's words**, auto-scrolls, **stops on pause / ad-lib, resumes on return** | The talent themselves — no operator | PromptSmart **VoiceTrack** (patented, on-device, 15 languages, no calibration/internet) ([PromptSmart](https://promptsmart.com/)); Teleprompter.com voice-scroll ([Teleprompter.com](https://www.teleprompter.com/blog/voice-scroll-teleprompter-app-new-feature)) |

**Why three modes exist.** Manual = live news where scripts change and the op must hover/hold on an ad-lib. Auto-crawl = scripted monologue / end-credit roll. Voice-track = single-presenter, operator-less shoots (corporate, streamer, remote). A production-grade source **exposes speed/direction/mode as controllable parameters** so *any* of these controllers (or automation, or MQTT) can drive it — the controller is just an input to the playhead.

**Transport commands (the verb set):** `roll / stop`, `speed±`, `reverse`, `jump-to-marker`, `next-block / prev-block`, `arm-block (deploy to air)`, `top-of-script`, `hold`. Note the deliberate echo of the Graphics-Engine **take / next / update / out** and the routing-core **take / clear** — same control grammar, different payload.

---

## 4. Ingest — the "File Input" (what a script can be loaded from)

The brief: *"a SOURCE with a file input."* Real prompters ingest from a wide funnel; TwistRouting should start with files and grow toward the live feeds.

| Ingest | Format | Notes / real-world |
|---|---|---|
| **Plain text / Markdown** | `.txt`, `.md` | Simplest; paragraphs → runs; blank lines → blocks |
| **Rich docs** | `.docx`, `.rtf`, Google Docs | Preserve bold/size; the dominant real newsroom input |
| **PDF / script formats** | `.pdf`, `.fdx` (Final Draft) | Screenplay/segment scripts |
| **Structured rundown** | `.json`, CSV | Blocks + presenter + camera + timing already structured (best fit for TwistRouting) |
| **NRCS live (MOS)** | XML over TCP | The **newsroom** path: the NRCS (iNews/ENPS/Octopus) owns the run-order; **MOS** pushes rundown + story edits to the prompter **in real time**, auto-syncing re-orders and last-minute changes ([NewscastStudio](https://www.newscaststudio.com/2024/09/11/broadcast-teleprompters-2110-workflows/), [Octopus](https://www.octopus-news.com/our-8-techtacles-teleprompters/), [StudioPrompter](https://www.studioprompter.com/MOS-protocol.html)) |

**Parsing rule of thumb:** blank line / heading → **new block**; `[bracketed]` or coloured text → **marker**; `**bold**` → emphasis kept for legibility. This makes even a dumped `.txt` immediately usable while richer formats add block/presenter/camera metadata.

**MOS is the shared spine.** The Graphics-Engine audit already lands NRCS/MOS for the CG. **The prompter is the other MOS client on the same rundown** — same run-order, same story ids. Building the prompter source to speak the *same block/rundown model* as the graphics engine means one newsroom feed drives both. (See §7.)

---

## 5. Deployment & Distribution — one source, many heads (the routing story)

This is where the prompter *is* TwistRouting. A single script fans out to many synchronized consumers, each with its own render flags:

```
                         ┌── Prompt Head (CAM 1)  → mirrored, big font
 PROMPTER SOURCE ───────►├── Prompt Head (CAM 3)  → mirrored, big font
   (script + playhead)   ├── Confidence Monitor   → un-mirrored, smaller
                         └── Presenter's tablet    → un-mirrored, personal notes on
```

Distribution transports, real-world → maturity target:
- **SDI / composite** from a prompter output card (legacy, still common).
- **IP: ST 2110 / NDI / IPMX.** CueScript adopted **ST 2110 in 2019** at *both* ends (CueB IP render engine → CSM IP monitors); NDI prompting delivers the script over the LAN to any NDI display ([NewscastStudio](https://www.newscaststudio.com/2024/09/11/broadcast-teleprompters-2110-workflows/), [PTZOptics](https://ptzoptics.com/ndi-teleprompter/)).
- **Cloud / remote / browser.** Prompting software now runs virtualized/cloud for spin-up productions; browser prompters with remote control (RemoteCue) let a director drive a presenter's scroll from anywhere ([NewscastStudio](https://www.newscaststudio.com/2024/09/11/broadcast-teleprompters-2110-workflows/), [RemoteCue](https://remotecue.app/)).

**Per-consumer render flags** (properties of the *destination twist*, not the source): `mirror (on/off)`, `fontScale`, `theme`, `showMarkers`, `presenterFilter` (a head can show only its presenter's blocks). Same playhead, different presentation — the reason mirror lives on the head, not the script (§1A).

**Tally / camera alignment.** Each block names a camera; when that block is armed LIVE, the source can assert which camera is "hot" — aligning with the existing **signaling / tally** row (see Delta AR.1.5) so the prompter and the switcher agree on which camera the talent is reading to.

---

## 6. TwistRouting Integration — Concrete Design

### 6A. As a *VIDEO* SOURCE (the engine's output, routable anywhere there's video) — **BUILT**
> **Refinement (2026-07-01, per brief "it should be creating a video source that can be routed to a multiviewer or to a monitor or a person — anywhere there is a video").** The prompter is not merely a "prompter-kind" source that only prompt heads understand — its *rendered output is a **video signal***. So it routes onto **any video destination**: a multiviewer input, a wall monitor, or a person's prompt-head / confidence / camera twist. One playhead → many synchronised **video** renders (mirrored head · direct confidence · clean program), each a draggable feed.

Implemented as `Routes/Sources/008_Prompter/` (007 is `People`). Each entry is a teleprompter **engine** whose `video[]` field lists its output feeds — the `kind:"video"` marker forces the source panel to render them as **video** nodes (`inferPoolKind` in `src/ui/sources/pools.ts` gives explicit `kind`/`video`-extraClass priority over the `items→audio` default; `renderVideoPool` emits one draggable video node per `video[]` entry). `blocks[]` carries the script payload (shared Rundown/Block spine, §7).

```jsonc
// Routes/Sources/008_Prompter/001_MORNING SHOW.json
{
  "id": "prompter-morning-show",
  "name": "MORNING SHOW",
  "title": "TELEPROMPTER ENGINE",     // name-super / label (a graphical element)
  "color": "#C9A227",
  "kind": "video",                     // → renders as VIDEO nodes (routable anywhere video goes)
  "extraClass": "prompter-source",     // → the beam-splitter node shape
  "wpm": 150,
  "video": ["PROMPT HEAD ▷ MIRRORED", "CONFIDENCE ▷ DIRECT", "PROGRAM ▷ CLEAN"],
  "blocks": [
    { "id": "b1", "slug": "OPEN",     "presenter": "ANCHOR 1", "camera": "CAM 1", "status": "ready", "text": "Good morning..." },
    { "id": "b2", "slug": "HEADLINES","presenter": "ANCHOR 2", "camera": "CAM 2", "status": "ready", "text": "Our top stories..." }
  ]
}
```

Consistent with the app's **zero-backend discovery** (drop a JSON in `Routes/**` → it appears). A drag-and-drop *upload* (the literal "file input") parses `.txt/.md/.docx` into this shape client-side — reusing the same "Load File" idiom already proven in **Meter Input** (`file.click()` → `URL.createObjectURL`, `src/editors/meter-input/index.ts:410`).

**Editor-on-drop.** Because the feed *is* video, it lands on plain monitors that have no prompter smarts of their own — so dispatch is **content-aware**: a prompter feed routed onto *any* twist opens the PROMPTER engine editor (`src/app/main.ts` `openEditorForTwist` checks for a `.prompter-source` node before falling back to the twist's name-editor). Drop the script on Monitor 1 → the operator console opens.

### 6B. As a DESTINATION twist (the Control Room "prompt head")
Add prompter twists to Control-Room destination JSONs, using a new `accepts` value and a natural home row (there is already a **`speaker`** row and a **`graphics`** row — a `prompter` row fits the taxonomy discovered in `Routes/Destinations/**`):

```jsonc
// in a Control Room destination file
{ "name": "PROMPT HEAD 1", "accepts": "prompter", "maxScript": 1, "row": "prompter", "mirror": true  },
{ "name": "PROMPT HEAD 2", "accepts": "prompter", "maxScript": 1, "row": "prompter", "mirror": true  },
{ "name": "CONFIDENCE",    "accepts": "prompter", "maxScript": 1, "row": "prompter", "mirror": false }
```

Routing a prompter source onto these twists **is** "deploying the script into the control room" — the current-deployment concept, expressed in the routing metaphor the app already owns (`take/clear` over the `RouteGraph`, see `src/domain/routing-core`). `mirror` is the per-head render flag from §5.

### 6C. As an EDITOR (the operator surface — the prompter op's console)
A new `src/editors/prompter/` plugin (auto-registered by the glob in `src/editors/registry.ts:14` — "drop a folder", no central edits), matching `/prompt|autocue|telepromp/i`. It renders the operator console:

```
┌──────────────────────────────────────────────────────────────────┐
│ PROMPTER · MORNING SHOW          [Load File] [MOS] wpm:150 ◀▶ ROLL │  ← transport
├───────────────┬──────────────────────────────────────────────────┤
│ RUNDOWN       │   ┌── read-zone marker ─────────────────────────┐ │
│ 1 OPEN   ●LIVE│   │  ...welcome to the Morning Show. Today we    │ │  ← big
│ 2 WEATHER ready│  │  are following the developing story out of   │ │    scrolling
│ 3 SPORTS  draft│  │▶ the west end, where crews have been...      │ │    preview
│ ...           │   └──────────────────────────────────────────────┘ │
│ [+block][sort]│   speed ▓▓▓▓▓░░░  mode: [Manual|Crawl|Voice]        │
└───────────────┴──────────────────────────────────────────────────┘
```

Operator surface responsibilities:
- **Rundown pane** — reorderable blocks, per-block `status` (draft/ready/LIVE/done), estimated + running time (`word_count/wpm`), presenter + camera chips.
- **Preview** — the live playhead with the fixed read-zone marker; big legible type.
- **Transport** — Manual / Crawl / Voice-track mode; speed slider (bidirectional); `next/prev/arm/jump-to-marker`.
- **Deploy readout** — which heads/confidence monitors this script is currently routed to, pulled from the twist's `sources` (the editor already receives resolved `ctx.sources`, no DOM scraping — `src/editors/types.ts:22`).

This exactly parallels the existing editor contract; the prompter is just the 14th editor.

### 6D. On the BUS (MQTT advertising — the playhead as shared state)
The prompter's playhead is the textbook case for the **TwistBus** proposal (`TWIST-MQTT-Advertising-Audit.md`). The editor advertises + publishes params via `ctx.services.advertiseParams?/publishParam?` — the *same* mechanism Meter Input already uses (`src/editors/meter-input/index.ts:431`):

```
advertiseParams([
  { name: 'block',        type: 'string',  writable: true  },  // current block id (deployment)
  { name: 'position',     type: 'number', unit: '%', writable: true },  // playhead within block
  { name: 'speed',        type: 'number', unit: 'wpm', writable: true },
  { name: 'mode',         type: 'string',  writable: true },   // manual|crawl|voice
  { name: 'rolling',      type: 'boolean', writable: true },
  { name: 'presenter',    type: 'string',  writable: false },
  { name: 'est_remaining',type: 'number', unit: 's', writable: false },
])
```

Because these are **writable**, a hand controller, foot pedal, voice-tracker, MQTT client, or the director can *all* drive the playhead, and every head subscribes — solving multi-head sync the same way real IP prompters do, and giving the "one source → many synchronized consumers" property for free. Every position change becomes a bus event (per the MQTT audit's "advertise every route/resource/event" thesis).

---

## 7. Prompter × Graphics Engine — the shared rundown

The prompter and the CG are **not independent**. In a newsroom both are MOS clients of the *same* NRCS rundown (Graphics-Engine audit §NRCS/MOS). Designing the prompter's block model to be the **same run-order object** the graphics engine consumes means:
- One imported rundown drives **both** teleprompter text **and** the lower-third `{name, title}` for the person speaking that block (Graphics-Engine §2A name-super).
- Re-ordering a story reorders prompter blocks *and* re-cues the matching graphics.
- The block's `presenter` feeds the Production-Entities "name pronunciation / talent" data (that audit §talent) and the graphics name-super simultaneously.

**Recommendation:** define **one shared `Rundown/Block` type** in `src/domain/` consumed by prompter, graphics, and (eventually) the MOS ingest — don't fork two block schemas.

---

## 8. Maturity Assessment (L0–L4) and the Delta

Using the Delta scale (L0 absent · L1 named · L2 simulated GUI · L3 real front-end logic · L4 production-real):

| Capability | Today | Achievable in TwistRouting | Real target |
|---|---|---|---|
| Prompter **source** (file → blocks) | **L0** | **L3** — real client-side parse of `.txt/.md/.docx` → block model, discovered from `Routes/**` | L4 = MOS/NRCS live feed |
| **Transport** (scroll/speed/reverse/crawl) | **L0** | **L3** — genuine playhead math + rAF scroll (like Meter Input's real-time loop) | L4 = hardware hand/foot controllers over CueTALK/serial |
| **Voice-track** (ASR auto-scroll) | **L0** | **L2/L3** — Web Speech API demo (browser ASR) matching words to script | L4 = robust on-device model (PromptSmart-class) |
| **Multi-head deployment** (source→twists) | **L0** | **L3** — real routing over `RouteGraph`; per-head mirror flag | L4 = ST 2110/NDI to real prompt monitors |
| **Playhead on the bus** | **L0** | **L3** — MQTT publish/subscribe via TwistBus | L4 = broker + heads as real subscribers |
| **Rundown timing** (wpm → duration) | **L0** | **L3** — `word_count/wpm` math, running clock | L4 = as-run reconciliation |
| **Confidence monitor** (un-mirrored view) | **L0** | **L2** — a destination render mode | L4 = physical display |

**Net delta.** A prompter source is a *high-value, low-risk* addition: it reuses four things the codebase already has — the source-JSON discovery, the "Load File" idiom (Meter Input), the editor plugin auto-registry, and the MQTT param bridge. Nothing here needs a backend to reach **L3**, which is the ceiling for everything else in the app. The only genuinely new domain logic is the **script parser** and the **playhead transport** — both self-contained and testable, exactly like `routing-core`.

---

## 9. Build Order (recommended)

1. **Shared `Rundown/Block` type** in `src/domain/` (co-designed with the graphics engine — §7).
2. ✅ **Prompter VIDEO source** — `Routes/Sources/008_Prompter/` (5 show engines), `video[]` feeds routable to any video destination; `kind:"video"` + `renderVideoPool` support in `src/ui/sources/pools.ts`. *(Still to add: the drag-drop `.txt/.md/.docx` file parser.)*
3. **Prompter editor** (`src/editors/prompter/`) — scrolling on-air feed + speed/size/mirror is BUILT; still to add the rundown pane + Manual/Crawl/Voice transport + reading-from-the-routed-source's `blocks[]`.
4. ✅ **Routable anywhere there's video** — the feed is plain video, so it drops onto multiviewers/monitors/person twists directly; content-aware dispatch opens the engine editor on drop (`src/app/main.ts`). *(Per-consumer mirror/confidence render flag on the destination still to wire.)*
5. **Playhead on MQTT** — advertise/publish the params in §6D; make a second head subscribe to prove sync.
6. **Voice-track (stretch)** — Web Speech API word-matching; fall back to crawl.
7. **MOS ingest (stretch, L4)** — the newsroom path; shares the block model with graphics.

---

## Sources

- How prompters work / beam splitter: [Teleprompter.com — How does a teleprompter work](https://www.teleprompter.com/blog/how-does-a-teleprompter-work) · [Wikipedia — Teleprompter](https://en.wikipedia.org/wiki/Teleprompter) · [GlideGear — beam-splitter glass science](https://glidegear.net/blogs/news/the-science-behind-teleprompter-beam-splitter-glass) · [DIY Video Studio](https://www.diyvideostudio.com/what-is-a-teleprompter-and-how-it-works/)
- Read rate / mirror / confidence monitor: [Teleprompter.com speaking-speed calculator](https://www.teleprompter.com/tools/speaking-speed-calculator) · [SlideModel teleprompter tool](https://slidemodel.com/tools/teleprompter/) · [Teleprompter Online (mirror mode)](https://teleprompteronline.net/) · [CuePrompter — confidence monitor vs teleprompter](https://cueprompter.com/blog/confidence-monitor-vs-teleprompter-which-one-is-best-for-you/)
- Professional software + controllers + protocol: [CueScript CueiT software](https://www.cuescript.tv/cueiT-software.php) · [CueScript CSSCW wireless hand control](https://www.cuescript.tv/product-profile.php?pid=CSSCW-Wireless-Hand-Scroll-Control) · [CuePrompter (free)](https://cueprompter.com/)
- Voice tracking: [PromptSmart / VoiceTrack](https://promptsmart.com/) · [PromptSmart Pro (App Store)](https://apps.apple.com/us/app/promptsmart-pro-teleprompter/id894811756) · [Teleprompter.com voice-scroll](https://www.teleprompter.com/blog/voice-scroll-teleprompter-app-new-feature)
- Newsroom / MOS / IP: [NewscastStudio — teleprompters & 2110 workflows](https://www.newscaststudio.com/2024/09/11/broadcast-teleprompters-2110-workflows/) · [Octopus Newsroom — teleprompters](https://www.octopus-news.com/our-8-techtacles-teleprompters/) · [StudioPrompter — MOS protocol](https://www.studioprompter.com/MOS-protocol.html) · [Fortinge ForPrompt](https://fortinge.com/forprompt/) · [Cuez — what is an NRCS](https://cuez.app/blog/what-is-an-nrcs-the-newsroom-computer-system-explained/)
- IP / NDI / remote: [PTZOptics NDI teleprompter](https://ptzoptics.com/ndi-teleprompter/) · [RemoteCue](https://remotecue.app/)
</content>
</invoke>
