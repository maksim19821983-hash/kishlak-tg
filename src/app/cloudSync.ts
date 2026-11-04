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
  removeItem?: (key: string, cb?: (err: string | null) => void) => void
}

// CloudStorage разрешает только латиницу, цифры, дефис и подчёркивание: точки запрещены
const FAV_KEY = 'fav_v1'
const STATE_PREFIX = 'state_v1_'
const PROBE_KEY = 'probe_v1'
const CHUNK_LIMIT = 900    // iOS-клиент теряет крупные значения — держим запас
const MAX_CHUNKS = 24
const FAN_PREFIX = 'fan_'
const MAX_KEY = 128

function safeKey(releaseId: string): string {
  return `${FAN_PREFIX}${releaseId.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, MAX_KEY)
}

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
  lastError: string
  payload: string
  lastSyncAt: string
  probe: string
}

const diag: Diag = {
  available: false, sdkPlatform: '-', lastPull: '-', lastPush: '-', remoteFav: '-', keys: 0, lastError: '—',
  payload: '—', lastSyncAt: '—', probe: '—',
}

export function getCloudDiag(): Diag {
  return { ...diag, available: cloudSyncAvailable(), sdkPlatform: (window.Telegram?.WebApp?.platform ?? '-') }
}

/** Колбэк CloudStorage может не прийти вовсе — страхуемся таймаутом. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let done = false
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        diag.lastError = `таймаут ${ms} мс`
        resolve(fallback)
      }
    }, ms)
    void promise.then((value) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(value)
    })
  })
}

function read(c: Cloud, key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      c.getItem(key, (err, value) => {
        if (err) diag.lastError = `getItem ${key}: ${err}`
        resolve(err || !value ? null : value)
      })
    } catch (e) {
      diag.lastError = `getItem ${key}: ${String(e)}`
      resolve(null)
    }
  })
}

function write(c: Cloud, key: string, value: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      c.setItem(key, value, (err) => {
        if (err) diag.lastError = `setItem ${key}: ${err} (${value.length} байт)`
        resolve()
      })
    } catch (e) {
      diag.lastError = `setItem ${key}: ${String(e)}`
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
  diag.lastError = '—'

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
  for (const id of releaseIds) {
    const raw = await withTimeout(read(c, safeKey(id)), 1200, null)
    if (!raw) continue
    try {
      Object.assign(remoteTracks, JSON.parse(raw) as Record<string, TrackFact>)
    } catch {
      /* пропускаем битый ключ */
    }
  }
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

  diag.lastError = '—'
  const fav = useFavorites.getState()
  await withTimeout(write(c, FAV_KEY, JSON.stringify({ tracks: fav.tracks, releases: fav.releases })), 1200, undefined)

  // пишем по одному: параллельные вызовы CloudStorage подвешивают колбэки
  const groups = splitByRelease(getState())
  const entries = Object.entries(groups)
  let written = 0
  for (const [release, value] of entries) {
    await withTimeout(write(c, safeKey(release), value), 1200, undefined)
    written += 1
    diag.keys = written + 1
  }
  diag.lastPush = `избранное ${fav.tracks.length}, записано релизов ${written} из ${entries.length}`
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

export function schedulePush(delayMs = 2500): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void syncCompact()
  }, delayMs)
}

/** Подписка на изменения избранного: сразу планируем отправку в облако. */
export function watchFavorites(): () => void {
  // подписка не зависит от доступности облака: она появится позже
  return useFavorites.subscribe(() => schedulePush(1200))
}

/** Полный цикл: забрать чужое, слить, отправить своё. */
export async function syncNow(releaseIds: string[] | null): Promise<string> {
  const c = cloud()
  if (!c) return 'облако недоступно'
  const ids = releaseIds ?? Object.keys(getState().tracks).map((id) => id.replace(/-\d+$/, ''))
  await pullAndMerge(Array.from(new Set(ids)))
  await pushAll()
  return `${diag.lastPull} · ${diag.lastPush}`
}


// ── перенос данных кодом (работает без облака) ──────────────────────────────

type Transfer = {
  v: 1
  fav: { tracks: string[]; releases: string[] }
  facts: Record<string, TrackFact>
}

export function exportCode(): string {
  const fav = useFavorites.getState()
  const data: Transfer = {
    v: 1,
    fav: { tracks: fav.tracks, releases: fav.releases },
    facts: getState().tracks,
  }
  const json = JSON.stringify(data)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

export async function importCode(code: string): Promise<string> {
  try {
    const clean = code.trim().replace(/\s+/g, '')
    const binary = atob(clean)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Transfer
    if (parsed.v !== 1) return 'неизвестная версия кода'

    const fav = useFavorites.getState()
    const tracks = Array.from(new Set([...(parsed.fav?.tracks ?? []), ...fav.tracks]))
    const releases = Array.from(new Set([...(parsed.fav?.releases ?? []), ...fav.releases]))
    useFavorites.setState({ tracks, releases })

    const merged = mergeFan(getState(), parsed.facts ?? {})
    setState(merged)
    saveStateNow()

    return `ок: избранное ${tracks.length}, треков ${Object.keys(merged.tracks).length}`
  } catch (e) {
    return `ошибка чтения кода: ${String(e)}`
  }
}


// ── компактный формат: состояние частями по лимиту ключа ────────────────────

function packChunks(): string[] {
  const fav = useFavorites.getState()
  const facts = getState().tracks
  const records = Object.entries(facts).map(([id, f]) => {
    const compact = [Math.round(f.maxPosition), Math.round(f.duration), Math.round(f.seconds), f.plays, Math.round(f.lastAt / 1000), f.completed ? 1 : 0]
    return `{"${id}":${JSON.stringify(compact)}}`
  })

  const chunks: string[] = []
  const head = `{"f":${JSON.stringify([fav.tracks, fav.releases])}}`
  let current = head
  for (const record of records) {
    if ((current + record).length > CHUNK_LIMIT - 2) {
      chunks.push(current + (current === head ? '' : ''))
      current = `{"f":[]}`
    }
    current += record
  }
  chunks.push(current)
  return chunks
}

function mergeChunks(raws: string[]): { fav: { tracks: string[]; releases: string[] }; facts: Record<string, TrackFact> } | null {
  const tracks = new Set<string>()
  const releases = new Set<string>()
  const facts: Record<string, TrackFact> = {}
  let parsedAny = false

  for (const raw of raws) {
    if (!raw) continue
    try {
      const obj = JSON.parse(raw) as { f?: [string[], string[]]; [key: string]: unknown }
      parsedAny = true
      if (Array.isArray(obj.f)) {
        obj.f[0]?.forEach((t) => tracks.add(t))
        obj.f[1]?.forEach((r) => releases.add(r))
      }
      for (const [id, value] of Object.entries(obj)) {
        if (id === 'f' || !Array.isArray(value) || value.length < 6) continue
        facts[id] = {
          maxPosition: Number(value[0]) || 0,
          duration: Number(value[1]) || 0,
          seconds: Number(value[2]) || 0,
          plays: Number(value[3]) || 0,
          lastAt: (Number(value[4]) || 0) * 1000,
          completed: value[5] === 1,
        }
      }
    } catch {
      /* битый кусок пропускаем */
    }
  }

  if (!parsedAny) return null
  return { fav: { tracks: [...tracks], releases: [...releases] }, facts }
}

/** Синхронизация: состояние режется на куски по лимиту ключа CloudStorage. */
export async function syncCompact(): Promise<string> {
  const c = cloud()
  if (!c) return 'облако недоступно'

  diag.lastError = '—'

  // 1) читаем все куски; первый читаем дважды — облако может ответить с задержкой
  const raws: string[] = []
  for (let i = 0; i < MAX_CHUNKS; i++) {
    let raw = await withTimeout(read(c, `${STATE_PREFIX}${i}`), 3000, null)
    if (raw === null && i === 0) {
      await new Promise((r) => setTimeout(r, 700))
      raw = await withTimeout(read(c, `${STATE_PREFIX}${i}`), 3000, null)
    }
    if (raw === null) break
    raws.push(raw)
  }

  diag.probe = await readProbe()

  const remote = mergeChunks(raws)
  if (remote) {
    const fav = useFavorites.getState()
    useFavorites.setState({
      tracks: Array.from(new Set([...remote.fav.tracks, ...fav.tracks])),
      releases: Array.from(new Set([...remote.fav.releases, ...fav.releases])),
    })
    const merged = mergeFan(getState(), remote.facts)
    setState(merged)
    saveStateNow()
    diag.lastPull = `кусков ${raws.length}, избранное ${remote.fav.tracks.length}, треков ${Object.keys(remote.facts).length}`
  } else {
    diag.lastPull = 'в облаке пусто'
  }

  // 2) отправляем объединённое, по куску за раз
  const chunks = packChunks()
  if (chunks.length > MAX_CHUNKS) {
    diag.lastPush = `слишком много данных: ${chunks.length} кусков`
    return diag.lastPush
  }
  let written = 0
  for (let i = 0; i < chunks.length; i++) {
    await withTimeout(write(c, `${STATE_PREFIX}${i}`, chunks[i] ?? ''), 1500, undefined)
    written += 1
    diag.keys = written
  }

  // проверяем, что запись реально легла: читаем обратно первый кусок
  const check = await withTimeout(read(c, `${STATE_PREFIX}0`), 3000, null)
  const checkLen = check === null ? 0 : check.length

  diag.payload = `${chunks.reduce((sum, chunk) => sum + chunk.length, 0)} байт в ${chunks.length} частях`
  diag.lastPush = `избранное ${useFavorites.getState().tracks.length}, треков ${Object.keys(getState().tracks).length}, ` +
    `проверка чтением: ${checkLen === 0 ? 'НЕ ПРОЧИТАЛОСЬ' : `прочитано ${checkLen} байт`}`
  diag.lastSyncAt = new Date().toLocaleTimeString('ru-RU')
  return `${diag.lastPull} · ${diag.lastPush} · ошибка: ${diag.lastError}`
}


/** Читает маркер, который пишется только вручную — служит проверкой сохранности. */
export async function readProbe(): Promise<string> {
  const c = cloud()
  if (!c) return 'облако недоступно'
  const raw = await withTimeout(read(c, PROBE_KEY), 1500, null)
  if (raw === null) return 'пусто'
  const date = new Date(Number(raw) * 1000)
  return Number.isFinite(date.getTime()) ? date.toLocaleString('ru-RU') : raw
}

/** Пишет маркер и сразу читает обратно: проверка записи без влияния синхронизации. */
export async function writeProbe(): Promise<string> {
  const c = cloud()
  if (!c) return 'облако недоступно'
  const stamp = String(Math.floor(Date.now() / 1000))
  await withTimeout(write(c, PROBE_KEY, stamp), 2000, undefined)
  const back = await withTimeout(read(c, PROBE_KEY), 2000, null)
  if (back === null) return `записано ${stamp}, но чтение вернуло пусто`
  return back === stamp ? `записано и прочитано: ${new Date(Number(stamp) * 1000).toLocaleString('ru-RU')}` : `в облаке другое значение: ${back}`
}
