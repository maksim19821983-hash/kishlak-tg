/* Офлайн-оболочка: страницу отдаём из кэша сразу, сеть обновляет её в фоне. */

const SHELL_CACHE = 'kishlak-shell-v3'
const ASSET_CACHE = 'kishlak-assets-v3'
const AUDIO_CACHE = 'kishlak-audio-v1'
const SHELL_FILES = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE)
      await shell.addAll(SHELL_FILES).catch(() => {})
      const assets = await caches.open(ASSET_CACHE)
      try {
        const response = await fetch('/precache.json', { cache: 'no-store' })
        if (response.ok) {
          const files = await response.json()
          await Promise.all(files.map((file) => assets.add(file).catch(() => {})))
        }
      } catch {
        /* кэш прогреется из приложения */
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, AUDIO_CACHE])
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // страницы: сначала кэш (мгновенно и без сети), обновление — в фоне
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE)
        const cached = (await cache.match('/index.html')) ?? (await cache.match('/')) ?? (await cache.match(request))

        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put('/index.html', response.clone()).catch(() => {})
            return response
          })
          .catch(() => null)

        if (cached) {
          // не ждём сеть: страница уже есть
          void network
          return cached
        }

        const response = await network
        return response ?? new Response('приложение не сохранено для офлайна', {
          status: 503,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
      })(),
    )
    return
  }

  const cacheable =
    ['/assets/', '/content/'].some((part) => url.pathname.startsWith(part)) ||
    url.pathname === '/content/manifest.json'
  if (!cacheable) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE)
      const cached = await cache.match(request)
      if (cached) {
        // обновляем в фоне, не задерживая ответ
        void fetch(request)
          .then((response) => { if (response.ok) cache.put(request, response.clone()) })
          .catch(() => {})
        return cached
      }
      try {
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone()).catch(() => {})
        return response
      } catch (error) {
        const audio = await caches.open(AUDIO_CACHE)
        const local = await audio.match(request)
        if (local) return local
        throw error
      }
    })(),
  )
})
