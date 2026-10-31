import { CatalogRepo } from '@/data/CatalogRepo'
import { getWebEngine } from '@/audio/webEngine'
import { getStartParam } from './telegram'

export type DeepLinkResult =
  | { type: 'track'; trackId: string }
  | { type: 'release'; releaseId: string }
  | { type: 'none' }

export function parseDeepLink(param: string | null): DeepLinkResult {
  if (!param) return { type: 'none' }
  if (param.startsWith('track_')) return { type: 'track', trackId: param.slice(6) }
  if (param.startsWith('release_')) return { type: 'release', releaseId: param.slice(8) }
  return { type: 'none' }
}

/** Применяет deep link при старте: загружает трек в движок, возвращает releaseId для открытия */
export async function applyDeepLink(): Promise<{ openPlayer: boolean; releaseId: string | null }> {
  const param = getStartParam()
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
