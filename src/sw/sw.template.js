// TWIST service worker — LANE-AWARE caching (docs/Audit/Local-Cache-and-
// Preferences-Audit.md §4.2 / §8 W4b). Emitted to dist/sw.js by the
// `twist-build-id` Vite plugin, which bakes the build stamp (cache version)
// and the content-hashed bundle list (precache manifest) into this template.
//
// THE LAW (§5.1, learned from the v109 disaster): the entry HTML is NEVER
// served cache-first. Lanes:
//   /assets/*  (hashed)       → cache-first, immutable — the hash IS the version
//   Routes/**  JSON           → stale-while-revalidate — instant boot, fresh next paint
//   assets/icons/* (and legacy Routes/*/icons/*) → stale-while-revalidate, long-lived bucket
//   navigations / index.htm   → network-first, cache fallback (offline boot only)
//   everything else same-origin GET → network, cache fallback
// activate sweeps every cache not in KEEP — including the legacy twist-v109
// cache-first era; this worker replaces the kill-switch at /sw.js.

const VER = '__BUILD__';
const SHELL = `twist-shell-${VER}`;
const ROUTES = 'twist-routes-v1';
const ICONS = 'twist-icons-v1';
const KEEP = [SHELL, ROUTES, ICONS];
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // Individually settled — a missing optional file must not fail the install.
    await Promise.allSettled(PRECACHE.map((u) => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (!KEEP.includes(k)) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

async function cacheFirst(cacheName, req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(cacheName)).put(req, res.clone());
  return res;
}

async function networkFirst(cacheName, req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(cacheName)).put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(cacheName, req) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const refresh = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit ?? (await refresh) ?? Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // CDN-free by design; never proxy 3rd parties
  const path = url.pathname;

  if (path.includes('/assets/')) { e.respondWith(cacheFirst(SHELL, req)); return; }
  if (path.includes('/Routes/')) {
    e.respondWith(staleWhileRevalidate(path.includes('/icons/') ? ICONS : ROUTES, req));
    return;
  }
  if (req.mode === 'navigate' || /\/index(\.next)?\.html?$/.test(path) || path.endsWith('/')) {
    e.respondWith(networkFirst(SHELL, req));
    return;
  }
  e.respondWith(fetch(req).catch(() => caches.match(req).then((h) => h ?? Response.error())));
});
