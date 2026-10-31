import type { Track } from '@/data/types'

// Контракт из docs/prompts/02-audio-engine.md. UI знает только его; реализация — webEngine (задача 02).

export type PlaybackState = {
  status: 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error'
  track: Track | null
  queue: Track[]
  index: number
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  error: string | null
}

export interface AudioPort {
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
  subscribe(fn: (s: PlaybackState) => void): () => void
  getState(): PlaybackState
  dispose(): void
}

export const initialPlaybackState: PlaybackState = {
  status: 'idle',
  track: null,
  queue: [],
  index: -1,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  shuffle: false,
  repeat: 'off',
  error: null,
}

/** Заглушка: хранит состояние, звука нет. Заменяется в задаче 02. */
export function createStubPort(): AudioPort {
  let state = initialPlaybackState
  const subs = new Set<(s: PlaybackState) => void>()
  const set = (patch: Partial<PlaybackState>) => {
    state = { ...state, ...patch }
    subs.forEach((fn) => fn(state))
  }
  return {
    load: (tracks, startIndex) =>
      set({ queue: tracks, index: startIndex, track: tracks[startIndex] ?? null, status: 'paused', currentTime: 0 }),
    play: () => set({ status: state.track ? 'playing' : 'idle' }),
    pause: () => set({ status: state.track ? 'paused' : 'idle' }),
    toggle: () => set({ status: state.status === 'playing' ? 'paused' : state.track ? 'playing' : 'idle' }),
    seek: (sec) => set({ currentTime: Math.max(0, sec) }),
    next: () => undefined,
    prev: () => undefined,
    setShuffle: (on) => set({ shuffle: on }),
    setRepeat: (mode) => set({ repeat: mode }),
    setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),
    subscribe: (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    getState: () => state,
    dispose: () => subs.clear(),
  }
}
