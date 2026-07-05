# LOCAL CACHE & PREFERENCES — what the console should remember
### Audit & deployment plan: the preferences worth keeping, the state we lose on every reload, and how the site itself should be cached
*Audit date: 2026-07-04 · Repo state: TS build (post-cutover), served from `twist.like.audio` via `deploy.py` (FTPS), no service worker (kill-switch era), animated icon tiles shipped.*

---

## 1. Thesis

The console today is **deliberately cache-hostile**, and for a good historical reason: the
legacy build shipped a cache-first service worker (`twist-v109`) that served a stale shell
forever, and digging out of that required a kill-switch worker plus an inline
"unregister everything, delete every cache" script that still runs on every boot
(`index.next.html:14-17`). The scorched-earth policy was correct **during** the cutover.
It is now costing us three things:

1. **Preferences are scattered, unversioned, and incomplete.** Sixteen localStorage keys
   in three naming conventions, no schema versions, and a long list of state an operator
   plainly expects to survive a reload — the dual counters, the Captain's Log, the chat,
   the selected room tab — that silently evaporates.
2. **Every boot re-downloads everything.** All `Routes/**` JSON is fetched
   `cache:'no-store'` (`discovery.ts:28,67,87`), every icon tile is re-probed, and the
   MQTT library is pulled from unpkg at boot. On a production floor with flaky WAN, a
   reload is a full cold start.
3. **There is no offline story at all**, even though the app is architecturally 100%
   front-end simulation — the single best candidate for one.

The fix is not "turn caching back on". It is **three different kinds of memory, each in
the right store**:

| Kind | What it is | Right store |
|---|---|---|
| **Preferences** | small, per-operator, must survive reload | one versioned localStorage blob |
| **Production state / logs** | grows over time, is the audit trail | IndexedDB (+ retained MQTT for the shared copy) |
| **The website itself** (shell, bundles, Routes JSON, icon tiles) | network resources | a **new, lane-aware service worker** — the only cache-policy lever we have, because the FTPS host gives us zero header control |

**Estimated effort: ~4 days** (P0 ½ day, P1 1 day, P2 1 day, P3 1–1½ days).

---

## 2. What exists today (with receipts)

### 2.1 The preference inventory — every localStorage key

localStorage is the **only** persistence API in use. No IndexedDB, no cookies, no Cache
API (actively deleted at boot), no sessionStorage, no File System Access.

| Key | Where | Holds | Validation |
|---|---|---|---|
| `twist.chirality` | `chirality.ts:14` | `'right'│'left'` | fallback on junk |
| `twist.colour` | `colour-scheme.ts:62` | JSON `{vision, chroma, cvd, face, monoHue}` | per-field type guards |
| `twist:authoring:on` | `authoring.ts:33` | `'1'│'0'` Edit-Layout | — |
| `twist:routes:draft:<url>` | `routes-store.ts:15` | per-URL Routes draft override | try/catch; has export/import |
| `twistMqtt` / `twistMqttPort` | `mqtt/client.ts:36-37` | broker host / port | — |
| `twistMqttUser` / `twistMqttPass` | `mqtt/client.ts:37` | **cleartext credentials** | — |
| `twist.vm.prefs` | `vision-mixer/prefs.ts:14` | layout + handedness prefs | enum guards |
| `twist.vm.scenes.<twist>` | `vision-mixer/scenes.ts:13` | saved scene registers | try/catch |
| `twist.vm.state.<twist>` | `vision-mixer/index.ts:54` | full live switcher state | implicit shape guard (`mes.length`) |
| `twist.vm.layout.<twist>` | `vision-mixer/index.ts:499` | module dashboard layout | **the one legacy migration** (bare array → object, line 519) |
| `twist.vm.layout_presets` | `vision-mixer/index.ts:500` | named layout presets | — |
| `twistClockLayouts` | `clock/index.ts:316` | saved clock-bench scenes | try/catch |
| `twistTimerWallClock` | `timer/index.ts:110` | timer wall-clock config | index/enum guards |

Observations:
- **Three naming conventions coexist** — dotted `twist.*`, colon `twist:*`, camel
  `twistMqtt*`/`twistClockLayouts` — with no registry and no shared prefix to enumerate,
  export, or wipe them as a set.
- **Zero schema versions.** Compatibility rests entirely on read-time type guards; the
  single migration that exists (`vm.layout`) is ad-hoc.
- Two orphaned legacy keys (`sidebarWidth`, `twist-tutorial-dismissed` from
  `archive/js/`) are never read by the TS build — the sources-sidebar sash
  (`main.ts:250`) **lost** its width persistence in the port.

### 2.2 What an operator loses on every reload (and shouldn't)

| Volatile state | Where | Why it hurts |
|---|---|---|
| **Captain's Log** — all voyages & entries | `captains-log.ts:36-38`, module-level | it is the *audit trail*; a reload mid-show erases it locally (only the retained-MQTT mirror survives, and only if a broker is up) |
| **Dual counters + stopwatch** | `dest-fixtures.ts:124` `counterStore` | a running show timer dies on refresh. The comment even says "persistent state" — it isn't. Trivially fixable: the state is already `{running, base, startedAt}`; store epoch timestamps and a reload *keeps counting through the reload* |
| **Per-destination chat log** | `dest-fixtures.ts:262`, `chat-dock.ts` | conversation history gone locally; retained MQTT replays only what the broker kept |
| **Selected destination tab** | `footer.ts:101-105` CSS class only | operator re-navigates to their room every reload |
| **Footer group / twist-group open state** | `footer.ts:77-93`, `destinations.ts:130` | accordion resets to all-collapsed |
| **Auth role** | `auth.ts:23` | resets to `ROLES[0]`; the capability gate forgets who you are |
| **Prompter script** | `prompter/index.ts:38-55` | talent's script survives only as retained MQTT params |
| **Sources sidebar sash width** | `main.ts:250` | regression vs. legacy `sidebarWidth` |
| **Router-view collapse sets** | `router-view.ts:68` | 1990s-grid pruning resets |

The one thing that *does* survive reload is the **editor overlay deep-link** — the
`#/<prod>/<twist>` hash written by `overlay.ts:98` and re-opened by `main.ts:219-240`.
That is the pattern to note: *URL for location, storage for preference.*

### 2.3 The delivery layer — how the site reaches the browser

- **Build**: Vite, `base:'./'`, content-hashed output (`assets/main-<hash>.js/.css`,
  ~652 KB + 30 KB). `lcars.css` is bundled into the hashed CSS. A `__BUILD_ID__`
  (CHANGELOG version + UTC + git hash) is injected (`vite.config.ts:42`) but used only
  as a byline label — **it is exactly the cache-version key a service worker needs, and
  it already exists.**
- **Deploy** (`deploy.py`, FTPS to `twist.like.audio`): bare deploy wipes `/assets`,
  uploads hashed bundle, uploads the entry **last**, remaps `index.next.html →
  /index.htm`. Routes JSON is uploaded incrementally from `git status` (the
  `deploy:all` gotcha) and `index.json` manifests are generated per folder — icon dirs
  excluded from discovery.
- **No HTTP header control exists.** No `.htaccess`, no server conf in the repo; cache
  policy is whatever the FTPS host defaults to. **The only unhashed link in the chain is
  `/index.htm` itself** — with no headers and no SW, a returning browser may
  heuristically cache it and reference a wiped bundle (the classic post-deploy
  white-screen risk; today it's masked only by the host's defaults).
- **Service worker**: none registered. Two independent eviction mechanisms still active:
  the deployed kill-switch `/sw.js` (repo copy: `archive/sw-killswitch-DEPLOYED.js` —
  deletes all caches, unregisters, reloads clients) and the inline script in
  `index.next.html:14-17` that unregisters **any** SW and deletes **all** caches on
  every boot. `deploy.py` deliberately keeps `sw.js` on the server (`LEGACY_REMOTE`
  excludes it; a 404 would *not* unregister stranded v109 clients). Note: the
  `deploy.py:354` print claims sw.js is removed — message-only bug, behavior is correct.
- **Runtime fetch lanes** (all live, nothing cached):

| Lane | Trigger | Today | Offline today |
|---|---|---|---|
| `/index.htm` shell | navigation | host-default caching, unhashed | dead |
| `/assets/*` (hashed js/css/chrome-svg) | boot | host-default | dead |
| `Routes/**/index.json` manifests | boot, per folder | `no-store` | empty console, no error |
| Source leaf JSON | boot (top pools), lazy (nested) | `no-store` | leaves skipped |
| Destination room JSON | **lazy per tab click** | `no-store` | tab renders nothing |
| Icon tiles `Routes/*/icons/*.svg` | boot, `Image()` probe per label | browser default | tiles degrade to LCARS pills (by design) |
| `mqtt.min.js` **from unpkg CDN** | boot (default broker is baked) | CDN | MQTT silently off |
| MQTT WebSocket `44.44.44.163:9001` | boot | live, 5 s reconnect | no-op bus (by design) |
| Open-Meteo geocode+forecast | lazy (weather template) | session memo only, **no auto-refresh** | "Forecast unavailable" |
| Meter-input capture / media URL | user action | live | secure-context error |

The degrade paths are genuinely good — the console boots offline without throwing. It
just boots *empty*, which a service worker can fix outright.

---

## 3. Preferences — what should be kept, and in what sort of store

### 3.1 The rule for choosing a store

| Sort of thing | Store | Why |
|---|---|---|
| Small per-operator toggles & configs (chirality, colour, face, MQTT host, vm prefs, saved layouts) | **localStorage, one versioned blob per domain** | synchronous read before first paint (the colour/chirality engines depend on this), tiny, easy export |
| Growing append-only logs (Captain's Log, chat) | **IndexedDB** | unbounded growth doesn't belong in a 5 MB sync store; async is fine post-boot; queryable by voyage/room |
| Running clocks (counters, stopwatch) | localStorage, **epoch-based** `{running, base, startedAtEpoch}` | writing on every tick is wrong; write on start/stop/reset and *derive* elapsed from `Date.now()` so the count survives — and keeps running through — a reload |
| Cross-client shared state (editor params, presence, log mirror) | **retained MQTT** (already built) | it's the bus's job; local stores are the *operator's* memory, the bus is the *production's* |
| Location (which editor/room is open) | **URL hash** (already built) | shareable, reload-safe, bookmark-able |
| Network resources | **Cache API via service worker** | §4 |

### 3.2 New preferences to persist (the gaps)

**P0 — quick wins, ½ day total:**
1. **Selected destination tab** — restore on boot (respect an overriding deep-link hash).
2. **Footer group open state** — a `Set` of open group paths.
3. **Sources sash width** — restores the lost legacy `sidebarWidth` behavior.
4. **Auth role** — persist, but in `sessionStorage`-style semantics (per-tab, or expire
   with a shift); silently restoring an `admin` capability gate days later is wrong.
5. **Counters/stopwatch** — epoch-based as above, keyed per destination. (Also fixes the
   misleading "persistent state" comment at `dest-fixtures.ts:121`.)
6. **Router-view collapse sets.**

**P1 — production memory, 1 day:**
7. **Captain's Log → IndexedDB**, hydrate on boot, keep the MQTT mirror as-is. The log
   is the single highest-value volatile state in the app.
8. **Chat logs → IndexedDB** ring buffer (cap per room, e.g. 500 msgs; images are
   data-URIs and dominate size — cap those harder or don't persist media).
9. **Prompter script** — per-twist key; MQTT retained params remain the live sync path.

**Explicitly do NOT persist:** live DVE flight state (`vision-mixer` `flights`),
weather forecasts (that's a *cache*, see §4 — never a preference), MQTT session state,
intercom selecting/picked sets.

### 3.3 Consolidate the store while adding the new keys

Create `src/platform/prefs.ts` — a ~60-line module owning **one namespace**:

```ts
// twist.prefs.v1  — one JSON blob, one schema version, one migration seam
interface Prefs {
  v: 1;
  chirality: 'left' | 'right';
  colour: ColourScheme;
  authoring: boolean;
  ui: { destTab?: string; openGroups: string[]; sashPx?: number; routerCollapsed: {...} };
  mqtt: { host?: string; port?: number; user?: string };   // password: see hazard §5.4
  // editors keep their per-twist keys but register their prefixes here
}
```

- `get()/set(patch)` with read-time validation exactly like `colour-scheme.ts:124` does
  today, plus a top-level `v` so the *next* shape change is a migration, not a guard.
- A **key registry** (even just an exported array of prefixes) so export/import/reset
  can enumerate everything — extend the existing `exportDrafts` pattern
  (`routes-store.ts`) into a whole-console **"export my seat"** blob: prefs + drafts +
  vm layouts + clock layouts. This is what makes preferences portable between
  workstations, which is the actual operational win in a multi-position control room.
- Migrate the legacy keys on first read (`twist.chirality` → blob, etc.), then delete
  them. Keep per-twist heavy keys (`twist.vm.*`) as they are — the blob holds small
  global prefs only, the registry just *names* the rest.

---

## 4. Caching the website itself — the service-worker plan

### 4.1 Why a service worker at all (and why now is safe)

With zero HTTP-header control on the FTPS host, a SW is the **only** cache-policy lever
that exists. The v109 disaster wasn't "service workers are dangerous" — it was one
specific anti-pattern: **cache-first on the unhashed shell with a hand-bumped version**.
The current build has the two things v109 lacked: content-hashed assets and an automatic
`__BUILD_ID__`. The design below never serves the shell cache-first, so it cannot
recreate the trap.

### 4.2 Lane strategies

| Lane | Strategy | Rationale |
|---|---|---|
| `/index.htm` (+ `/sw.js` itself) | **network-first, cache fallback** | the shell must always try the network; the cached copy exists *only* so an offline reload still boots. Never cache-first — that was v109's sin |
| `/assets/*` (hashed) | **cache-first, immutable** | the hash *is* the version; safe forever. Precache the current build's manifest at install |
| `Routes/**/index.json` + leaf JSON | **stale-while-revalidate** | instant boot from cache, network refresh repaints/updates in the background. Keeps the "someone edited a room JSON" freshness within one revalidation. Replaces `no-store` (the no-store comment in `discovery.ts:26` was defending against exactly the uncontrolled browser-cache staleness that SWR makes controlled). The authoring-draft short-circuit in `fetchJSON` runs *before* the network layer, so drafts are unaffected |
| `Routes/*/icons/*.svg` (incl. `.mouseover`) | **stale-while-revalidate, long-lived bucket** | ~30 stable files; hover animation should never wait on the network |
| Open-Meteo | **network-only** + optionally cache-last-response with an on-air "stale" badge | forecast data must not be silently old on a broadcast graphic; if we keep a fallback it must be *visibly* stale |
| unpkg `mqtt.min.js` | **eliminate the lane: vendor it** — `npm i mqtt`, import it, let Vite hash it | it's the app's only CDN dependency and it fires at boot on every load. Bundling removes a third-party single point of failure, makes the console fully self-hosted, and moves the file into the immutable lane for free (`client.ts:95`, `mqtt-tree.ts:37`) |
| MQTT WebSocket | not cacheable | the bus already degrades gracefully |

Cache names carry the build id: `twist-shell-<BUILD_ID>`, `twist-routes-v1`,
`twist-icons-v1`. On `activate`, delete any `twist-*` cache not in the current set —
the standard version-sweep the kill-switch did with a flamethrower.

### 4.3 The resurrection order-of-operations (this is the part that bites)

The inline eviction script in `index.next.html:14-17` **will assassinate any new
service worker on every boot.** The sequence must be:

1. Ship the new `sw.js` (deploy.py: add it to the upload set, replacing the kill-switch
   file on the server — same path, `/sw.js`, so stranded v109 clients still get
   unregister-or-update semantics from the new worker's activate step).
2. **In the same deploy**, replace the inline eviction block with the registration:
   `navigator.serviceWorker.register('./sw.js')` — plus a one-time
   `caches.delete` of any cache *not* prefixed `twist-shell/routes/icons` as a
   belt-and-braces sweep of the v109 era.
3. Keep a documented **escape hatch**: the kill-switch file stays in `archive/` with a
   README line "if the SW ever misbehaves, redeploy this as /sw.js" — institutionalize
   the recovery we already proved works.
4. Fix the `deploy.py:354`/docstring wording while touching it (says sw.js is removed;
   it isn't and mustn't be).

Browsers revalidate `/sw.js` on navigation (24 h cap), so a new build's worker (new
`__BUILD_ID__` baked in) installs on next visit, precaches the new hashed assets, and
sweeps the old caches at activate — no version hand-bumping, ever.

### 4.4 The PWA shell around it (small, high leverage)

- **`manifest.json` + favicon + theme-color** — currently there is *no favicon and no
  manifest at all* (`index.next.html` has only charset/viewport). We already own a
  512×512 squircle icon generator (`Routes/*/icons/make-icons.mjs`) — mint a
  `twist` app tile with it. Result: installable full-screen console on control-room
  machines and tablets, correct taskbar identity.
- **Offline/staleness indicator**: the SW can post "serving cached Routes" to the page;
  surface it as a small chrome chip (the bus presence heartbeat already gives us the
  online/offline signal for MQTT — this completes the picture for HTTP).

---

## 5. Hazards

1. **The v109 lesson, restated as law**: the entry HTML and anything unhashed is never
   cache-first. Manifest/lane design above encodes this; any future lane addition should
   answer "what happens when this file changes under a returning client?" first.
2. **Order of operations** (§4.3): registering a SW while the inline eviction script
   still runs yields an install/unregister fight every boot — silent, wasteful, and
   confusing to debug. One deploy, both changes.
3. **`deploy.py` incremental Routes gotcha compounds with SWR**: a committed-but-not-
   deployed Routes file is already invisible; with SWR a *deployed but not revalidated*
   file is one reload behind. Acceptable (revalidation is per-request), but worth a line
   in the deploy output: "clients refresh Routes lazily".
4. **Cleartext MQTT password** in localStorage (`twistMqttPass`, `client.ts:37`). Moving
   stores won't fix what is fundamentally a browser-storage limitation — but the prefs
   consolidation should *exclude* the password from export blobs, and the settings UI
   should say it is stored locally in the clear.
5. **IndexedDB quota/eviction**: logs under `navigator.storage.persist()` request;
   chat images (data-URIs) capped or excluded from persistence.
6. **Second entry point** `twist-mqtt-tree.html` also pulls unpkg — vendor there too or
   accept it as a debug tool outside the SW scope (it is not part of the app shell).

---

## 6. Phased plan

| Phase | Work | Est |
|---|---|---|
| **P0** | `src/platform/prefs.ts` (versioned blob + registry + migrate legacy keys) · persist dest tab, group-open set, sash width, router collapse, role (session semantics) · epoch-persist counters/stopwatch | ½ day |
| **P1** | IndexedDB store (`src/platform/store-idb.ts`) · Captain's Log hydrate/persist · chat ring buffer · prompter script per twist · "export my seat" blob | 1 day |
| **P2** | Vendor `mqtt` into the bundle (kill unpkg at boot) · `manifest.json` + favicon (minted by the icon generator) + theme-color | 1 day |
| **P3** | `sw.js` with the four lanes + `__BUILD_ID__`-keyed caches + precache of hashed assets · swap inline eviction → registration (same deploy) · deploy.py uploads `sw.js`, fixes the misleading print · offline/staleness chip | 1–1½ days |

Ship P0/P1 independently of the SW work — they're pure wins with no delivery-layer risk.
P3 is the only phase with a blast radius, and its escape hatch is already proven.

---

## 7. Addendum — settings on the bus: local-first boot, MQTT-validated reconcile

*Question raised post-audit: keep the last settings both in MQTT and locally, validate
the local cache against MQTT, then load.*

The pattern is right, and the bus already half-implements it (retained editor params,
`SPOG/log/**`, `chat/#`, presence LWT). But "settings" splits into three scopes with
**different owners**, because retained MQTT is *production-wide* while half the settings
are *per-seat* — sync chirality naively and one operator's handedness flips every
console on the floor.

### 7.1 The boot sequence (never gate paint on the broker)

```
paint from LOCAL immediately          (localStorage prefs, IDB logs, SW caches)
      │                               — broker worst-case is a 30 s connect timeout
      ▼                                 (client.ts:156); the console must not wait
bus connects (whenever it does)
      │  retained messages replay on subscribe — that IS the validation read;
      ▼  no request/response protocol needed
reconcile: newer-wins by envelope timestamp
      │  bus newer → apply live (stores/editors already repaint on bus messages)
      ▼  local newer (offline edits) → publish local up as retained
steady state: every change writes BOTH (local sync, bus retained, self-echo
              already suppressed via sessionId, client.ts:186)
```

Local is the *fast boot + offline truth*; the bus is the *freshness oracle + roaming
copy*. Neither is "the cache of the other" — they reconcile.

### 7.2 What syncs where

| Scope | Topic namespace | Reconcile rule |
|---|---|---|
| **Per-seat prefs** (chirality, colour/face, sash, open groups, dest tab, vm prefs) | `SPOG/seats/<seatId>/prefs` (retained) | newer-wins per seat. Payoff: **roaming seat profiles** — log into any console, pull your seat topic, the "export my seat" blob (§3.3) becomes live. Requires a *stable* `seatId` persisted locally (today's `sessionId` is per-boot — bootstrap the seat id from the P0 prefs blob) |
| **Production state** (counters/stopwatch epochs, prompter script, vm switcher state, Captain's Log, chat) | existing `SPOG/...` retained topics | bus wins on connect (it is the shared truth); local IDB/localStorage copy is the offline fallback and the fast first paint. Counters stored as epochs reconcile trivially — both sides derive elapsed from the same start timestamp |
| **Site data versioning** (Routes JSON, icon tiles, bundle) | `SPOG/system/build` (retained), published by `deploy.py` after upload: `{buildId, routesHash, ts}` | this is the *validate-the-cache-with-MQTT* jewel: the FTPS host gives us no cache headers and no push, but the bus can carry the invalidation signal. Client/SW compares the retained build stamp against its cached one → mismatch triggers lane revalidation (and a "new build deployed — reload?" chip). Also softens the §5.3 SWR staleness window to near-zero *and* gives deploys a floor-wide announcement for free |

### 7.3 What the deep audit found (receipts) — the design is closer than expected

A second audit pass walked every bus seam the reconcile design has to plug into.
The good news first:

**Already built and working for us:**
- **`publishValue` already envelopes.** Every value publish is
  `{ value, ts: Date.now(), full_id: sessionId }` (`client.ts:204`, `ValueMsg`
  `types.ts:35-39`) — retained by default, so "newer-wins by payload timestamp" needs
  no wire change for params. Only `ConfigMsg` lacks `ts` (`types.ts:25-32`).
- **Chat is the proof the whole idea works.** `chat-dock.ts:328-338` and
  `dest-fixtures.ts` (`ensureChatBus`) subscribe at boot, ingest the retained replay
  into local stores, and *chat already survives reload via the broker today* — the
  one subsystem that does. (Amusingly, it works *because* `sessionId` is per-boot:
  the old session's retained messages fail the self-echo check and replay in.)
- **Editors already have inbound appliers.** `onParam` (`main.ts:121`) unwraps
  `ValueMsg.value`, and prompter (`prompter/index.ts:97` — script applies +
  `rebuild()`), vision-mixer (`ParamRegistry.apply`, `vision-mixer/index.ts:906-944`),
  and ~17 other editors follow the "apply, never re-publish" pattern.
- **Live re-apply seams exist almost everywhere**: `setChirality`/`setScheme` are
  idempotent and runtime-safe (`chirality.ts:37-41`, `colour-scheme.ts:104-140`);
  counters repaint from `CState` every animation frame (`dest-fixtures.ts:131,234`) so
  mutating the store in place restores a running count with no repaint call (only the
  ▶/‖ button glyph needs its `sync()` invoked); vision-mixer has a full state→DOM
  projection (`sync()`/`rebuild()`, `index.ts:832-951`); the Captain's Log has a full
  `render()` (`captains-log.ts:177-198`).

**The four real gaps:**
1. **The late-subscriber hole (the big one).** The bus makes ONE broker subscription —
   `SPOG/#` at connect (`client.ts:171`) — and retained messages replay **once, at that
   instant**, dispatched only to callbacks registered at that moment. Editors register
   `onParam` when they *open* (e.g. `camera-control/index.ts:326`) — after the replay —
   so despite two-way plumbing, editors don't actually restore retained state. Chat
   works only because it subscribes at boot. **Fix (small + elegant): a last-value
   cache in the bus client** — `client.ts` keeps `Map<topic, lastPayload>` as messages
   arrive, and `subscribe()` synchronously replays matching cached topics to the new
   callback. One change, in one file, and every existing `onParam` applier becomes a
   working restore path for free.
2. **No stable seat id.** `sessionId` = 4 random bytes + boot time
   (`client.ts:103-111`), regenerated every reload; `types.ts:59` calls it "stable"
   but it isn't. Per-seat retained topics need a `twist.seat` id minted once into the
   P0 prefs blob and carried alongside `full_id` in envelopes.
3. **Log/role/config are publish-only.** `log-bridge.ts` mirrors local→bus only —
   nothing subscribes `log/#`; role likewise (`main.ts:300`). The retained
   `log/<voyage>/<entry>` payloads carry stable ids + `ts` (`types.ts:42-53`) so a
   hydrator can rebuild the *narrative* (dedupe by voyage+entry, insert, `render()`),
   but `added`/`removed` ride as label strings — replayed entries are read-only
   history; "Reverse Course" needs live DOM nodes and stays session-local.
4. **Footer has no programmatic restore API.** Tab activation and group-open exist
   only as click handlers (`footer.ts:90-112,173`); a restore step drives `.click()`
   or gets a small exported `activateTab(id)`/`openGroup(path)`. Note the 10 s idle
   auto-collapse (`footer.ts:74-82`) will fight a restored-open group — restored state
   should reset the idle timer.

**Deploy-side facts (for the build stamp):**
- `paho-mqtt` **2.1.0 is installed** on the deploy machine, and `mosquitto_pub` exists
  at `/usr/bin/mosquitto_pub`. deploy.py currently imports only
  `os/sys/json/subprocess/ftplib` — a best-effort publish is a ~10-line try/except.
- **The broker speaks WebSockets on 9001 — there is no evidence of a raw-TCP 1883
  listener anywhere in the repo.** paho must connect with `transport="websockets"` on
  9001 (or the 1883 listener gets confirmed out-of-band first).
- `__BUILD_ID__` is injected into the JS only (`vite.config.ts:42`) — **no file on disk
  carries it**, so either vite also writes a `build-id.json` into `dist/`, or deploy.py
  re-derives the same CHANGELOG-regex + git-hash fields (both cheap in Python).
- The publish step slots after `ftp.quit()` (deploy.py:358), stamping
  `{ buildId, routesHash, ts }` where `routesHash` hashes the `get_all_routes()` list.
- The **`.app-version` chip in the credit row (`main.ts:265`) is the natural anchor**
  for the "new build available" indicator — compare retained `SPOG/system/build`
  against the running `BUILD.short`.
- QoS is 0 everywhere (`client.ts:150,171`) — fine for retained state (the broker
  keeps the last value); nothing here needs QoS 1.

### 7.4 Cautions

1. **First paint stays synchronous-local.** Colour/chirality apply before first render
   (`applyStoredColourScheme`, `applyStoredChirality`); a late bus update may repaint,
   never delay.
2. **Offline = local wins, silently.** The no-broker path is already a first-class mode
   (noopBus); reconciliation must be a no-op, not an error state.
3. **Never publish secrets** — `twistMqttPass` stays out of every bus payload and every
   export blob (§5.4).
4. **deploy.py's publish stays best-effort** — try/except around the paho call; a down
   broker must never fail a deploy.
5. **Retained-topic hygiene**: seats that disappear leave retained prefs behind; the
   presence LWT pattern (client.ts:166) already models the cleanup — an admin "forget
   seat" publishes an empty retained message.

---

## 8. Deployment plan — five waves, each visible to the operator

> **EXECUTION STATUS (2026-07-04, v104):** all five waves are IMPLEMENTED in-tree and
> verified end-to-end (reload keeps tab/groups/sash/role; a running counter counted
> THROUGH a reload; the Captain's Log restored from IndexedDB; 59/59 unit tests; clean
> v104 build emitting `build-id.json` + `sw.js`). Not yet deployed. NOTE: one bare
> `npm run deploy` ships everything at once, including the service worker — to stage
> the SW soak (W4b) separately, hold back `dist/sw.js` + the new `index.next.html`
> registration on the first deploy.

Design rules: **one new platform module per wave, nothing rewritten**; every wave is
independently shippable and independently revertible; and every wave announces itself
through chrome the console already has — the operator always knows what the console is
doing and what just changed. The Academy (re-instated 2026-07-04: first-load quick
start + numbered on-screen markers + ACADEMY button in the credit row,
`src/ui/console/academy.ts`) is the standing "here's what's going on" surface — each
wave adds one line to a small **"What's new"** note in it.

| Wave | Ships | The operator sees | Deploy / revert |
|---|---|---|---|
| **W0 — Academy** *(done)* | `academy.ts`: quick-start overlay, 1-5 markers anchored to the live console, ACADEMY button | The tutorial itself; the button in the credit row | shipped with next bare deploy; revert = drop `initAcademy()` |
| **W1 — the seat remembers** | `src/platform/prefs.ts` (`twist.prefs.v1` blob, key registry, legacy-key migration) + persist dest tab / group-open / sash / role(session) / epoch counters + `footer.activateTab/openGroup` API | Reload mid-show and *nothing moves*: same room, same open groups, counters still running. Academy note: "the console now remembers your seat" | pure front-end; `npm run deploy`. Revert: prefs module no-ops on parse failure — worst case is today's amnesia |
| **W2 — production memory** | `src/platform/store-idb.ts`; Captain's Log + chat persist/hydrate; prompter script per twist; "export my seat" blob | On boot the log badge reads **"LOG RESTORED · n ENTRIES"**; chat history is present; the export button appears in settings | front-end only. Revert: IDB store ignored on read error; log falls back to empty exactly as today |
| **W3 — seats on the bus** | Bus **last-value cache** in `client.ts` (closes the late-subscriber hole); stable `twist.seat` id; `SPOG/seats/<seatId>/prefs` retained publish + newer-wins reconcile; envelope `{v, ts, seat, data}` for settings topics | The MQTT chip gains a **SEAT SYNCED** state; sign in at any console and your layout follows you. Academy note explains roaming | front-end only; degrades to W1 behavior with no broker. Revert: feature-flag the seats topic; LVC is inert alone |
| **W4 — the validated cache** | vite writes `dist/build-id.json`; deploy.py publishes retained `SPOG/system/build {buildId, routesHash, ts}` (paho, `transport="websockets"`, port 9001, try/except); app compares to `__BUILD_ID__` → **pulsing "NEW BUILD — RELOAD" chip on the `.app-version` badge**; then the §4 service worker (lanes, precache, `__BUILD_ID__`-keyed caches), **swapping the inline eviction for registration in the same deploy** | Deploys announce themselves on every console within seconds; offline reloads boot from cache with a **"SERVING CACHED"** chip; the version badge is now live, not decorative | the only wave with delivery-layer blast radius; escape hatch = redeploy `archive/sw-killswitch-DEPLOYED.js` as `/sw.js` (proven). Ship the stamp+chip first, the SW a deploy later |

Sequencing notes:
- W1→W2→W3 are strictly additive front-end waves; each rides a normal `npm run deploy`.
- W3's last-value cache should land **before** any editor is taught to trust retained
  restore — it converts all ~19 existing `onParam` appliers into working restores in
  one move.
- W4 splits internally: the build stamp + reload chip is low-risk and immediately
  useful (it also softens the §5.3 Routes staleness note); the service worker follows
  once the stamp has soaked for a few days.
- Every wave updates the Academy "What's new" note and the CHANGELOG — the same two
  places, every time, so the floor never has to guess what changed.
