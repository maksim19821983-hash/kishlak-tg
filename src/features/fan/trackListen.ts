import { getWebEngine } from '@/audio/webEngine'
import type { PlaybackState } from '@/audio/port'
import type { Track, Release } from '@/data/types'
import {
  getState, setState, getOrCreateTrackFact, pushSession, scheduleSave,
} from './state'
import type { FanStats } from './title'
import { listenedTracksCount, collectedReleases, isListened } from './derive'

// ── LiveSession ───────────────────────────────────────────────────────────────

type LiveSession = {
  trackId: string
  releaseId: string
  duration: number
  naturalMax: number
  seconds: number
  startedAt: number
  withLyrics: boolean
  finished: boolean
}

let session: LiveSession | null = null
let prevState: PlaybackState | null = null

const _fanSubs = new Set<() => void>()

function notifyFan(): void {
  _fanSubs.forEach((fn) => fn())
}

export function subscribeFan(fn: () => void): () => void {
  _fanSubs.add(fn)
  return () => _fanSubs.delete(fn)
}

// ── запись фактов ─────────────────────────────────────────────────────────────

function flushFacts(completed: boolean): void {
  if (!session) return
  const fact = getOrCreateTrackFact(session.trackId)
  const next = {
    ...fact,
    maxPosition: Math.max(fact.maxPosition, session.naturalMax),
    duration: session.duration > 0 ? session.duration : fact.duration,
    seconds: fact.seconds + session.seconds,
    plays: fact.plays + (session.seconds > 0 || completed ? (fact.plays === 0 || session.startedAt > fact.lastAt ? 1 : 0) : 0),
    lastAt: session.startedAt,
    completed: fact.completed || completed,
  }
  setState({ ...getState(), tracks: { ...getState().tracks, [session.trackId]: next } })
  notifyFan()
}

/** Единственная точка завершения трека. Идемпотентна. */
function finishTrack(completed: boolean): void {
  if (!session || session.finished) return
  session.finished = true
  flushFacts(completed)
  pushSession({
    at: Date.now(),
    trackId: session.trackId,
    trackTitle: getWebEngine().getState().track?.title ?? '',
    releaseId: session.releaseId,
    seconds: session.seconds,
    withLyrics: session.withLyrics,
    completed,
  })
  scheduleSave(true)
  getWebEngine().next('ended')
}

/** Экспорт для теста 9 — вызывает finishTrack с текущей сессией */
export function _finishTrackForTest(completed: boolean): void {
  finishTrack(completed)
}

// ── управление сессией ────────────────────────────────────────────────────────

function openSession(trackId: string, releaseId: string): void {
  session = {
    trackId,
    releaseId,
    duration: 0,
    naturalMax: 0,
    seconds: 0,
    startedAt: Date.now(),
    withLyrics: false,
    finished: false,
  }
}

function closeSessionWithoutNext(): void {
  if (!session || session.finished) return
  flushFacts(false)
  pushSession({
    at: Date.now(),
    trackId: session.trackId,
    trackTitle: getWebEngine().getState().track?.title ?? '',
    releaseId: session.releaseId,
    seconds: session.seconds,
    withLyrics: session.withLyrics,
    completed: false,
  })
  session = null
}

// ── обработчик состояния ──────────────────────────────────────────────────────

export function handleStateUpdate(next: PlaybackState): void {
  const prev = prevState
  prevState = next

  if (!next.track) return

  const trackId = next.track.id
  const releaseId = next.track.releaseId

  // смена трека
  const prevTrackId = prev?.track?.id ?? null
  if (prevTrackId && prevTrackId !== trackId) {
    closeSessionWithoutNext()
  }

  // инициализация сессии для нового трека
  if (!session || session.trackId !== trackId) {
    openSession(trackId, releaseId)
  }

  // длительность из движка
  if (next.duration > 0 && session) {
    session.duration = next.duration
  }

  // накопление натуральной позиции
  if (next.status === 'playing' && prev !== null && session) {
    const dt = next.currentTime - prev.currentTime
    if (dt > 0 && dt < 3.0) {
      session.naturalMax = Math.max(session.naturalMax, next.currentTime)
      session.seconds += dt
    }
  }

  // plays — считаем при первом переходе в playing
  if (next.status === 'playing' && prev?.status !== 'playing' && session) {
    const fact = getOrCreateTrackFact(trackId)
    setState({
      ...getState(),
      tracks: {
        ...getState().tracks,
        [trackId]: { ...fact, plays: fact.plays + 1, lastAt: Date.now() },
      },
    })
    notifyFan()
  }

  // watchdog: playing и у самого конца
  if (next.status === 'playing' && session && session.duration > 0) {
    if (next.currentTime >= session.duration - 0.4) {
      finishTrack(true)
      return
    }
  }

  // pause у конца
  if (next.status === 'paused' && prev?.status === 'playing' && session) {
    const dur = session.duration > 0 ? session.duration : next.duration
    if (dur > 0 && next.currentTime >= dur - 0.5) {
      finishTrack(true)
      return
    }
    // обычная пауза
    flushFacts(false)
    scheduleSave(true)
  } else {
    scheduleSave()
  }
}

// ── публичный API ─────────────────────────────────────────────────────────────

export function markLyricsOpened(): void {
  if (session) session.withLyrics = true
}

export function getSessionDiag() {
  return {
    sessionTrackId: session?.trackId ?? null,
    sessionNaturalMax: session?.naturalMax ?? 0,
    sessionSeconds: session?.seconds ?? 0,
    sessionFinished: session?.finished ?? false,
  }
}

export function computeStats(allTracks: Track[], releases: Release[]): FanStats {
  const state = getState()

  const totalSeconds = Object.values(state.tracks).reduce((a, f) => a + f.seconds, 0)

  // seconds per release
  const releaseSeconds: Record<string, number> = {}
  for (const t of allTracks) {
    const fact = state.tracks[t.id]
    if (fact) {
      releaseSeconds[t.releaseId] = (releaseSeconds[t.releaseId] ?? 0) + fact.seconds
    }
  }
  const maxReleaseSeconds = Object.values(releaseSeconds).reduce((a, v) => Math.max(a, v), 0)
  const topReleaseTimeShare = totalSeconds > 0 ? maxReleaseSeconds / totalSeconds : 0

  const sessions = state.sessions
  const nightCount = sessions.filter((s) => { const h = new Date(s.at).getHours(); return h >= 23 || h < 6 }).length
  const nightShare = sessions.length > 0 ? nightCount / sessions.length : 0
  const lyricsShare = sessions.length > 0 ? sessions.filter((s) => s.withLyrics).length / sessions.length : 0

  const listenedTracks = listenedTracksCount(state)
  const maxTrackPlays = Object.values(state.tracks).reduce((a, t) => Math.max(a, t.plays), 0)
  const fullReleasesListened = collectedReleases(releases, state)

  return {
    listenedTracks,
    totalCatalogTracks: allTracks.length,
    totalCatalogReleases: releases.length,
    fullReleasesListened,
    totalSeconds,
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
  const unsubEnded = engine.subscribeEnded((track, duration) => {
    if (session && session.trackId === track.id) {
      if (session.duration <= 0 && duration > 0) session.duration = duration
      finishTrack(true)
    }
  })

  const saveNow = () => {
    if (session) flushFacts(false)
    scheduleSave(true)
  }

  const onVisibility = () => { if (document.hidden) saveNow() }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', saveNow)
  window.addEventListener('beforeunload', saveNow)

  return () => {
    unsub()
    unsubEnded()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', saveNow)
    window.removeEventListener('beforeunload', saveNow)
  }
}

// ── совместимость: isListened реэкспортируется для тестов ─────────────────────
export { isListened }
