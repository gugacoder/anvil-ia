// Processa OS · Service Worker
// Estrategia: app-shell precache leve + network-first pra API/HMR, cache-first pra assets estaticos.

const VERSION = "v1";
const SHELL_CACHE = `mob-shell-${VERSION}`;
const STATIC_CACHE = `mob-static-${VERSION}`;
const SHELL_URLS = ["/so/", "/so/manifest.webmanifest", "/so/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachar API ou WebSocket/HMR
  if (
    url.pathname.startsWith("/so/api/") ||
    url.pathname.includes("/@vite/") ||
    url.pathname.includes("/@react-refresh") ||
    url.pathname.includes("/__vite_hmr")
  ) {
    return;
  }

  // Navegacao (SPA) — network-first com fallback no shell cacheado
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("/so/", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/so/") || caches.match(req)),
    );
    return;
  }

  // Assets estaticos — cache-first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }),
    ),
  );
});
