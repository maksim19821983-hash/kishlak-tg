import { useEffect, useState } from 'react'

export type SwStatus = {
  state: 'none' | 'installing' | 'ready'
  files: number
}

const ASSET_CACHE = 'kishlak-assets-v4'
const SHELL_CACHE = 'kishlak-shell-v4'

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
        const names = await caches.keys()
        let total = 0
        for (const name of names) {
          if (name !== ASSET_CACHE && name !== SHELL_CACHE) continue
          const cache = await caches.open(name)
          total += (await cache.keys()).length
        }
        return total
      } catch {
        return 0
      }
    }

    const warm = async (): Promise<void> => {
      try {
        const response = await fetch('/precache.json', { cache: 'no-store' })
        if (!response.ok) return
        const files = (await response.json()) as string[]
        const cache = await caches.open(ASSET_CACHE)
        await Promise.all(files.map((file) => cache.add(file).catch(() => {})))
        const shell = await caches.open(SHELL_CACHE)
        await Promise.all(['/'].map((file) => shell.add(file).catch(() => {})))
      } catch {
        /* прогреем позже при следующем открытии */
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
