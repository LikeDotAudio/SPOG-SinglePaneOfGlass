# Audit — The Studio Chat Room (Production ⇄ Talent Dialog)

**Companion to:** `Production-Entities-People-Places-Things-Audit.md` (the Person entity this addresses), `TWIST-MQTT-Advertising-Audit.md` (the retained bus this rides), `Teleprompter-Source-Audit.md` (the only existing broadcast free‑text field), `RC1000-Dual-Timer-Audit.md` (the source‑as‑editor pattern), and `Editor-Chirality-Audit.md` (handedness of the composer).

**What this audits.** A **text chat room attached to a studio**, letting the **production** and the **people in the room** (talent) exchange **text, images, and links** as a two‑way dialog — production→people, people→production, and room broadcast. It maps the feature onto the existing room/person model, the live MQTT `TwistBus`, and the editor plugin system, and marks the front‑end‑simulation boundary.

**The one-line thesis.** *IFB and intercom carry the **voice**; the Captain's Log narrates the **routing**. Neither carries a **conversation** — a chat room is the missing append‑only, multimedia, person‑addressed dialog that the studio already has every wire to deliver.*

---

## 0. The Critical Framing — Chat vs. Intercom/IFB vs. the Captain's Log

The studio already has three "comms" surfaces. A chat room is a *fourth kind*, and confusing it with the other three is the main design risk. They differ on three axes — **medium**, **shape**, and **direction**:

| Surface | Medium | Shape | Direction | Where |
|---|---|---|---|---|
| **IFB** (`src/editors/ifb/`) | audio (mix‑minus + interrupt) | live, momentary (hold‑to‑talk) | production → one talent's earpiece | per‑talent strip |
| **Intercom** (`src/editors/intercom/`) | audio (talk/listen keys) | live, latched | crew ⇄ crew keys | per‑room key‑panel |
| **Captain's Log** (`src/ui/console/captains-log.ts`) | text (auto‑narrated) | append‑only journal | system → everyone (read‑only) | console‑wide |
| **Chat Room** *(this audit)* | **text + image + link** | **append‑only dialog** | **production ⇄ people (addressed)** | **per‑room** |

**Design reading.** A transcript view is *dumb* (render this list of messages, newest last). The depth is everywhere else: an **append‑only message log** (not an overwriting value), **two‑sided addressing** (who is talking to whom), **attachment handling** (images and links, not just strings), and **presence** (who is in the room). That is the same split the sibling audits make — *"a display is dumb (render this count)"*, *"a prompt head is dumb (render this document, flipped)"* — the state lives in the source/log, not the renderer.

**Why text alongside voice.** IFB/intercom is ephemeral and interruptive — you cannot hand a talent a *URL*, a *name spelling*, or a *shot reference* down an earpiece, and you cannot talk over a live read. A studio chat is the quiet, persistent, referenceable back‑channel: *"your super reads ELENA MARSH — confirm spelling"*, *"rundown moved, block C is now first — [link]"*, *"here's the graphic we'll key over you — [image]"*.

```
        PRODUCTION (bridge crew · auth role)                 PEOPLE (talent in the room)
        ┌───────────────────────────────┐                   ┌───────────────────────────┐
        │  Captain / Director / TD / …   │                   │  ELENA MARSH  · Host       │
        │  types in the CHAT ROOM editor │   rooms/<room>/    │  (own device / a 2nd       │
        │                                │ ◄── chat/msg/<seq> │   console persona)         │
        └───────────────┬───────────────┘   retained MQTT    └─────────────┬─────────────┘
                        │                    ▲       ▲                      │
                        └────────────────────┘       └──────────────────────┘
                          publishRaw(...)               subscribe('chat/#', ...)
                            append, never overwrite — every seq is its own retained topic
```

---

## 1. How & Why It Works — the Production Job

| Job | What the chat carries | Why not IFB/intercom |
|---|---|---|
| **Name‑super / spelling confirmation** | text: *"super reads 'ELENA MARSH · ANCHOR' — ok?"* | must be *seen* letter‑exact, not heard |
| **Rundown / block changes** | **link** to the rundown item; text note | a URL cannot go down an earpiece |
| **Graphic / shot proofing** | **image**: the lower‑third or key we'll use | purely visual |
| **Quiet cueing during a live read** | text: *"wrap in 30"*, *"toss to remote"* | cannot talk over the talent |
| **Remote contributor coordination** | text + link (join URL, dial‑in) | remote talent may have no IFB yet |
| **Accessibility / loud‑floor fallback** | text mirror of a verbal cue | earpiece unreliable on a noisy floor |

The participants are exactly the two populations the app already models: the **production** = the console operator under an `auth` **bridge‑crew role** (`src/platform/auth.ts` — Captain/EP, Director, TD, Ops, Comms…), and the **people** = the **Person** entities routed into the room (`Routes/People/**`, each `{ id, name, role, color, title }`). The chat is the dialog **between those two sides**, scoped to one room.

---

## 2. Anatomy of the Panel — the Editor Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CHAT ROOM · PROD 3                              speaking as ▾ [DIRECTOR]  │  ← persona/identity
├───────────────────────────────────────────────┬──────────────────────────┤
│  TRANSCRIPT (append-only, newest last)         │  IN THE ROOM (presence)   │
│                                                │  ● ELENA MARSH   Host     │
│  ◀ ELENA MARSH · Host        10:31:04          │  ● DARIUS COLE   Co-Host  │
│    is the super spelling right?                │  ○ REMOTE 1      Contrib. │
│                                                │  ───────────────────────  │
│  DIRECTOR ▶                  10:31:22          │  crew: DIRECTOR (you), TD │
│    confirmed — ELENA MARSH · ANCHOR            │                           │
│                                                │  addressing:              │
│  DIRECTOR ▶ (to ELENA)       10:32:00          │   ◉ whole room            │
│    [🖼 lower-third-v2.png]                      │   ○ ELENA MARSH  (DM)     │
│                                                │                           │
│  ◀ ELENA MARSH · Host        10:32:41          │                           │
│    perfect. rundown link? [🔗 block-C]         │                           │
├───────────────────────────────────────────────┴──────────────────────────┤
│ [ type a message…                                    ] [🖼 img] [🔗 link] [▷]│  ← composer
└──────────────────────────────────────────────────────────────────────────┘
```

Three regions: **transcript** (the append log), a **participant / presence rail** (People in the room + which crew are online, and the **to:** addressing selector), and a **composer** (text field + attach‑image + insert‑link + send). The `speaking as ▾` control is the identity: on a single console it defaults to the current `auth` role but can switch persona to *simulate* a talent's side (see §9 — this is the front‑end‑sim stand‑in for talent's own devices). Chirality (per `Editor-Chirality-Audit.md`) swaps composer/rail sides for a left‑handed console.

---

## 3. The Data Model

A chat room is an **append‑only list of messages** scoped to a room. The message mirrors `LogMsg` (`src/platform/mqtt/types.ts`) — same `ts` / `full_id` discipline — but adds authorship, addressing, and an attachment.

```
ChatRoom (attached to a Production/room)
 ├─ room     : <room display name>            → topic rooms/<slug>/chat/**
 ├─ seq      : monotonic message counter       (retained at …/chat/seq)
 ├─ participants[]  ← People routed into the room  { id, name, role, color }
 │                    + console crew (auth role, transient presence)
 └─ Message[]  (append-only, each retained at …/chat/msg/<seq>)
      ├─ id, seq, ts                            ← ordering + dedupe
      ├─ from : { side:'production'|'person', id, name, role, color }
      ├─ to   : 'room' | <personId>             ← dialog addressing (DM vs broadcast)
      ├─ kind : 'text' | 'image' | 'link'
      ├─ text?: string                          ← body, or link caption
      ├─ href?: string                          ← link target
      ├─ media?: string                         ← image data-URI / object-URL (sim: see §8/§9)
      └─ full_id                                ← self-echo suppression (comMQTT rule)
```

```ts
// src/editors/chat/state.ts — pure data, kept OUT of the DOM (per audio-mixer/state.ts convention)
export type ChatSide = 'production' | 'person';
export interface ChatAuthor { side: ChatSide; id: string; name: string; role: string; color: string }
export interface ChatMsg {
  id: string; seq: number; ts: number;
  from: ChatAuthor;
  to: 'room' | string;              // 'room' broadcast, or a personId for a direct message
  kind: 'text' | 'image' | 'link';
  text?: string; href?: string; media?: string;
  full_id: string;                  // === bus.sessionId of the sender
}
```

**Invariants** (the shape that keeps it correct):

1. **Append‑only, never overwrite.** Each message is published to its *own* retained topic `…/chat/msg/<seq>` — exactly how the Captain's Log writes `Twist/log/<voyage>/<entry>` (`src/platform/mqtt/log-bridge.ts`). A late‑joining console replays the full history from retained topics; `…/chat/latest` gives a fast first paint.
2. **`full_id` = self‑echo suppression.** A sender drops any inbound message whose `full_id === bus.sessionId` — the same rule every `ValueMsg`/`LogMsg` payload already follows.
3. **Ordering by `(seq, ts)`.** `seq` is authoritative; `ts` is display + tie‑break. `Date.now()` at the call site (editors may use it; only *workflow scripts* may not).
4. **Addressing is on the message, not the topic.** A DM still publishes under the room's chat tree (so it's one subscription) but carries `to: <personId>`; the renderer filters/badges it. Keeps the topic tree flat and the subscription single.

---

## 4. The Dialog — Production ⇄ People Addressing

The core requirement — *"a dialog between production room and people, and people and the production"* — is the `from.side` × `to` matrix:

| `from.side` | `to` | Meaning | Rendered |
|---|---|---|---|
| `production` | `room` | crew announces to everyone | left‑badged crew colour, room‑wide |
| `production` | `<personId>` | crew DMs one talent (*"ELENA, tighten to camera 2"*) | `▶ (to ELENA)` badge |
| `person` | `room` | talent asks the whole room | right‑badged person colour |
| `person` | `<personId>` | talent → another talent (moderated; optional) | DM badge |

Two sides, three real flows (prod→room, prod→person, person→prod) — which is precisely the bidirectional dialog requested. The **identity** on each side is already in the app:

- **Production side** = `src/platform/auth.ts` current `Role` → `{ id, name (Captain/Director/…), color }`. `onRoleChange` keeps the composer's `speaking as` label live.
- **People side** = the `Person` leaves routed into the room — `ctx.sources` / `ctx.siblings` already resolve the People whose `kit` routes into this room, each with `{ id, name, role, color }` from `Routes/People/**`.

---

## 5. I/O Map — the Topic Tree the Bus Replaces

The "wiring" is the retained MQTT projection (`src/platform/mqtt/topics.ts`, `TwistBus`). A chat room is a small subtree hung off the room the app **already advertises**:

| Topic (under the `Twist/` root) | Payload | Retain | TwistRouting analog |
|---|---|---|---|
| `rooms/<room>/chat/seq` | `{ value:<n> }` | ✓ | the message counter (like `log/latest`) |
| `rooms/<room>/chat/msg/<seq>` | `ChatMsg` | ✓ | one entry (like `log/<voyage>/<entry>`) |
| `rooms/<room>/chat/latest` | `ChatMsg` | ✓ | fast first paint |
| `rooms/<room>/chat/presence/<id>` | `{ name, role, color, typing, ts }` | ✓ | who's in the room (net‑new) |

`roomTopic(displayName)` and the room's `…/config` advertisement already exist (`src/platform/mqtt/advertise.ts` `walkDestinations`), so the chat tree slots in with **zero** new topic infrastructure — it's `getBus().publishRaw('rooms/<room>/chat/msg/<seq>', msg, { retain: true })` and `getBus().subscribe('rooms/<room>/chat/#', cb)`. This is the same one‑wire tap `startLogBridge` uses for the Captain's Log.

---

## 6. Map to TwistRouting — What Exists vs. the Delta

**Already shipped (what a chat room reuses, not builds):**

| Need | Already in code |
|---|---|
| A room to attach to | `Production` under `Routes/Destinations/**`, topic `rooms/<slug>` |
| The people in the room | `Person` leaves `Routes/People/**` → `ctx.sources`/`ctx.siblings` (`{id,name,role,color,title}`) |
| Producer identity | `src/platform/auth.ts` roles + `onRoleChange` |
| Append‑only, timestamped, retained text stream | Captain's Log `LogMsg` + `log-bridge.ts` (`log/<voyage>/<entry>`, `full_id`) |
| Live free‑text round‑trip over the bus | prompter `script` param (`onParam`/`publishParam` echo‑safe write) |
| Pub/sub message escape hatch | `TwistBus.publishRaw` / `subscribe` (`src/platform/mqtt/`) |
| The editor host, overlay, capability gate | plugin registry + `openEditorForTwist` + `overlay.ts` |
| Composer/transcript widgets | `src/ui/dom.ts` `el`, `src/ui/tip.ts`, `src/ui/timers.ts` `Disposer` |

**The delta (what a chat needs that nothing else provides):**

1. **A `ChatMsg` type + append log** — `LogMsg` is close but has no `from`/`to`/`kind`/attachment. Net‑new `state.ts`.
2. **Two‑sided addressing** (`from.side` × `to`) — no existing surface has per‑person message addressing.
3. **Attachments** — images and links. Nothing today carries a non‑string payload; prompter's `script` is the *only* broadcast free‑text and it's a single overwriting value.
4. **Presence** — who is in the room / typing. Net‑new retained `…/presence/<id>`.
5. **A `chat/` editor folder** — plus the one `dispatch.test.ts` count bump (21 → 22).
6. **A persona switch** — the front‑end‑sim stand‑in for talent typing on their own devices (§9).

---

## 7. Proposed Build — the "Chat Room" Editor

### 7A. Attach point — a room facility, *not* a graphics source

Two ways an editor opens (per §4 of the registry): a **twist inside a room** (click it), or a **dropped source** that content‑dispatches (clock/chronos/prompter). A chat is inherently **room‑scoped and bidirectional**, so it wants to be a **room twist**, not a routable graphics feed. Add one twist to a Production:

```jsonc
// Routes/Destinations/001_Control Rooms/001_Primary/001_Production 1.json  → twists[]
{ "name": "GREEN ROOM CHAT", "accepts": "both", "row": "comms",
  "tip": { "lead": "Text/-image/-link dialog between production and the talent in this room." } }
```

The plugin `match`es that name; the editor reads `ctx.production.name` for the room and `ctx.siblings`/`ctx.sources` for the People. *(Optional, secondary:* a `extraClass:"chat-source"` Graphics leaf + a `hasChat` branch in `openEditorForTwist` — only if a routable "talkback text" overlay is ever wanted. Not recommended as the primary shape.)*

### 7B. Editor — `src/editors/chat/`

Multi‑file, following `ifb/` (`index.ts` plugin · `state.ts` pure data · `view.ts` DOM · `styles.ts` CSS):

```ts
// src/editors/chat/index.ts
const plugin: EditorPlugin = {
  id: 'chat',
  title: 'CHAT ROOM · PRODUCTION ⇄ TALENT',
  order: 9,
  match: (n) => /\bchat\b|green.?room|talkback.?text|message/i.test(n),
  requiredCaps: ['comms'],                        // Comms role (or admin) — matches IFB/intercom
  blurb: 'Text, image and link dialog between production and the people in this room.',
  render(host, ctx) {
    injectChatStyles();
    const bus = getBus();
    const room = roomTopic(ctx.production.name);  // rooms/<slug>
    const me = authorFromRole();                  // production side ← src/platform/auth.ts
    const people = ctx.siblings /* + ctx.sources */.map(personAuthor);   // the room's talent
    const view = buildChatView(host, { me, people, ctx });

    // history + live: replay retained, then stream
    const unsub = bus.subscribe(`${room}/chat/#`, (topic, payload) => {
      const m = payload as ChatMsg;
      if (m?.full_id === bus.sessionId) return;   // self-echo suppression
      if (topic.includes('/presence/')) view.setPresence(payload);
      else if (topic.endsWith('/msg') || /\/msg\/\d+$/.test(topic)) view.append(m);
    });
    ctx.dispose.add(unsub);

    view.onSend((draft) => {                       // draft: { to, kind, text?, href?, media? }
      const seq = view.nextSeq();
      const msg: ChatMsg = { ...draft, id: `${bus.sessionId}:${seq}`, seq, ts: Date.now(),
                             from: view.persona(), full_id: bus.sessionId };
      bus.publishRaw(`${room}/chat/msg/${seq}`, msg, { retain: true });
      bus.publishRaw(`${room}/chat/latest`, msg, { retain: true });
      bus.publishValue(`${room}/chat/seq`, seq);
      view.append(msg);                            // optimistic local echo
      logAction(`Chat · ${msg.from.name} → ${msg.to === 'room' ? 'room' : msg.to}`);  // Captain's Log tie-in
    });
  },
};
export default plugin;
```

### 7C. Why this is the right shape

- **It reuses the log discipline verbatim** — per‑message retained topics + `full_id` + `latest` — so history replay, self‑echo, and the MQTT tap are *solved problems* copied from `log-bridge.ts`, not reinvented.
- **It never scrapes the DOM** — People and producer identity arrive as data on `ctx`, per the `EditorContext` contract.
- **It degrades cleanly** — with no broker, `getBus()` is a no‑op and the chat is a local‑only transcript (the same graceful degradation every editor's `?.` MQTT calls already assume). With a broker, a *second console — or a phone web client subscribing to `rooms/<room>/chat/#`* — is a real participant, which is how the "people's" side becomes real without any backend of ours.

---

## 8. Media — Text, Images, and Links

| Kind | Composer input | Payload | Render |
|---|---|---|---|
| **text** | text field | `{ kind:'text', text }` | plain, URL‑autolinked |
| **link** | 🔗 button → URL + caption | `{ kind:'link', href, text }` | title chip → opens in new tab |
| **image** | 🖼 button / paste / drag‑drop | `{ kind:'image', media, text? }` | inline thumbnail, click to expand |

**Images — how, and the honest limit.** In a zero‑backend front‑end sim there is no file server, so an image travels **as its bytes**: a `FileReader` `data:` URI (or an `URL.createObjectURL` for local‑only preview). That round‑trips fine for small proofing images (a lower‑third PNG, a shot ref). It is *not* a media pipeline: MQTT payloads and retained‑topic storage make multi‑MB images a bad idea, so the editor should **downscale + JPEG‑encode to a thumbnail** (canvas, e.g. ≤512 px, ≤~64 KB) before publishing, and `log()`/toast when an image is clamped so nothing is silently dropped. Links are just strings — no limit.

---

## 9. What to Skip (front-end sim boundary)

Consistent with the RFSA/Delta finding that TwistRouting is a **100 % front‑end simulation**, **do not** build:

- **No chat server, no accounts, no auth backend.** The "people's" side is not a native mobile app we ship. The dialog is real *over MQTT* — any second subscriber (another console, or a small phone web page reading `rooms/<room>/chat/#`) is a genuine participant — but authoring a talent‑facing client is out of scope. On a single console, the **`speaking as ▾` persona switch** simulates the talent side so the dialog is demonstrable end‑to‑end.
- **No file/media service, no CDN, no thumbnails at scale.** Images are inline data‑URIs, clamped (§8). No video, no audio clips, no arbitrary file transfer.
- **No message persistence beyond MQTT retain** (and optional platform‑layer `localStorage` draft, per `routes-store.ts`) — no database, no search index, no history export.
- **No delivery receipts / E2E encryption / moderation backend.** Presence and "typing…" are best‑effort retained hints, nothing more.

Everything above reaches **L3 (real front‑end logic)** on the Delta scale — a working, multi‑console, retained, addressed, multimedia dialog — which is the ceiling for the rest of the app. **L4 (production‑real)** = a talent mobile client + media service, explicitly out of scope.

## 10. Phased Plan

| Phase | Deliverable | Touches |
|---|---|---|
| **CH0** | `chat/state.ts` pure types (`ChatMsg`, `ChatAuthor`, addressing) + `authorFromRole`/`personAuthor` mappers; unit test round‑trip + self‑echo drop | `src/editors/chat/`, `src/platform/auth.ts` (read) |
| **CH1** | `chat/` editor: transcript + composer (**text only**), local echo, `requiredCaps:['comms']`, `dispatch.test.ts` 21→22 | `src/editors/chat/`, `src/editors/dispatch.test.ts` |
| **CH2** | Attach point: add `GREEN ROOM CHAT` twist to the Control‑Room Productions; open from the console | `Routes/Destinations/**` |
| **CH3** | MQTT wire: `publishRaw`/`subscribe` on `rooms/<room>/chat/#`, retained per‑seq history replay + `latest`; Captain's Log `logAction` tie‑in | `src/editors/chat/`, `src/platform/mqtt/` (consume) |
| **CH4** | **Two‑sided addressing** (`to: room`/`personId`) + participant/presence rail + `speaking as` persona; presence retained topic | `src/editors/chat/` |
| **CH5** | **Images + links** — 🔗 link chips, 🖼 paste/drag → canvas‑downscaled data‑URI, expand‑on‑click; clamp + toast | `src/editors/chat/`, `src/ui/dom.ts` (reuse) |
| **CH6** *(opt.)* | Chirality (composer/rail swap) + tool‑tips (`src/ui/tip.ts`) | `src/editors/chat/` |

## 11. One-Paragraph Executive Summary

A studio chat room is a **high‑value, low‑risk, greenfield** addition that builds almost entirely on parts already in the codebase. The room it attaches to is a `Production` under `Routes/Destinations/**` (MQTT `rooms/<slug>`); the people in it are the `Person` leaves under `Routes/People/**` already resolved onto `ctx.siblings`/`ctx.sources`; the two sides of the dialog are the `auth` bridge‑crew role (production) and those Person entities (talent). The transport is the **live `TwistBus`** — a chat is one retained subtree (`rooms/<room>/chat/msg/<seq>`) published and subscribed exactly the way the **Captain's Log** already publishes `log/<voyage>/<entry>`, with `full_id` self‑echo suppression copied verbatim. The build is one editor folder `src/editors/chat/` (plus a one‑line `dispatch.test.ts` count bump and one twist added to the room JSON), carrying an **append‑only `ChatMsg`** log with **production⇄person addressing** and **text/link/downscaled‑image** payloads. It degrades to a local transcript with no broker and becomes a genuinely multi‑participant dialog with one — a second console or a phone web client on the same topic. The only things deliberately left at the front‑end‑sim boundary are a talent mobile client, a media service, and a real chat backend (the persona switch stands in for talent's own device); everything else reaches **L3**, the app's ceiling.
