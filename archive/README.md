# archive/ — retired legacy artifacts

The app was fully migrated to the TypeScript build in `src/` (see
`docs/TYPESCRIPT-WASM-REPORT.md` §A.8) and cut over on 2026-07-01. The site now
serves only the built TS bundle; the legacy JavaScript app and loose files that
belonged to it were moved here rather than deleted, so the git history stays
clean and nothing is lost.

Nothing in `archive/` is imported, built, or deployed — it's reference only.

| Item | What it was |
|------|-------------|
| `js/` | The entire legacy ES-module app (sources, matrix, editors, chrome). Its features all live in TS now: `js/editors/camera/*` → `src/editors/camera-control/*`; `js/editors/shared/*` → `src/ui/{scopes,audio-scope,loudness}.ts`; the rest → `src/ui/**` + `src/editors/**`. |
| `index.htm` | The legacy JS entry document. Replaced by the built TS entry (published to `/index.htm` by `deploy.py`). |
| `sw-legacy-v109-cachefirst.js` | The old cache-first service worker (`sw.js`). |
| `sw-killswitch-DEPLOYED.js` | The kill-switch worker currently live at `/sw.js` — it evicts the old cache-first SW from returning browsers. Kept on the server by `deploy.py` (NOT re-uploaded); this is the source of record. |
| `start.py` | Legacy Python static server that opened the JS `index.htm`. For local TS dev use `npm run dev` (vite). |
| `test_puppeteer.js` | An old smoke script that loaded the JS app over `file://`. |
| `lcars-styleguide.json` | LCARS colour/style reference doc. |
| `LI post.htm` | A LinkedIn post export (unrelated to the app). |

To roll back to the JS app you would restore `index.htm` + `js/` + a cache-first
`sw.js` to the server — but the TS build is at verified parity, so this is here
for reference, not as an active fallback.
