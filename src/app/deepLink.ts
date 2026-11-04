import { CatalogRepo } from '@/data/CatalogRepo'
import { getWebEngine } from '@/audio/webEngine'
import { getStartParam } from './telegram'

export type DeepLinkResult =
  | { type: 'track'; trackId: string }
  | { type: 'release'; releaseId: string }
  | { type: 'none' }

/** Есть ли в запуске ссылка на конкретный трек/релиз. */
export function hasDeepLink(): boolean {
  const fromQuery = (() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('track') !== null || params.get('release') !== null
    } catch {
      return false
    }
  })()
  const start = getStartParam()
  return (start !== null && start !== '') || fromQuery
}

export function parseDeepLink(param: string | null): DeepLinkResult {
  if (!param) return { type: 'none' }
  if (param.startsWith('track_')) return { type: 'track', trackId: param.slice(6) }
  if (param.startsWith('release_')) return { type: 'release', releaseId: param.slice(8) }
  return { type: 'none' }
}

/** Применяет deep link при старте: загружает трек в движок, возвращает releaseId для открытия */
export async function applyDeepLink(): Promise<{ openPlayer: boolean; releaseId: string | null }> {
  const fromQuery = (() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const track = params.get('track')
      if (track !== null) return `track_${track}`
      const release = params.get('release')
      if (release !== null) return `release_${release}`
      return null
    } catch {
      return null
    }
  })()
  const start = getStartParam()
  const param = start !== null && start !== '' ? start : fromQuery
  const link = parseDeepLink(param)

  if (link.type === 'none') return { openPlayer: false, releaseId: null }

  try {
    const catalog = await CatalogRepo.load()

    if (link.type === 'track') {
      for (const release of catalog.releases) {
        const idx = release.tracks.findIndex((t) => t.id === link.trackId)
        if (idx >= 0) {
          getWebEngine().load(release.tracks, idx)
          return { openPlayer: true, releaseId: release.id }
        }
      }
    }

    if (link.type === 'release') {
      const release = catalog.releases.find((r) => r.id === link.releaseId)
      if (release && release.tracks.length > 0) {
        getWebEngine().load(release.tracks, 0)
        return { openPlayer: true, releaseId: release.id }
      }
    }
  } catch {}

  return { openPlayer: false, releaseId: null }
}
