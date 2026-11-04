/**
 * Скачивание треков для офлайна.
 * Аудио лежит в Cache API, отметки — в localStorage. Без лимита: предупреждаем о заполнении.
 */

import { create } from 'zustand'
import type { Release, Track } from '@/data/types'

const STORAGE_KEY = 'kishlak:downloads:v1'
const CACHE_NAME = 'kishlak-audio-v1'

export type DownloadRecord = {
  trackId: string
  releaseId: string
  bytes: number
  at: number
}

type Downloaded = Record<string, DownloadRecord>

function loadRecords(): Downloaded {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Downloaded
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function persist(records: Downloaded): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    /* хранилище недоступно — живём без отметок */
  }
}

type Store = {
  records: Downloaded
  busy: Record<string, boolean>
  setRecord: (record: DownloadRecord) => void
  removeRecord: (trackId: string) => void
  setBusy: (trackId: string, value: boolean) => void
}

export const useDownloads = create<Store>((set) => ({
  records: typeof localStorage === 'undefined' ? {} : loadRecords(),
  busy: {},
  setRecord: (record) =>
    set((state) => {
      const records = { ...state.records, [record.trackId]: record }
      persist(records)
      return { records }
    }),
  removeRecord: (trackId) =>
    set((state) => {
      const records = { ...state.records }
      delete records[trackId]
      persist(records)
      return { records }
    }),
  setBusy: (trackId, value) =>
    set((state) => ({ busy: { ...state.busy, [trackId]: value } })),
}))

export function isDownloaded(trackId: string): boolean {
  return useDownloads.getState().records[trackId] !== undefined
}

export function downloadedBytes(): number {
  return Object.values(useDownloads.getState().records).reduce((sum, r) => sum + r.bytes, 0)
}

export function downloadedCount(): number {
  return Object.keys(useDownloads.getState().records).length
}

export function releaseDownloadedCount(release: Release): number {
  const records = useDownloads.getState().records
  return release.tracks.filter((t) => records[t.id] !== undefined).length
}

async function openCache(): Promise<Cache> {
  return caches.open(CACHE_NAME)
}

/** Кладёт файл трека в кэш. Возвращает размер в байтах. */
export async function downloadTrack(track: Track, releaseId: string): Promise<number> {
  const store = useDownloads.getState()
  if (store.records[track.id] !== undefined) return store.records[track.id]?.bytes ?? 0

  store.setBusy(track.id, true)
  try {
    const response = await fetch(track.audio, { cache: 'force-cache' })
    if (!response.ok) throw new Error(`не удалось скачать: ${response.status}`)
    const blob = await response.blob()
    const cache = await openCache()
    await cache.put(track.audio, new Response(blob, { headers: { 'content-type': blob.type || 'audio/mpeg' } }))

    // текст и обложка — чтобы офлайн был не только звук
    if (track.lrc !== undefined) {
      const lrc = await fetch(track.lrc).catch(() => null)
      if (lrc?.ok) await cache.put(track.lrc, lrc.clone())
    }
    if (track.cover !== undefined) {
      const cover = await fetch(track.cover).catch(() => null)
      if (cover?.ok) await cache.put(track.cover, cover.clone())
    }

    const record: DownloadRecord = { trackId: track.id, releaseId, bytes: blob.size, at: Date.now() }
    useDownloads.getState().setRecord(record)
    return blob.size
  } finally {
    useDownloads.getState().setBusy(track.id, false)
  }
}

export async function removeDownload(track: Track): Promise<void> {
  const cache = await openCache()
  await cache.delete(track.audio).catch(() => false)
  if (track.lrc !== undefined) await cache.delete(track.lrc).catch(() => false)
  useDownloads.getState().removeRecord(track.id)
}

export async function removeReleaseDownloads(release: Release): Promise<void> {
  const records = useDownloads.getState().records
  for (const track of release.tracks) {
    if (records[track.id] !== undefined) await removeDownload(track)
  }
}

/** Локальный адрес скачанного трека — играет без сети. */
export async function localSrc(track: Track): Promise<string | null> {
  if (!isDownloaded(track.id)) return null
  try {
    const cache = await openCache()
    const hit = await cache.match(track.audio)
    if (!hit) return null
    const blob = await hit.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/** Оценка свободного места: предупреждаем, когда занято много. */
export async function storageInfo(): Promise<{ used: number; quota: number }> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    return { used: estimate?.usage ?? 0, quota: estimate?.quota ?? 0 }
  } catch {
    return { used: 0, quota: 0 }
  }
}
