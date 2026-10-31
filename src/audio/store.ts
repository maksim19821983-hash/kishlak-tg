import { create } from 'zustand'
import { getWebEngine } from './webEngine'
import type { PlaybackState } from './port'
import type { Track } from '@/data/types'

type AudioStore = PlaybackState & {
  load(tracks: Track[], startIndex: number): void
  play(): void
  pause(): void
  toggle(): void
  seek(sec: number): void
  next(reason?: 'ended' | 'user'): void
  prev(): void
  setShuffle(on: boolean): void
  setRepeat(mode: PlaybackState['repeat']): void
  setVolume(v: number): void
}

export const useAudioStore = create<AudioStore>((set) => {
  const engine = getWebEngine()

  // подписка: движок шлёт состояние → обновляем стор
  engine.subscribe((s) => set(s))

  const s = engine.getState()

  return {
    ...s,
    load: (tracks, startIndex) => engine.load(tracks, startIndex),
    play: () => engine.play(),
    pause: () => engine.pause(),
    toggle: () => engine.toggle(),
    seek: (sec) => engine.seek(sec),
    next: (reason) => engine.next(reason),
    prev: () => engine.prev(),
    setShuffle: (on) => engine.setShuffle(on),
    setRepeat: (mode) => engine.setRepeat(mode),
    setVolume: (v) => engine.setVolume(v),
  }
})
