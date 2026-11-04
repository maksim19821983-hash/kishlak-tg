import { parseManifest } from './manifest'
import type { Catalog } from './types'

const MANIFEST_URL = '/content/manifest.json'

export class CatalogLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'CatalogLoadError'
  }
}

let cache: Promise<Catalog> | null = null

async function fetchCatalog(): Promise<Catalog> {
  let res: Response
  try {
    res = await fetch(MANIFEST_URL)
  } catch (cause) {
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
