import type { Track } from '@/data/types'

export function updateMediaMetadata(track: Track, coverUrl: string): void {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'Кишлак',
      artwork: [{ src: coverUrl, sizes: '512x512', type: 'image/jpeg' }],
    })
  } catch {}
}

export function updatePositionState(el: HTMLAudioElement): void {
  if (!('mediaSession' in navigator)) return
  // ?ms=nopos — диагностика: отключить setPositionState, чтобы проверить,
  // не оно ли вытесняет кнопки переключения треков на локскрине.
  if (window.location.hash.includes('ms=nopos')) return
  const dur = el.duration
  if (!isFinite(dur) || dur <= 0) return
  try {
    navigator.mediaSession.setPositionState({
      duration: dur,
      position: Math.min(el.currentTime, dur),
      playbackRate: el.playbackRate,
    })
  } catch {}
}

// ── диагностика: какие действия реально приходят с локскрина ───────────────

export type MediaActionLogEntry = { action: string; at: number }
const actionLog: MediaActionLogEntry[] = []

function logAction(action: string): void {
  actionLog.push({ action, at: Date.now() })
  if (actionLog.length > 20) actionLog.shift()
}

export function getMediaActionLog(): MediaActionLogEntry[] {
  return [...actionLog]
}

export function getMediaSessionInfo(): {
  supported: boolean
  playbackState: string | null
  title: string | null
  artworkUrl: string | null
} {
  if (!('mediaSession' in navigator)) {
    return { supported: false, playbackState: null, title: null, artworkUrl: null }
  }
  const meta = navigator.mediaSession.metadata
  return {
    supported: true,
    playbackState: navigator.mediaSession.playbackState ?? null,
    title: meta?.title ?? null,
    artworkUrl: meta?.artwork?.[0]?.src ?? null,
  }
}

type Handlers = {
  play(): void
  pause(): void
  prev(): void
  next(): void
}

export function setupMediaSession(handlers: Handlers): () => void {
  if (!('mediaSession' in navigator)) return () => {}
  // Регистрируем по одному: если WebKit бросает на каком-то действии,
  // остальные всё равно встанут. Иначе iOS показывает свои ±10 вместо ⏮⏭.
  const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null): void => {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
      logAction(`set:${action}`)
    } catch (err) {
      logAction(`fail:${action}:${err instanceof Error ? err.name : 'error'}`)
    }
  }
  setHandler('previoustrack', () => { logAction('previoustrack'); handlers.prev() })
  setHandler('nexttrack', () => { logAction('nexttrack'); handlers.next() })
  setHandler('play', () => { logAction('play'); handlers.play() })
  setHandler('pause', () => { logAction('pause'); handlers.pause() })

  // только журналируем: покажет, присылает ли iOS перемотку вместо переключения
  setHandler('seekbackward', (d) => { logAction(`seekbackward:${d.seekOffset ?? ''}`) })
  setHandler('seekforward', (d) => { logAction(`seekforward:${d.seekOffset ?? ''}`) })

  return () => {
    if (!('mediaSession' in navigator)) return
    const clear = (action: MediaSessionAction): void => {
      try { navigator.mediaSession.setActionHandler(action, null) } catch { /* не поддерживается */ }
    }
    clear('previoustrack')
    clear('nexttrack')
    clear('play')
    clear('pause')
  }
}
