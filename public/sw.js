const CACHE = "shared-space-calendar-v3.1.0";
const SHELL = [
  "/",
  "/styles.css?v=3.1.0",
  "/planner-enhancements.css?v=3.1.0",
  "/planner-enhancements.js?v=3.1.0",
  "/assets/main.js?v=3.1.0",
  "/manifest.webmanifest?v=3.1.0",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== location.origin
    || url.pathname.startsWith("/api/")
    || event.request.method !== "GET"
  ) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match("/"))),
  );
});
