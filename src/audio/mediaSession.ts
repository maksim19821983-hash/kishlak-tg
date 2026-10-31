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
  try {
    // Явно сбрасываем перемотку: некоторые клиенты iOS активируют её по умолчанию,
    // и тогда кнопки previoustrack/nexttrack заменяются на ±10 с.
    navigator.mediaSession.setActionHandler('seekbackward', null)
    navigator.mediaSession.setActionHandler('seekforward', null)
    navigator.mediaSession.setActionHandler('play', handlers.play)
    navigator.mediaSession.setActionHandler('pause', handlers.pause)
    navigator.mediaSession.setActionHandler('previoustrack', handlers.prev)
    navigator.mediaSession.setActionHandler('nexttrack', handlers.next)
  } catch {}

  return () => {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setActionHandler('seekbackward', null)
      navigator.mediaSession.setActionHandler('seekforward', null)
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
    } catch {}
  }
}
