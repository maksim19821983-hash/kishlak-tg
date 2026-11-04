/** Аварийный перенос данных между устройствами кодом (работает без сервера и сети). */

import { useFavorites } from '@/features/favorites/store'
import { getState, setState, saveStateNow, type TrackFact, type FanState } from '@/features/fan/state'

type Transfer = {
  v: 1
  fav: { tracks: string[]; releases: string[]; updatedAt?: number }
  facts: Record<string, TrackFact>
}

function mergeFacts(a: TrackFact | undefined, b: TrackFact | undefined): TrackFact | undefined {
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

function mergeFan(local: FanState, remote: Record<string, TrackFact>): FanState {
  const tracks: Record<string, TrackFact> = { ...local.tracks }
  for (const [id, fact] of Object.entries(remote)) {
    const merged = mergeFacts(tracks[id], fact)
    if (merged) tracks[id] = merged
  }
  return { ...local, tracks }
}

export function exportCode(): string {
  const fav = useFavorites.getState()
  const data: Transfer = {
    v: 1,
    fav: { tracks: fav.tracks, releases: fav.releases, updatedAt: fav.updatedAt },
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

    if (parsed.fav !== undefined) {
      useFavorites.getState().applyRemote({
        tracks: parsed.fav.tracks ?? [],
        releases: parsed.fav.releases ?? [],
        updatedAt: parsed.fav.updatedAt ?? 0,
      })
    }
    const tracks = useFavorites.getState().tracks

    const merged = mergeFan(getState(), parsed.facts ?? {})
    setState(merged)
    saveStateNow()

    return `ок: избранное ${tracks.length}, треков ${Object.keys(merged.tracks).length}`
  } catch (e) {
    return `ошибка чтения кода: ${String(e)}`
  }
}

/** Ссылка, которая отправляет код в «Избранное» Телеграма. */
export function shareCodeLink(code: string): string {
  const text = `Кишлак — код переноса\n${code}`
  return `https://t.me/share/url?url=${encodeURIComponent('https://kishlak-tg.pages.dev')}&text=${encodeURIComponent(text)}`
}
