const CACHE_NAME = 'ekwena-shell-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Minimal network-first fetch handler.
// This exists mainly so Chrome/Android recognizes the app as installable.
// It does NOT cache API calls or feedback submissions - those always hit the network,
// since this app depends on live data and must never serve stale guest/staff data offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
