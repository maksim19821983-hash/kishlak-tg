/* Оболочка приложения для офлайна: сеть в приоритете, кэш — как запасной путь. */

const SHELL_CACHE = 'kishlak-shell-v1'
const ASSET_CACHE = 'kishlak-assets-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(['/', '/index.html']).catch(() => {})))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // страницы: сначала сеть, при её отсутствии — кэш
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          return response
        })
        .catch(async () => {
          const cache = await caches.open(SHELL_CACHE)
          return (await cache.match(request)) ?? (await cache.match('/index.html')) ?? new Response('офлайн', { status: 503 })
        }),
    )
    return
  }

  // статика, манифест, обложки, тексты: кэш в приоритете
  const cacheable = ['/assets/', '/content/'].some((part) => url.pathname.startsWith(part)) || url.pathname === '/content/manifest.json'
  if (!cacheable) return

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      try {
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone()).catch(() => {})
        return response
      } catch (e) {
        const audioCache = await caches.open('kishlak-audio-v1')
        const hit = await audioCache.match(request)
        if (hit) return hit
        throw e
      }
    }),
  )
})
