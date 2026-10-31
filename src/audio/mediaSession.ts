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
  seek(t: number): void
}

export function setupMediaSession(handlers: Handlers): () => void {
  if (!('mediaSession' in navigator)) return () => {}
  try {
    navigator.mediaSession.setActionHandler('play', handlers.play)
    navigator.mediaSession.setActionHandler('pause', handlers.pause)
    navigator.mediaSession.setActionHandler('previoustrack', handlers.prev)
    navigator.mediaSession.setActionHandler('nexttrack', handlers.next)
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      handlers.seek(d.seekTime ?? 0)
    })
    // seekbackward/seekforward намеренно не регистрируем:
    // их регистрация вытесняет кнопки previoustrack/nexttrack на локскрине.
  } catch {}

  return () => {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('seekto', null)
    } catch {}
  }
}
