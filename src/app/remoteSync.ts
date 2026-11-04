/**
 * Синхронизация через собственный сервер (Cloudflare Worker + KV).
 * Авторизация — initData Телеграма, сервер проверяет подпись токеном бота.
 */

import { useFavorites } from '@/features/favorites/store'
import { getState, setState, saveStateNow, type TrackFact } from '@/features/fan/state'

/**
 * По умолчанию синхронизация на том же домене (/api/sync, Pages Function) —
 * так нет кросс-доменных запросов и их блокировок. VITE_SYNC_URL может переопределить адрес.
 */
export const REMOTE_URL: string = (import.meta.env.VITE_SYNC_URL as string | undefined) ?? '/api/sync'

type Payload = {
  fav: { tracks: string[]; releases: string[]; updatedAt?: number }
  facts: Record<string, TrackFact>
}

export function remoteAvailable(): boolean {
  if (REMOTE_URL === '') return false
  try {
    return (window.Telegram?.WebApp?.initData ?? '') !== ''
  } catch {
    return false
  }
}

function initData(): string {
  try {
    return window.Telegram?.WebApp?.initData ?? ''
  } catch {
    return ''
  }
}

export function pack(): Payload {
  const fav = useFavorites.getState()
  return {
    fav: { tracks: fav.tracks, releases: fav.releases, updatedAt: fav.updatedAt },
    facts: getState().tracks,
  }
}

export function merge(remote: Payload): void {
  // избранное не объединяем: удаление должно доезжать между устройствами
  if (remote.fav !== undefined) {
    useFavorites.getState().applyRemote({
      tracks: remote.fav.tracks ?? [],
      releases: remote.fav.releases ?? [],
      updatedAt: remote.fav.updatedAt ?? 0,
    })
  }

  const facts: Record<string, TrackFact> = { ...getState().tracks }
  for (const [id, fact] of Object.entries(remote.facts ?? {})) {
    const local = facts[id]
    facts[id] = local === undefined
      ? fact
      : {
          maxPosition: Math.max(local.maxPosition, fact.maxPosition),
          duration: Math.max(local.duration, fact.duration),
          seconds: Math.max(local.seconds, fact.seconds),
          plays: Math.max(local.plays, fact.plays),
          lastAt: Math.max(local.lastAt, fact.lastAt),
          completed: local.completed || fact.completed,
        }
  }
  setState({ ...getState(), tracks: facts })
  saveStateNow()

}

async function call(method: 'GET' | 'POST', body?: Payload): Promise<Payload | null> {
  let response: Response
  try {
    response = await fetch(REMOTE_URL, {
      method,
      mode: 'cors',
      headers: { 'x-init-data': initData(), 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (e) {
    // сеть до сервера не дошла: показываем адрес, чтобы было что проверять
    const reason = e instanceof Error ? e.message : String(e)
    throw new Error(`нет связи с ${REMOTE_URL.replace('https://', '')} (${reason})`)
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${REMOTE_URL} ответил ${response.status}${detail === '' ? '' : `: ${detail.slice(0, 80)}`}`)
  }
  const data = (await response.json()) as { state?: Payload | null }
  return method === 'GET' ? (data.state ?? null) : null
}

const LAST_PUSH_KEY = 'kishlak:sync:last'
let dirty = false

/** Помечает, что локальные данные изменились и их надо отправить. */
export function markDirty(): void {
  dirty = true
}

/** Есть ли неотправленные изменения. */
export function hasPendingChanges(): boolean {
  return dirty
}

function lastPushed(): string {
  try {
    return localStorage.getItem(LAST_PUSH_KEY) ?? ''
  } catch {
    return ''
  }
}

function rememberPush(signature: string): void {
  try {
    localStorage.setItem(LAST_PUSH_KEY, signature)
  } catch {
    /* ничего */
  }
  dirty = false
}

/**
 * Синхронизация с экономией квоты KV: читаем часто, пишем только при изменениях.
 * У Cloudflare на бесплатном тарифе 1000 записей в сутки.
 */
export async function syncRemote(options: { push?: boolean } = {}): Promise<string> {
  if (!remoteAvailable()) {
    markSync(false, 'нет Telegram')
    return 'синхронизация доступна только в Телеграме'
  }

  const remote = await call('GET')
  if (remote !== null) merge(remote)

  const merged = pack()
  const signature = JSON.stringify(merged)
  const needPush = options.push !== false && (dirty || signature !== lastPushed())

  if (needPush) {
    await call('POST', merged)
    rememberPush(signature)
  }

  const count = Object.keys(merged.facts).length
  const fav = merged.fav.tracks.length
  markSync(true, needPush ? '' : 'без изменений')
  return needPush
    ? `сервер: отправлено — избранное ${fav}, треков ${count}`
    : `сервер: без изменений (избранное ${fav}, треков ${count})`
}


/** Диагностика подписи на сервере: покажет, сходится ли хеш и какой длины токен. */
export async function debugRemote(): Promise<string> {
  if (REMOTE_URL === '') return 'адрес сервера не задан'
  try {
    const response = await fetch(`${REMOTE_URL.replace(/\/$/, '')}/debug`, {
      headers: { 'x-init-data': initData() },
    })
    const data = (await response.json()) as Record<string, unknown>
    return Object.entries(data).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
  } catch (e) {
    return `ошибка запроса: ${String(e)}`
  }
}


type SyncStatus = { at: number; ok: boolean; error: string }

const status: SyncStatus = { at: 0, ok: false, error: '' }

export function getSyncStatus(): SyncStatus & { available: boolean } {
  return { ...status, available: remoteAvailable() }
}

/** Помечает результат синхронизации для профиля. */
export function markSync(ok: boolean, error = ''): void {
  status.at = Date.now()
  status.ok = ok
  status.error = error
}
