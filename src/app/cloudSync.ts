/**
 * Синхронизация между устройствами через Telegram CloudStorage.
 * Данные одного аккаунта доступны на телефоне и на ПК; без Телеграма живём в localStorage.
 *
 * Состояние прослушиваний хранится по релизам — у CloudStorage лимит 4096 байт на ключ.
 */

import { ensureSdk } from './telegram'
import { useFavorites } from '@/features/favorites/store'
import { getState, setState, saveStateNow, type FanState, type TrackFact } from '@/features/fan/state'

type Cloud = {
  getItem: (key: string, cb: (err: string | null, value?: string) => void) => void
  setItem: (key: string, value: string, cb?: (err: string | null) => void) => void
}

const FAV_KEY = 'fav.v1'
const FAN_PREFIX = 'fan.'

function cloud(): Cloud | null {
  try {
    const c = (window.Telegram?.WebApp as unknown as { CloudStorage?: Cloud } | undefined)?.CloudStorage
    return c && typeof c.getItem === 'function' && typeof c.setItem === 'function' ? c : null
  } catch {
    return null
  }
}

export function cloudSyncAvailable(): boolean {
  return cloud() !== null
}

type Diag = {
  available: boolean
  sdkPlatform: string
  lastPull: string
  lastPush: string
  remoteFav: string
  keys: number
}

const diag: Diag = { available: false, sdkPlatform: '-', lastPull: '-', lastPush: '-', remoteFav: '-', keys: 0 }

export function getCloudDiag(): Diag {
  return { ...diag, available: cloudSyncAvailable(), sdkPlatform: (window.Telegram?.WebApp?.platform ?? '-') }
}

function read(c: Cloud, key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      c.getItem(key, (err, value) => resolve(err || !value ? null : value))
    } catch {
      resolve(null)
    }
  })
}

function write(c: Cloud, key: string, value: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      c.setItem(key, value, () => resolve())
    } catch {
      resolve()
    }
  })
}

// ── слияние ─────────────────────────────────────────────────────────────────

function mergeFact(a: TrackFact | undefined, b: TrackFact | undefined): TrackFact | undefined {
  if (!a) return b
  if (!b) return a
  return {
    maxPosition: Math.max(a.maxPosition, b.maxPosition),
    duration: Math.max(a.duration, b.duration),
    seconds: Math.max(a.seconds, b.seconds),
    plays: Math.max(a.plays, b.plays),
    lastAt: Math.max(a.lastAt, b.lastAt),
    completed: a.completed || b.completed,
  }
}

function mergeFan(local: FanState, remoteTracks: Record<string, TrackFact>): FanState {
  const tracks: Record<string, TrackFact> = { ...local.tracks }
  for (const [id, fact] of Object.entries(remoteTracks)) {
    const merged = mergeFact(tracks[id], fact)
    if (merged) tracks[id] = merged
  }
  return { ...local, tracks }
}

function splitByRelease(state: FanState): Record<string, string> {
  const groups: Record<string, Record<string, TrackFact>> = {}
  for (const [id, fact] of Object.entries(state.tracks)) {
    const release = id.replace(/-\d+$/, '')
    groups[release] = groups[release] ?? {}
    groups[release][id] = fact
  }
  const out: Record<string, string> = {}
  for (const [release, facts] of Object.entries(groups)) {
    out[release] = JSON.stringify(facts)
  }
  return out
}

// ── публичное ───────────────────────────────────────────────────────────────

export async function initCloud(): Promise<boolean> {
  await ensureSdk(4000)
  return cloudSyncAvailable()
}

export async function pullAndMerge(releaseIds: string[]): Promise<void> {
  const c = cloud()
  if (!c) {
    diag.lastPull = 'нет CloudStorage'
    return
  }

  // избранное
  const favRaw = await read(c, FAV_KEY)
  diag.remoteFav = favRaw === null ? 'пусто' : favRaw.slice(0, 120)
  if (favRaw) {
    try {
      const remote = JSON.parse(favRaw) as { tracks?: string[]; releases?: string[] }
      const local = useFavorites.getState()
      const tracks = Array.from(new Set([...(remote.tracks ?? []), ...local.tracks]))
      const releases = Array.from(new Set([...(remote.releases ?? []), ...local.releases]))
      useFavorites.setState({ tracks, releases })
    } catch {
      /* битые данные — игнорируем */
    }
  }

  // прослушивания по релизам
  const remoteTracks: Record<string, TrackFact> = {}
  const values = await Promise.all(releaseIds.map((id) => read(c, `${FAN_PREFIX}${id}`)))
  values.forEach((raw) => {
    if (!raw) return
    try {
      Object.assign(remoteTracks, JSON.parse(raw) as Record<string, TrackFact>)
    } catch {
      /* пропускаем битый ключ */
    }
  })
  const merged = mergeFan(getState(), remoteTracks)
  setState(merged)
  saveStateNow()
  diag.lastPull = `получено треков: ${Object.keys(remoteTracks).length}, всего: ${Object.keys(merged.tracks).length}`
}

export async function pushAll(): Promise<void> {
  const c = cloud()
  if (!c) {
    diag.lastPush = 'нет CloudStorage'
    return
  }

  const fav = useFavorites.getState()
  await write(c, FAV_KEY, JSON.stringify({ tracks: fav.tracks, releases: fav.releases }))

  const groups = splitByRelease(getState())
  await Promise.all(Object.entries(groups).map(([release, value]) => write(c, `${FAN_PREFIX}${release}`, value)))
  diag.keys = Object.keys(groups).length + 1
  diag.lastPush = `отправлено: избранное ${fav.tracks.length}, релизов ${groups ? Object.keys(groups).length : 0}`
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

export function schedulePush(delayMs = 2500): void {
  if (!cloudSyncAvailable()) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void pushAll()
  }, delayMs)
}

/** Подписка на изменения избранного: сразу планируем отправку в облако. */
export function watchFavorites(): () => void {
  if (!cloudSyncAvailable()) return () => {}
  return useFavorites.subscribe(() => schedulePush())
}
