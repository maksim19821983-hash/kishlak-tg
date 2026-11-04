import { useEffect, useState } from 'react'

export type SwStatus = {
  state: 'none' | 'installing' | 'ready'
  files: number
}

const META_CACHE = 'kishlak-meta-v1'
const ACTIVE_KEY = '/__active'

/**
 * Готовность офлайн-кэша: не только активность service worker, но и реальное число файлов.
 * Плюс прогреваем кэш из приложения — на случай, если установка SW не успела.
 */
export function useServiceWorker(): SwStatus {
  const [status, setStatus] = useState<SwStatus>({ state: 'none', files: 0 })

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let alive = true

    const countFiles = async (): Promise<number> => {
      try {
        const meta = await caches.open(META_CACHE)
        const active = await meta.match(ACTIVE_KEY)
        if (!active) return 0
        const build = (await active.text()).trim()
        const assets = await caches.open(`kishlak-assets-${build}`)
        const shell = await caches.open(`kishlak-shell-${build}`)
        return (await assets.keys()).length + (await shell.keys()).length
      } catch {
        return 0
      }
    }

    const warm = async (): Promise<void> => {
      try {
        const response = await fetch('/precache.json', { cache: 'no-store' })
        if (!response.ok) return
        const { build, files } = (await response.json()) as { build: string; files: string[] }
        if (!build || !Array.isArray(files)) return

        const assets = await caches.open(`kishlak-assets-${build}`)
        await Promise.all(files.map((file) => assets.add(file).catch(() => {})))

        const shell = await caches.open(`kishlak-shell-${build}`)
        await Promise.all(['/'].map((file) => shell.add(file).catch(() => {})))

        if ((await assets.keys()).length >= Math.ceil(files.length / 2)) {
          const meta = await caches.open(META_CACHE)
          await meta.put(ACTIVE_KEY, new Response(build))
        }
      } catch {
        /* прогреем при следующем открытии */
      }
    }

    const update = async (): Promise<void> => {
      const files = await countFiles()
      if (!alive) return
      setStatus({
        state: navigator.serviceWorker.controller !== null ? 'ready' : 'installing',
        files,
      })
    }

    void (async () => {
      await update()
      if ((await countFiles()) < 5) await warm()
      await update()
    })()

    navigator.serviceWorker.ready.then(() => { void update() }).catch(() => {})
    navigator.serviceWorker.addEventListener('controllerchange', () => { void update() })
    const timer = setInterval(() => { void update() }, 3000)

    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  return status
}
