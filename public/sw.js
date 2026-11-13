self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network only. PlainSight does not put documents or screenshots in the Cache API.
  event.respondWith(fetch(event.request));
});
