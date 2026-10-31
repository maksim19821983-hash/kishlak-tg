import { getWebEngine } from '@/audio/webEngine'
import type { PlaybackState } from '@/audio/port'
import type { Track } from '@/data/types'
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
let sessionNaturalMax = 0
let sessionSeconds = 0
let sessionStarted = false
let lyricsOpenedThisSession = false

let _progressCache: Record<string, number> = {}

// ── кэш прогресса ───────────────────────────────────────────────────────────

function rebuildProgressCache(releaseId: string, totalTracks: number): void {
  const rel = getOrCreateReleaseStat(releaseId)
  _progressCache[releaseId] = totalTracks > 0
    ? Math.min(1, rel.listenedTracks / totalTracks)
    : 0
}

export function getCachedProgress(releaseId: string): number {
  return _progressCache[releaseId] ?? 0
}

// ── flush текущей сессии ────────────────────────────────────────────────────

function flushSession(): void {
  if (!sessionTrackId) return
  const state = getState()
  const tstat = getOrCreateTrackStat(sessionTrackId)
  setState({
    ...state,
    tracks: {
      ...state.tracks,
      [sessionTrackId]: {
        ...tstat,
        maxPosition: Math.max(tstat.maxPosition, sessionNaturalMax),
        seconds: tstat.seconds + sessionSeconds,
      },
    },
    totalSeconds: state.totalSeconds + sessionSeconds,
  })
  sessionSeconds = 0
}

function resetSession(trackId: string, _trackTitle: string): void {
  sessionTrackId = trackId
  sessionNaturalMax = 0
  sessionSeconds = 0
  sessionStarted = false
  lyricsOpenedThisSession = false
}

function recordPlay(trackId: string): void {
  const state = getState()
  const tstat = getOrCreateTrackStat(trackId)
  setState({
    ...state,
    tracks: { ...state.tracks, [trackId]: { ...tstat, plays: tstat.plays + 1, lastAt: Date.now() } },
  })
}

function recordListen(trackId: string, releaseId: string, totalTracks: number): void {
  const state = getState()
  const tstat = getOrCreateTrackStat(trackId)
  if (tstat.listens >= 1) return

  const rstat = getOrCreateReleaseStat(releaseId)
  setState({
    ...state,
    tracks: { ...state.tracks, [trackId]: { ...tstat, listens: 1 } },
    releases: { ...state.releases, [releaseId]: { listenedTracks: rstat.listenedTracks + 1 } },
  })
  rebuildProgressCache(releaseId, totalTracks)
}

// ── обработчик ended (точный) ────────────────────────────────────────────────

function handleEnded(track: Track, duration: number): void {
  // засчитываем natmax до конца и flush
  sessionNaturalMax = Math.max(sessionNaturalMax, duration)
  flushSession()

  // проверяем 80%
  if (shouldCountListen(sessionNaturalMax, duration)) {
    const totalTracks = getWebEngine().getState().queue.filter((t) => t.releaseId === track.releaseId).length || 1
    recordListen(track.id, track.releaseId, totalTracks)
  }

  pushSession({
    at: Date.now(),
    withLyrics: lyricsOpenedThisSession,
    trackId: track.id,
    trackTitle: track.title,
  })
  scheduleSave(true)
  // НЕ сбрасываем sessionTrackId — следующий play этого же трека начнёт новую сессию через handleTrackStart
}

// ── обработчик обновлений state ──────────────────────────────────────────────

function handleTrackChange(next: PlaybackState): void {
  const prevTrackId = prevState?.track?.id ?? null
  const nextTrackId = next.track?.id ?? null

  if (prevTrackId && prevTrackId !== nextTrackId) {
    flushSession()
    if (prevState && (prevState.status === 'playing' || prevState.status === 'paused')) {
      pushSession({
        at: Date.now(),
        withLyrics: lyricsOpenedThisSession,
        trackId: prevTrackId,
        trackTitle: prevState.track?.title,
      })
    }
  }

  if (nextTrackId && (nextTrackId !== sessionTrackId || prevState?.status === 'idle')) {
    resetSession(nextTrackId, next.track?.title ?? '')
  }
}

export function handleStateUpdate(next: PlaybackState): void {
  const prev = prevState
  prevState = next

  if (!next.track) return

  const trackId = next.track.id

  handleTrackChange(next)

  // play начался
  if (!sessionStarted && next.status === 'playing') {
    sessionStarted = true
    // если это новый трек (не resume после паузы на том же треке) — plays+1
    if (prev?.track?.id !== trackId || prev?.status === 'idle') {
      recordPlay(trackId)
    } else if (prev?.status !== 'playing') {
      // resume после паузы на том же треке — тоже plays+1 только если ещё не было
      // (sessionStarted был false — значит это первый play в этой сессии)
      recordPlay(trackId)
    }
  }

  // натуральное накопление позиции
  if (next.status === 'playing' && prev !== null) {
    const prevTime = prev.currentTime
    const nextTime = next.currentTime
    const dt = nextTime - prevTime
    if (!isForwardSeek(prevTime, nextTime, prev.status) && dt > 0 && dt < FORWARD_SEEK_THRESHOLD) {
      sessionNaturalMax = Math.max(sessionNaturalMax, nextTime)
      sessionSeconds += dt
    }
  }

  // pause → flush + save
  if (next.status === 'paused' && prev?.status === 'playing') {
    flushSession()
    scheduleSave(true)
  } else {
    scheduleSave()
  }
}

// ── публичный API ─────────────────────────────────────────────────────────────

export function markLyricsOpened(): void {
  lyricsOpenedThisSession = true
}

export function computeStats(
  trackCount: Record<string, number>,
  totalCatalogTracks: number,
  totalCatalogReleases: number,
): FanStats {
  const state = getState()

  const totalListened = Object.values(state.releases).reduce((a, r) => a + r.listenedTracks, 0)
  let topReleaseTimeShare = 0
  if (totalListened > 0) {
    const max = Math.max(...Object.values(state.releases).map((r) => r.listenedTracks))
    topReleaseTimeShare = max / Math.max(totalListened, 1)
  }

  const sessions = state.sessions
  const nightCount = sessions.filter((s) => { const h = new Date(s.at).getHours(); return h >= 23 || h < 6 }).length
  const nightShare = sessions.length > 0 ? nightCount / sessions.length : 0
  const lyricsShare = sessions.length > 0 ? sessions.filter((s) => s.withLyrics).length / sessions.length : 0

  const listenedTracks = Object.values(state.tracks).filter((t) => t.listens >= 1).length
  const maxTrackPlays = Object.values(state.tracks).reduce((a, t) => Math.max(a, t.plays), 0)

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

export function initTrackListener(): () => void {
  const engine = getWebEngine()
  const unsub = engine.subscribe(handleStateUpdate)
  const unsubEnded = engine.subscribeEnded(handleEnded)

  const onVisibility = () => {
    if (document.hidden) {
      flushSession()
      scheduleSave(true)
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    unsub()
    unsubEnded()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
