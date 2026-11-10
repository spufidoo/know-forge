/* KE Studio offline shell — caches app shell for Android PWA install. */
const CACHE = "ke-studio-shell-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/", "/icons/icon-192.png", "/icons/icon-512.png"]),
    ),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  event.respondWith(
    caches.match(request).then((cached) => {
      const networked = fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            (request.url.startsWith(self.location.origin) ||
              request.mode === "navigate")
          ) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached || networked
    }),
  )
})
