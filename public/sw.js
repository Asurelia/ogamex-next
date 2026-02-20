/**
 * Service Worker - OGameX Companion
 *
 * Handles push notifications for skill completions, market fills, contract updates.
 * Minimal caching - the app is primarily real-time.
 */

const CACHE_NAME = 'ogamex-v1'
const PRECACHE_URLS = ['/game/space', '/manifest.json']

// Install - precache essential shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return
  if (event.request.url.includes('supabase')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || 'New notification',
    icon: '/img/icon-192.png',
    badge: '/img/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/game/space' },
    actions: data.actions || [],
  }

  event.waitUntil(self.registration.showNotification(data.title || 'OGameX', options))
})

// Notification click - focus or open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/game/space'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes('/game/'))
      if (existing) {
        return existing.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
