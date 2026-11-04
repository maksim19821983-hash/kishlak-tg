/**
 * Прогрев офлайн-кэша из приложения: страхует случай, когда service worker
 * не успел сохранить бандл при установке. Вызывается один раз после запуска.
 */

const META_CACHE = 'kishlak-meta-v1'
const ACTIVE_KEY = '/__active'

export async function warmOfflineCache(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return
  if (import.meta.env.DEV) return

  try {
    const response = await fetch('/precache.json', { cache: 'no-store' })
    if (!response.ok) return
    const parsed = (await response.json()) as { build?: string; files?: string[] } | string[]
    const build = Array.isArray(parsed) ? `warm${Date.now()}` : parsed.build
    const files = Array.isArray(parsed) ? parsed : parsed.files
    if (build === undefined || !Array.isArray(files) || files.length === 0) return

    const assets = await caches.open(`kishlak-assets-${build}`)
    await Promise.all(files.map((file) => assets.add(file).catch(() => {})))

    const shell = await caches.open(`kishlak-shell-${build}`)
    await shell.add('/').catch(() => {})

    if ((await assets.keys()).length >= Math.ceil(files.length / 2)) {
      const meta = await caches.open(META_CACHE)
      await meta.put(ACTIVE_KEY, new Response(build))
    }
  } catch {
    /* прогреем при следующем открытии */
  }
}
