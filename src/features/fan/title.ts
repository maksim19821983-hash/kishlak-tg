import type { FanState } from './state'

export interface FanStats {
  listenedTracks: number
  totalCatalogTracks: number
  totalCatalogReleases: number
  fullReleasesListened: number   // релизов, где все треки прослушаны
  totalSeconds: number
  topReleaseTimeShare: number    // 0..1, доля топ-релиза по времени
  nightShare: number             // доля ночных сессий
  lyricsShare: number            // доля сессий с открытым текстом
  totalSessions: number
  maxTrackPlays: number          // plays у топ-трека
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** Чистая функция — первый подходящий по приоритету титул */
export function pickTitle(stats: FanStats): string | null {
  const {
    listenedTracks, totalCatalogTracks, totalSeconds, topReleaseTimeShare,
    nightShare, lyricsShare, totalSessions, maxTrackPlays,
    fullReleasesListened, totalCatalogReleases,
  } = stats

  const totalMinutes = totalSeconds / 60
  const catalogShare = totalCatalogTracks > 0 ? listenedTracks / totalCatalogTracks : 0

  if (topReleaseTimeShare >= 0.4 && catalogShare >= 0.7) return 'РЕЗИДЕНТ'
  if (nightShare >= 0.5 && totalMinutes >= 60) return 'НОЧНАЯ СМЕНА'
  if (lyricsShare >= 0.5 && totalSessions >= 20) return 'ДОСЛОВНЫЙ'
  if (maxTrackPlays >= 15) return 'НА ПОВТОРЕ'
  if (fullReleasesListened >= 10 || (totalCatalogReleases > 0 && fullReleasesListened >= totalCatalogReleases && totalCatalogReleases >= 5)) return 'ДИГГЕР'
  if (catalogShare >= 1 && totalCatalogTracks > 0) return 'ПЕРВЫЙ РЯД'
  if (listenedTracks >= 10) return 'СЛУШАТЕЛЬ'
  return null
}

/** Обновить title в state если нужно (возвращает патч для setState) */
export function maybeUpdateTitle(
  state: FanState,
  stats: FanStats,
  now = Date.now(),
): Partial<FanState> {
  // не пересчитываем чаще раза в сутки
  if (now - state.titleComputedAt < ONE_DAY_MS) return {}

  const newId = pickTitle(stats)
  const updates: Partial<FanState> = { titleComputedAt: now }

  if (newId === null) return updates

  // первое получение — сразу
  if (state.title === null) {
    return { ...updates, title: { id: newId, since: now } }
  }

  // смена не чаще раза в неделю
  if (newId !== state.title.id && now - state.title.since >= SEVEN_DAYS_MS) {
    return { ...updates, title: { id: newId, since: now } }
  }

  return updates
}

const MONTH_RU = [
  'ЯНВАРЯ', 'ФЕВРАЛЯ', 'МАРТА', 'АПРЕЛЯ', 'МАЯ', 'ИЮНЯ',
  'ИЮЛЯ', 'АВГУСТА', 'СЕНТЯБРЯ', 'ОКТЯБРЯ', 'НОЯБРЯ', 'ДЕКАБРЯ',
]

export function formatSince(ts: number): string {
  const d = new Date(ts)
  return `С ${MONTH_RU[d.getMonth()]}`
}
