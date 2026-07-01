// sw.js — KILL SWITCH. The site cut over to the TypeScript build (bundled under
// /assets, referenced by /index.htm). This replaces the retired cache-first
// worker: on activate, drop every cache, unregister, and reload controlled
// windows so the network (the new /index.htm) wins. Self-removing.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    try { await self.registration.unregister(); } catch (e) {}
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const c of clients) { try { c.navigate(c.url); } catch (e) {} }
  })());
});
