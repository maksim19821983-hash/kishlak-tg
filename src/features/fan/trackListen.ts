import { getWebEngine } from '@/audio/webEngine'
import type { PlaybackState } from '@/audio/port'
import {
  getState, setState, getOrCreateTrackStat, getOrCreateReleaseStat,
  pushSession, scheduleSave,
} from './state'
import type { FanStats } from './title'

// Порог скачка currentTime, при котором считаем перемотку вперёд
const FORWARD_SEEK_THRESHOLD = 3.0

// ── чистые хелперы (тестируются отдельно) ───────────────────────────────────

export function shouldCountListen(maxPosition: number, duration: number): boolean {
  if (duration <= 0) return false
  return maxPosition / duration >= 0.8
}

export function isForwardSeek(prevTime: number, nextTime: number, prevStatus: string): boolean {
  if (prevStatus !== 'playing') return false
  return nextTime - prevTime > FORWARD_SEEK_THRESHOLD
}

// ── внутреннее состояние сессии ──────────────────────────────────────────────

let prevState: PlaybackState | null = null
let sessionTrackId: string | null = null
let sessionNaturalMax = 0        // максимум, набранный натуральным воспроизведением
let sessionSeconds = 0           // время в текущей сессии
let sessionStarted = false
let lyricsOpenedThisSession = false

let _progressCache: Record<string, number> = {}

// ── обновление кэша прогресса ────────────────────────────────────────────────

function rebuildProgressCache(releaseId: string, totalTracks: number): void {
  const rel = getOrCreateReleaseStat(releaseId)
  _progressCache[releaseId] = totalTracks > 0
    ? Math.min(1, rel.listenedTracks / totalTracks)
    : 0
}

export function getCachedProgress(releaseId: string): number {
  return _progressCache[releaseId] ?? 0
}

// ── обработка обновлений состояния ──────────────────────────────────────────

function flushSession(): void {
  if (!sessionTrackId) return
  const state = getState()
  const tstat = getOrCreateTrackStat(sessionTrackId)
  const updated = {
    ...tstat,
    maxPosition: Math.max(tstat.maxPosition, sessionNaturalMax),
    seconds: tstat.seconds + sessionSeconds,
  }
  setState({
    ...state,
    tracks: { ...state.tracks, [sessionTrackId]: updated },
    totalSeconds: state.totalSeconds + sessionSeconds,
  })
  sessionSeconds = 0
}

function handleTrackChange(next: PlaybackState): void {
  const prevTrackId = prevState?.track?.id ?? null
  const nextTrackId = next.track?.id ?? null

  // завершаем старую сессию
  if (prevTrackId && prevTrackId !== nextTrackId) {
    flushSession()
    // записываем сессию если были в воспроизведении
    if (prevState && (prevState.status === 'playing' || prevState.status === 'paused')) {
      pushSession({ at: Date.now(), withLyrics: lyricsOpenedThisSession })
    }
  }

  if (nextTrackId && nextTrackId !== sessionTrackId) {
    sessionTrackId = nextTrackId
    sessionNaturalMax = 0
    sessionSeconds = 0
    sessionStarted = false
    lyricsOpenedThisSession = false
  }
}

function recordPlay(trackId: string): void {
  const state = getState()
  const tstat = getOrCreateTrackStat(trackId)
  setState({
    ...state,
    tracks: {
      ...state.tracks,
      [trackId]: { ...tstat, plays: tstat.plays + 1, lastAt: Date.now() },
    },
  })
}

function recordListen(trackId: string, releaseId: string, totalTracks: number): void {
  const state = getState()
  const tstat = getOrCreateTrackStat(trackId)
  if (tstat.listens >= 1) return  // уже засчитано

  const rstat = getOrCreateReleaseStat(releaseId)
  const newListenedTracks = rstat.listenedTracks + 1
  setState({
    ...state,
    tracks: { ...state.tracks, [trackId]: { ...tstat, listens: 1 } },
    releases: {
      ...state.releases,
      [releaseId]: { listenedTracks: newListenedTracks },
    },
  })
  rebuildProgressCache(releaseId, totalTracks)
}

export function handleStateUpdate(next: PlaybackState): void {
  const prev = prevState
  prevState = next

  if (!next.track) return

  const trackId = next.track.id
  const releaseId = next.track.releaseId
  const duration = next.duration

  handleTrackChange(next)

  // Новое воспроизведение началось
  if (!sessionStarted && next.status === 'playing') {
    sessionStarted = true
    recordPlay(trackId)
  }
  // Перезапуск (пауза → play снова после ended)
  if (sessionStarted && prev?.status === 'paused' && next.status === 'playing' && prev.track?.id === trackId) {
    // продолжение — не считаем как новый play
  }

  // Обновляем позицию только при натуральном воспроизведении
  if (next.status === 'playing' && prev !== null) {
    const prevTime = prev.currentTime
    const nextTime = next.currentTime
    const dt = nextTime - prevTime

    if (!isForwardSeek(prevTime, nextTime, prev.status)) {
      if (dt > 0 && dt < FORWARD_SEEK_THRESHOLD) {
        sessionNaturalMax = Math.max(sessionNaturalMax, nextTime)
        sessionSeconds += dt
      }
    }
  }

  // ended: трек сменился или status стал idle при currentTime ≈ duration
  const trackEnded =
    (prev !== null && prev.track?.id !== null && next.track?.id !== prev.track?.id && prev.duration > 0 && prev.currentTime >= prev.duration * 0.9) ||
    (prev?.status === 'playing' && next.status === 'idle' && prev.duration > 0 && prev.currentTime >= prev.duration * 0.9)

  if (trackEnded) {
    sessionNaturalMax = Math.max(sessionNaturalMax, prev?.duration ?? duration)
  }

  // Проверяем порог 80%
  if (duration > 0 && shouldCountListen(sessionNaturalMax, duration)) {
    recordListen(trackId, releaseId, next.queue.filter((t) => t.releaseId === releaseId).length || 1)
  }

  // flush при смене трека, паузе
  if (trackEnded) {
    flushSession()
    pushSession({ at: Date.now(), withLyrics: lyricsOpenedThisSession })
    scheduleSave(true)
  } else if (next.status === 'paused' && prev?.status === 'playing') {
    flushSession()
    scheduleSave(true)
  } else {
    scheduleSave()
  }
}

// ── публичный API ─────────────────────────────────────────────────────────────

/** Пометить, что в этой сессии был открыт вкладыш */
export function markLyricsOpened(): void {
  lyricsOpenedThisSession = true
}

/** Посчитать статистику из текущего FanState + totalTracks на каталог */
export function computeStats(
  trackCount: Record<string, number>,  // releaseId → кол-во треков
  totalCatalogTracks: number,
  totalCatalogReleases: number,
): FanStats {
  const state = getState()

  // topReleaseTimeShare через listenedTracks (каталог недоступен здесь)
  const totalListened = Object.values(state.releases).reduce((a, r) => a + r.listenedTracks, 0)
  let topReleaseTimeShare = 0
  if (totalListened > 0) {
    const max = Math.max(...Object.values(state.releases).map((r) => r.listenedTracks))
    topReleaseTimeShare = max / Math.max(totalListened, 1)
  }

  // nightShare
  const sessions = state.sessions
  const nightCount = sessions.filter((s) => {
    const h = new Date(s.at).getHours()
    return h >= 23 || h < 6
  }).length
  const nightShare = sessions.length > 0 ? nightCount / sessions.length : 0

  // lyricsShare
  const lyricsCount = sessions.filter((s) => s.withLyrics).length
  const lyricsShare = sessions.length > 0 ? lyricsCount / sessions.length : 0

  // listenedTracks
  const listenedTracks = Object.values(state.tracks).filter((t) => t.listens >= 1).length

  // maxTrackPlays
  const maxTrackPlays = Object.values(state.tracks).reduce((a, t) => Math.max(a, t.plays), 0)

  // fullReleasesListened — релизы где все треки прослушаны
  const fullReleasesListened = Object.entries(state.releases).filter(([releaseId, rstat]) => {
    const total = trackCount[releaseId] ?? 0
    return total > 0 && rstat.listenedTracks >= total
  }).length

  return {
    listenedTracks,
    totalCatalogTracks,
    totalCatalogReleases,
    fullReleasesListened,
    totalSeconds: state.totalSeconds,
    topReleaseTimeShare,
    nightShare,
    lyricsShare,
    totalSessions: sessions.length,
    maxTrackPlays,
  }
}

/** Инициализация: подписка на движок + visibilitychange */
export function initTrackListener(): () => void {
  const engine = getWebEngine()
  const unsub = engine.subscribe(handleStateUpdate)

  const onVisibility = () => {
    if (document.hidden) {
      flushSession()
      scheduleSave(true)
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    unsub()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
