/** Синхронизация списка скачанного: сервер хранит id треков, приложение догружает недостающие. */

import type { Track } from '@/data/types'
import { useDownloads, downloadTrack } from './downloads'

const REMOTE_KEY = 'kishlak:remote-downloads:v1'
const AUTOFILL_KEY = 'kishlak:autofill:v1'

export function remoteDownloadIds(): string[] {
  try {
    const raw = localStorage.getItem(REMOTE_KEY)
    if (raw === null) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function saveRemoteDownloadIds(ids: string[]): void {
  try {
    localStorage.setItem(REMOTE_KEY, JSON.stringify(Array.from(new Set(ids))))
  } catch {
    /* приватный режим */
  }
}

export function autofillEnabled(): boolean {
  try {
    return localStorage.getItem(AUTOFILL_KEY) !== '0'
  } catch {
    return true
  }
}

export function setAutofillEnabled(value: boolean): void {
  try {
    localStorage.setItem(AUTOFILL_KEY, value ? '1' : '0')
  } catch {
    /* ничего */
  }
}

/** Скачивает треки, которые есть в списке с других устройств, но отсутствуют локально. */
export async function autofillDownloads(tracks: Track[], limit = 6): Promise<number> {
  if (!autofillEnabled()) return 0
  const remote = new Set(remoteDownloadIds())
  if (remote.size === 0) return 0

  const local = useDownloads.getState().records
  const missing = tracks.filter((t) => remote.has(t.id) && local[t.id] === undefined).slice(0, limit)
  if (missing.length === 0) return 0

  let done = 0
  for (const track of missing) {
    try {
      await downloadTrack(track, track.releaseId)
      done += 1
    } catch {
      /* пропускаем сбойный трек */
    }
  }
  return done
}

/** Локальный список скачанного — то, что уходит на сервер. */
export function localDownloadIds(): string[] {
  return Object.keys(useDownloads.getState().records)
}
