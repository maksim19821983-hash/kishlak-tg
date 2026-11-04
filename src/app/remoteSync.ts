/**
 * Синхронизация через собственный сервер (Cloudflare Worker + KV).
 * Авторизация — initData Телеграма, сервер проверяет подпись токеном бота.
 */

import { useFavorites } from '@/features/favorites/store'
import { getState, setState, saveStateNow, type TrackFact } from '@/features/fan/state'

/** Заполняется после деплоя воркера: адрес вида https://kishlak-sync.<аккаунт>.workers.dev */
export const REMOTE_URL: string = (import.meta.env.VITE_SYNC_URL as string | undefined) ?? ''

type Payload = {
  fav: { tracks: string[]; releases: string[] }
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
    fav: { tracks: fav.tracks, releases: fav.releases },
    facts: getState().tracks,
  }
}

export function merge(remote: Payload): void {
  const fav = useFavorites.getState()
  useFavorites.setState({
    tracks: Array.from(new Set([...(remote.fav?.tracks ?? []), ...fav.tracks])),
    releases: Array.from(new Set([...(remote.fav?.releases ?? []), ...fav.releases])),
  })

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
  const response = await fetch(REMOTE_URL, {
    method,
    headers: { 'x-init-data': initData(), 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) throw new Error(`сервер ответил ${response.status}`)
  const data = (await response.json()) as { state?: Payload | null }
  return method === 'GET' ? (data.state ?? null) : null
}

/** Один цикл: забрать, слить, отправить. Возвращает короткий отчёт. */
export async function syncRemote(): Promise<string> {
  if (!remoteAvailable()) return 'сервер не настроен'

  const remote = await call('GET')
  if (remote !== null) merge(remote)

  const merged = pack()
  await call('POST', merged)

  const count = Object.keys(merged.facts).length
  const fav = merged.fav.tracks.length
  return `сервер: избранное ${fav}, треков ${count}`
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
