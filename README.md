# TwistRouting — Anthony's Media Workflow Matrix

A browser-based **broadcast signal routing visualizer**, dressed in full LCARS regalia.
It maps the living signal flow of a multi-floor production facility — every stage box,
every camera, every audio channel — onto destinations like control rooms, edit suites,
encoders, and floor rooms. You drag a source onto a destination's input, and the patch
comes alive as a twisting strand of DNA.

The "twist" is the metaphor and the mechanic: each routing point is a **twist**, and the
signals you braid into it are rendered as an animated double helix — two strands (cyan and
magenta) spiraling around each other, the way two feeds wind together into one production.
Route a healthy source and the helix flows clean; route a faulted one and the strand
**corrupts**, flickering red.

---

## What it does

- **Sources** (left ingress panel) — draggable signal nodes, discovered dynamically from the
  `Sources/` tree:
  - **Video** stage boxes, organized by floor
  - **Audio** stage boxes (channel banks), organized by floor
  - **Productions** — finished program outputs exposed as re-routable sources
  - Shape encodes category at a glance: **video reads as a trapezoid**, **audio as a rounded
    pill**, multiplex/group containers stay square.

- **Destinations** (footer tabs) — consumers of signal, discovered from the `Destinations/`
  tree. Each category (Control Rooms, Edit Suites, Encoders, Floors…) becomes a tab group;
  each room is a tab full of **twists**:
  - Video Mixers, Audio Mixers, Multi Viewers, Intercoms
  - Monitors (single-feed)
  - **ISO recorders** with working RECORD / STOP arming and a pulsing REC indicator

- **Patching** — drag a source onto a twist. The twist's helix grows to show what's braided
  in; click the LCARS lip or the left bar to fold/unfold the strand. Open a twist to get a
  **matrix modal** where you drag rows to reorder priority and switcher-input assignments.

- **Fault propagation** — any source whose `status` isn't `OK` (e.g. `LOST CLOCK`) pulses red.
  Route it anywhere and the destination inherits the alarm: the room's LCARS L-bar pulses red
  and the twist's DNA strand corrupts. Faults are visible end-to-end, the way they should be
  in a real plant.

- **Zero-backend discovery** — the whole source/destination tree is just folders of JSON.
  Drop in a new stage box or a new control room and it appears in the UI; no code change.
  Discovery prefers an `index.json` manifest in each folder (so it works on *any* static
  host), and falls back to parsing autoindex HTML when none is present.

## Data model

Everything is plain JSON under two roots:

```
Sources/        # draggable signals
  Audio/<Floor>/<box>.json
  Video/<Floor>/<box>.json
  Productions/<program>.json
Destinations/   # twists that consume signal
  Control Rooms/<tier>/<room>.json
  Edit Suites/<suite>.json
  Encoders/<encoder>.json
  Floors/<floor>/<room>.json
```

A **source** declares its channels, a colour class, a floor, and a `status`:

```json
{ "id": "stagebox-101", "name": "STAGEBOX 101", "prefix": "S101-", "count": 12,
  "extraClass": "audio-studio", "floor": "1st Floor", "items": ["CH 1", "…"],
  "status": "LOST CLOCK" }
```

A **destination** declares its twists, each with what it `accepts` (`video` / `audio` /
`both`), its switcher `inputs`, and limits like `maxVideo` / `maxAudio`:

```json
{ "id": "prod3", "name": "PROD 3", "color": "#646DCC",
  "twists": [ { "name": "Video Mixer", "accepts": "video", "inputs": ["SW IN 1", "…"] } ] }
```

## Running it

Local, no dependencies (uses Python's stdlib server, which provides the autoindex fallback):

```bash
python3 start.py        # serves the UI and opens your browser on a free port
```

Deploy to a static host over FTPS:

```bash
python3 uploadftp.py    # regenerates every index.json manifest, then uploads only the git diff
```

`uploadftp.py` is the smart deployer: it walks `Sources/` and `Destinations/` writing fresh
`index.json` manifests, then uses `git status` to upload **only what changed** (handling
renames and deletions), falling back to a full upload when there's no diff. FTP credentials
come from a local `.env` (`FTP_HOST`, `FTP_USER`, `FTP_PASS`). (`deploy.py` is the older,
simpler full-tree uploader.)

### Front-end layout

The app is plain HTML/CSS/JS — no framework, no build step:

```
index.htm            # shell + all the LCARS styling
js/globals.js        # discovery (listDirectory/fetchJSON), folding, tabs
js/poolVideo.js      # render video source pools
js/poolAudio.js      # render audio source pools
js/visuals.js        # the DNA-helix SVG rendering
js/matrix.js         # twists, routing, the matrix modal, fault logic
js/dragDrop.js       # drag-and-drop patching
js/productions.js    # productions-as-sources
js/topbar.js         # destination tabs / groups
js/app.js            # boot: build the tree, wire everything up
```

---

## Homage to the LCARS designers

This project is a love letter to **LCARS** — the *Library Computer Access/Retrieval System* —
the operating-system aesthetic of the 24th century. None of this look would exist without the
artists who invented it:

- **Michael Okuda**, scenic art supervisor for *Star Trek: The Next Generation*, *Deep Space
  Nine*, *Voyager*, and the films — the man who designed LCARS itself. The sweeping rounded
  "elbows," the flat candy-coloured panels, the confident typography, the idea that a starship
  interface could be *calm* — that's all Okuda. The fan community named the style the
  **"Okudagram"** in his honour, and this app's palette is taken straight from an Okudagram
  colour reference.
- **Denise Okuda**, scenic artist and video supervisor, Mike's collaborator and co-author of
  the *Star Trek Encyclopedia* — half of the partnership that made the future legible.
- **Rick Sternbach**, senior illustrator and technical consultant, who with Mike Okuda gave the
  hardware its grammar (the *Technical Manual*) so every readout felt like it meant something.
- **Gene Roddenberry**, for the conviction that the future's tools should look like they were
  built for people, not against them.

The colours here are credited to the *Okudagrams Color Complete Set Ver. 4.1*
(lcarsmania.com, Toshitin) and live in [`lcars-styleguide.json`](lcars-styleguide.json) —
LCARS Orange, Lilac, Blue Bell, Tomato, Sunflower, Red Alert, and the rest — used exactly as
intended: as flat, functional, beautiful blocks of information.

To Mike, Denise, Rick, and everyone who ever lined up a perfect LCARS elbow at 2 a.m. so a
panel would read right on camera — thank you. We're still trying to live up to the future
you drew.

> *"Tea. Earl Grey. Hot."* — and a clean signal path.

---

Created by **Anthony Peter Kuzub** · [like.audio/20260627/twist-like-audio](https://like.audio/20260627/twist-like-audio/)

LCARS is a trademark/design associated with *Star Trek* and its rights holders. This is a
non-commercial fan tribute and a working engineering tool; no affiliation or endorsement is
implied.
