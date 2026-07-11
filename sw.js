/* Havre — Service Worker
   Précache l'app shell pour un usage hors-ligne (privacy-first : rien ne quitte l'appareil). */
const CACHE = "havre-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/companion.js",
  "./js/views/today.js",
  "./js/views/mood.js",
  "./js/views/breathe.js",
  "./js/views/journal.js",
  "./js/views/chat.js",
  "./assets/icon.svg",
  "./assets/icon-maskable.svg",
  "./assets/favicon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  // Navigation : renvoyer index.html (SPA) si hors-ligne.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Cache-first pour les ressources.
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
