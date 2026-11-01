export type TrackFact = {
  maxPosition: number   // макс натуральная позиция, сек
  duration: number      // длительность из аудио
  seconds: number       // суммарно прослушано
  plays: number         // запусков
  lastAt: number        // timestamp последнего запуска
  completed: boolean    // трек дошёл до конца
}

export type Session = {
  at: number
  trackId: string
  trackTitle: string
  releaseId: string
  seconds: number
  withLyrics: boolean
  completed: boolean
}

export type FanState = {
  version: 3
  tracks: Record<string, TrackFact>
  sessions: Session[]
  title: { id: string; since: number } | null
  titleComputedAt: number
}

const STORAGE_KEY = 'kishlak:fan:v3'
const LEGACY_KEY = 'kishlak:fan:v1'
const MAX_SESSIONS = 500
const SAVE_THROTTLE_MS = 10_000

export function emptyState(): FanState {
  return { version: 3, tracks: {}, sessions: [], title: null, titleComputedAt: 0 }
}

function isValidV3(v: unknown): v is FanState {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as FanState).version === 3 &&
    typeof (v as FanState).tracks === 'object'
  )
}

// ── миграция из v1 ───────────────────────────────────────────────────────────

type LegacyTrackStat = {
  listens: number
  plays: number
  lastAt: number
  maxPosition: number
  seconds: number
}

type LegacySession = {
  at: number
  withLyrics: boolean
  trackId?: string
  trackTitle?: string
}

type LegacyState = {
  version: 1
  tracks: Record<string, LegacyTrackStat>
  sessions: LegacySession[]
  totalSeconds?: number
}

function isLegacyState(v: unknown): v is LegacyState {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as LegacyState).version === 1 &&
    typeof (v as LegacyState).tracks === 'object'
  )
}

function migrateFromV1(): FanState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isLegacyState(parsed)) return null

    const tracks: Record<string, TrackFact> = {}
    for (const [id, stat] of Object.entries(parsed.tracks)) {
      tracks[id] = {
        maxPosition: stat.maxPosition,
        duration: 0,
        seconds: stat.seconds,
        plays: stat.plays,
        lastAt: stat.lastAt,
        completed: stat.listens >= 1,
      }
    }

    const sessions: Session[] = (parsed.sessions ?? []).map((s) => ({
      at: s.at,
      trackId: s.trackId ?? '',
      trackTitle: s.trackTitle ?? '',
      releaseId: '',
      seconds: 0,
      withLyrics: s.withLyrics,
      completed: false,
    }))

    return { version: 3, tracks, sessions, title: null, titleComputedAt: 0 }
  } catch {
    return null
  }
}

export function loadState(): FanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isValidV3(parsed)) {
        return { ...emptyState(), ...parsed }
      }
    }
  } catch {
    return emptyState()
  }
  // попробуем мигрировать из v1
  return migrateFromV1() ?? emptyState()
}

let _state: FanState = loadState()
let _lastSaveAt = 0
let _saveTimer: ReturnType<typeof setTimeout> | null = null

export function getState(): FanState {
  return _state
}

export function setState(next: FanState): void {
  _state = next
}

function persistNow(): void {
  _lastSaveAt = Date.now()
  _saveTimer = null
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state))
  } catch {
    // квота localStorage — молча пропускаем
  }
}

export function saveStateNow(): void {
  persistNow()
}

export function scheduleSave(force = false): void {
  if (force) {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null }
    persistNow()
    return
  }
  if (_saveTimer) return
  const elapsed = Date.now() - _lastSaveAt
  const delay = Math.max(0, SAVE_THROTTLE_MS - elapsed)
  _saveTimer = setTimeout(persistNow, delay)
}

export function pushSession(session: Session): void {
  _state = {
    ..._state,
    sessions: [..._state.sessions, session].slice(-MAX_SESSIONS),
  }
}

export function getOrCreateTrackFact(trackId: string): TrackFact {
  return _state.tracks[trackId] ?? { maxPosition: 0, duration: 0, seconds: 0, plays: 0, lastAt: 0, completed: false }
}
