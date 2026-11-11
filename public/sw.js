/* KE Studio offline shell — caches static app shell only for Android PWA. */
const CACHE = "ke-studio-shell-v6"

const SHELL = ["/", "/icons/icon-192.png", "/icons/icon-512.png"]

function isApiRequest(url) {
  try {
    return new URL(url).pathname.startsWith("/api/")
  } catch {
    return false
  }
}

function shouldCacheResponse(request, response) {
  if (!response || response.status !== 200) return false
  if (request.method !== "GET") return false
  if (!request.url.startsWith(self.location.origin)) return false
  if (isApiRequest(request.url)) return false

  const cacheControl = (response.headers.get("cache-control") || "").toLowerCase()
  if (
    cacheControl.includes("no-store") ||
    cacheControl.includes("private") ||
    cacheControl.includes("no-cache")
  ) {
    return false
  }

  // Only cache the known shell assets (and same-path navigations of those).
  try {
    const { pathname } = new URL(request.url)
    return SHELL.includes(pathname)
  } catch {
    return false
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
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

  // Never intercept API calls — always hit the network, never cache.
  if (isApiRequest(request.url)) {
    event.respondWith(fetch(request))
    return
  }

  // Network-first for the shell; fall back to cache only offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (shouldCacheResponse(request, response)) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || Response.error()),
      ),
  )
})
