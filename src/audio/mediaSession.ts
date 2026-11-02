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
    try { navigator.mediaSession.setActionHandler(action, handler) } catch { /* не поддерживается */ }
  }
  setHandler('previoustrack', handlers.prev)
  setHandler('nexttrack', handlers.next)
  setHandler('play', handlers.play)
  setHandler('pause', handlers.pause)

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
