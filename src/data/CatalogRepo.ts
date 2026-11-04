import { parseManifest } from './manifest'
import type { Catalog, Release } from './types'
import { offlineReleases } from '@/features/offline/downloads'

const MANIFEST_URL = '/content/manifest.json'

export class CatalogLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'CatalogLoadError'
  }
}

let cache: Promise<Catalog> | null = null

/** Каталог из скачанного: работает без сети и без манифеста. */
export function offlineCatalog(): Catalog {
  const groups = offlineReleases()
  const releases: Release[] = groups.map(({ releaseId, tracks }) => {
    const first = tracks[0]
    return {
      id: releaseId,
      title: first?.title ?? 'скачанное',
      artistId: 'kishlak',
      year: new Date().getFullYear(),
      type: 'single',
      palette: { mode: 'dark', accent: '#8C5334' },
      motif: 'cassette',
      cover: first?.cover ?? '/content/covers/placeholder.jpg',
      coverSmall: first?.cover ?? '/content/covers/placeholder.jpg',
      tracks: tracks.map((t) => ({ ...t, artistId: 'kishlak' })),
    }
  })
  return {
    artist: { id: 'kishlak', name: 'Кишлак', aliases: [] },
    generatedAt: new Date().toISOString(),
    releases,
  }
}

async function fetchCatalog(): Promise<Catalog> {
  let res: Response
  try {
    res = await fetch(MANIFEST_URL)
  } catch (cause) {
    // сети нет — отдаём то, что скачано на устройство
    const local = offlineCatalog()
    if (local.releases.length > 0) return local
    throw new CatalogLoadError('Нет связи: каталог не загрузился', { cause })
  }
  if (!res.ok) {
    throw new CatalogLoadError(
      `Каталог не найден (${MANIFEST_URL}, HTTP ${res.status}). Соберите его: python3 tools/build_manifest.py`,
    )
  }
  let json: unknown
  try {
    json = await res.json()
  } catch (cause) {
    // Vite dev отдаёт index.html на отсутствующий файл — это тоже «нет манифеста»
    throw new CatalogLoadError(
      `${MANIFEST_URL} не JSON. Скорее всего, файла нет: python3 tools/build_manifest.py`,
      { cause },
    )
  }
  return parseManifest(json)
}

export const CatalogRepo = {
  /** Кэш в памяти; после ошибки следующий вызов пробует заново. */
  load(): Promise<Catalog> {
    if (!cache) {
      cache = fetchCatalog().catch((err: unknown) => {
        cache = null
        throw err
      })
    }
    return cache
  },
}
