/**
 * Офлайн-оболочка с версиями.
 * Кэш версионируется по сборке: новая версия становится активной только после того,
 * как все её файлы сохранены. Иначе офлайн отдавал новый HTML со старыми скриптами.
 */

const META_CACHE = 'kishlak-meta-v1'
const AUDIO_CACHE = 'kishlak-audio-v1'
const ACTIVE_KEY = '/__active'
const shellCache = (build) => `kishlak-shell-${build}`
const assetCache = (build) => `kishlak-assets-${build}`

async function activeBuild() {
  try {
    const meta = await caches.open(META_CACHE)
    const hit = await meta.match(ACTIVE_KEY)
    return hit === undefined ? null : (await hit.text()).trim()
  } catch {
    return null
  }
}

async function setActiveBuild(build) {
  const meta = await caches.open(META_CACHE)
  await meta.put(ACTIVE_KEY, new Response(build))
}

async function installBuild(build, files) {
  const shell = await caches.open(shellCache(build))
  const assets = await caches.open(assetCache(build))

  await shell.addAll(['/', '/offline.html', '/manifest.json', '/icons/icon-192.png']).catch(() => {})

  let stored = 0
  for (const file of files) {
    try {
      await assets.add(file)
      stored += 1
    } catch {
      /* пропускаем отдельный файл */
    }
  }
  return stored
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch('/precache.json', { cache: 'no-store' })
        if (!response.ok) return
        const { build, files } = await response.json()
        const stored = await installBuild(build, files)
        // активируем версию только если сохранилась хотя бы половина файлов
        if (stored >= Math.ceil(files.length / 2)) await setActiveBuild(build)
      } catch {
        /* версия останется прежней */
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const build = await activeBuild()
      const keep = new Set([META_CACHE, AUDIO_CACHE, shellCache(build ?? ''), assetCache(build ?? '')])
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

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const build = await activeBuild()
        if (build !== null) {
          const shell = await caches.open(shellCache(build))
          const cached = (await shell.match('/')) ?? (await shell.match(request))
          if (cached) {
            void fetch(request)
              .then(async (response) => {
                if (!response.ok || response.redirected) return
                // обновляем страницу только внутри той же версии
                await shell.put('/', response.clone())
              })
              .catch(() => {})
            return cached
          }
        }

        const fallback = await caches.match('/offline.html')
        if (fallback !== undefined) return fallback
        return new Response('нет сети', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })
      })(),
    )
    return
  }

  const cacheable = ['/assets/', '/content/'].some((part) => url.pathname.startsWith(part))
  if (!cacheable) return

  event.respondWith(
    (async () => {
      const build = await activeBuild()
      if (build !== null) {
        const assets = await caches.open(assetCache(build))
        const cached = await assets.match(request)
        if (cached) return cached
      }
      try {
        const response = await fetch(request)
        if (response.ok && build !== null) {
          const assets = await caches.open(assetCache(build))
          assets.put(request, response.clone()).catch(() => {})
        }
        return response
      } catch (error) {
        const audio = await caches.open(AUDIO_CACHE)
        const local = await audio.match(request)
        if (local !== undefined) return local
        throw error
      }
    })(),
  )
})
