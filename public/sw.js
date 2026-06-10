// sw.js — service worker for offline play.
//
// The game is a small bundle of static files (HTML, one JS chunk, generated
// PNGs). We use a stale-while-revalidate cache for same-origin GETs: the first
// visit warms the cache, after which the game loads instantly and works fully
// offline, while still refreshing files in the background when online.

const CACHE = "boosh-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // drop stale caches from older versions
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // only our own assets

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      // serve cache immediately if present; otherwise wait for the network,
      // and fall back to the cached start page for navigations when offline.
      if (cached) return cached;
      const res = await network;
      if (res) return res;
      if (req.mode === "navigate") {
        const shell = await cache.match("./") || await cache.match("index.html");
        if (shell) return shell;
      }
      return Response.error();
    })(),
  );
});
