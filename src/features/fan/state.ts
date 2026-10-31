export type TrackStat = {
  listens: number        // 0 или 1: слышал ли трек до конца (≥80%)
  plays: number          // сколько раз запускал
  lastAt: number         // timestamp последнего запуска
  maxPosition: number    // максимальная достигнутая позиция натуральным воспроизведением
  seconds: number        // суммарное время прослушивания в секундах
}

export type ReleaseStat = {
  listenedTracks: number  // сколько треков релиза прослушано до конца
}

export type Session = {
  at: number
  withLyrics: boolean
}

export type FanState = {
  version: 1
  tracks: Record<string, TrackStat>
  releases: Record<string, ReleaseStat>
  totalSeconds: number
  sessions: Session[]
  title: { id: string; since: number } | null
  titleComputedAt: number
}

const STORAGE_KEY = 'kishlak:fan:v1'
const MAX_SESSIONS = 500
const SAVE_THROTTLE_MS = 10_000

export function emptyState(): FanState {
  return {
    version: 1,
    tracks: {},
    releases: {},
    totalSeconds: 0,
    sessions: [],
    title: null,
    titleComputedAt: 0,
  }
}

function isValidState(v: unknown): v is FanState {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as FanState).version === 1 &&
    typeof (v as FanState).tracks === 'object' &&
    typeof (v as FanState).totalSeconds === 'number'
  )
}

export function loadState(): FanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed: unknown = JSON.parse(raw)
    if (!isValidState(parsed)) return emptyState()
    // нормализуем поля, которых могло не быть в старых версиях
    return {
      ...emptyState(),
      ...parsed,
      titleComputedAt: (parsed as FanState).titleComputedAt ?? 0,
    }
  } catch {
    return emptyState()
  }
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

/** Сохранить с троттлингом 10 с; force=true — немедленно */
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

/** Добавить сессию, обрезать до MAX_SESSIONS */
export function pushSession(session: Session): void {
  _state = {
    ..._state,
    sessions: [..._state.sessions, session].slice(-MAX_SESSIONS),
  }
}

/** Получить или создать запись трека */
export function getOrCreateTrackStat(trackId: string): TrackStat {
  return _state.tracks[trackId] ?? { listens: 0, plays: 0, lastAt: 0, maxPosition: 0, seconds: 0 }
}

/** Получить или создать запись релиза */
export function getOrCreateReleaseStat(releaseId: string): ReleaseStat {
  return _state.releases[releaseId] ?? { listenedTracks: 0 }
}
