import type { Track } from '@/data/types'
import type { AudioPort, PlaybackState } from './port'
import { initialPlaybackState } from './port'
import { shuffleOrder, nextIndex, prevIndex, clampIndex } from './queue'
import { updateMediaMetadata, updatePositionState, setupMediaSession } from './mediaSession'

// Обложка альбома — пока хардкод, в Шаге 4 придёт через load()
const FALLBACK_COVER = '/content/covers/vdps-2026.jpg'

function createAudioElement(): HTMLAudioElement {
  const el = document.createElement('audio')
  el.preload = 'metadata'
  // playsInline через атрибут (setAttribute нужен для Safari)
  el.setAttribute('playsinline', '')
  return el
}

let instance: WebAudioEngine | null = null

export function getWebEngine(): WebAudioEngine {
  if (!instance) instance = new WebAudioEngine()
  return instance
}

class WebAudioEngine implements AudioPort {
  private el: HTMLAudioElement = createAudioElement()
  private state: PlaybackState = { ...initialPlaybackState }
  private subs = new Set<(s: PlaybackState) => void>()
  private endedSubs = new Set<(track: Track, duration: number) => void>()

  // shuffled order (индексы в queue)
  private order: number[] = []

  // позиция в order
  private pos = -1

  // троттлинг подписчиков: не чаще 4 раз/сек
  private lastNotify = 0

  // RAF-цикл для currentTime
  private rafId = 0

  // cleanup mediaSession
  private cleanupMs: (() => void) | null = null

  constructor() {
    this.bindAudioEvents()
    this.cleanupMs = setupMediaSession({
      play: () => this.play(),
      pause: () => this.pause(),
      prev: () => this.prev(),
      next: () => this.next('user'),
    })
    // RAF запускается только во время воспроизведения (см. bindAudioEvents)
  }

  // ─── AudioPort ────────────────────────────────────────────────────────────

  load(tracks: Track[], startIndex: number): void {
    const idx = clampIndex(startIndex, tracks.length)
    this.order = this.state.shuffle
      ? shuffleOrder(tracks.length, idx)
      : Array.from({ length: tracks.length }, (_, i) => i)
    this.pos = this.state.shuffle ? 0 : idx

    const track = tracks[idx] ?? null
    this.patch({ queue: tracks, index: idx, track, status: 'loading', currentTime: 0, duration: 0, error: null })
    if (track) {
      this.el.src = track.audio
      this.el.load()
      this.applyMetadata(track)
    }
  }

  play(): void {
    if (!this.state.track) return
    void this.el.play().catch((err: unknown) => {
      const name = err instanceof DOMException ? err.name : ''
      // AbortError — load() прервал предыдущий play(); не ошибка, игнорируем
      if (name === 'AbortError') return
      if (name !== 'NotAllowedError') {
        this.patch({ status: 'error', error: 'Трек недоступен' })
      } else {
        this.patch({ status: 'paused' })
      }
    })
  }

  pause(): void {
    this.el.pause()
  }

  toggle(): void {
    if (this.el.paused) this.play()
    else this.pause()
  }

  seek(sec: number): void {
    if (!this.state.track) return
    this.el.currentTime = Math.max(0, Math.min(this.el.duration || 0, sec))
    updatePositionState(this.el)
    this.patch({ currentTime: this.el.currentTime })
    // один тик на паузе — обновить позицию в UI без постоянного RAF
    if (this.el.paused) {
      const ct = this.el.currentTime
      this.state = { ...this.state, currentTime: ct }
      this.notify()
    }
  }

  next(reason: 'ended' | 'user' = 'user'): void {
    const { queue, repeat } = this.state
    if (queue.length === 0) return

    if (repeat === 'one' && reason === 'ended') {
      this.el.currentTime = 0
      void this.el.play().catch(() => {})
      return
    }

    const newPos = nextIndex(this.pos, queue.length, repeat, reason)
    if (newPos === null) {
      this.el.pause()
      this.el.currentTime = 0
      this.patch({ status: 'paused', currentTime: 0 })
      return
    }
    this.pos = newPos
    this.goToPos(true)
  }

  prev(): void {
    const { queue } = this.state
    if (queue.length === 0) return
    // если прошло > 3 сек — перемотать в начало текущего
    if (this.el.currentTime > 3) {
      this.seek(0)
      return
    }
    this.pos = prevIndex(this.pos)
    this.goToPos(!this.el.paused)
  }

  setShuffle(on: boolean): void {
    const { queue, index } = this.state
    if (on) {
      this.order = shuffleOrder(queue.length, index)
      this.pos = 0
    } else {
      this.order = Array.from({ length: queue.length }, (_, i) => i)
      this.pos = index
    }
    this.patch({ shuffle: on })
  }

  setRepeat(mode: PlaybackState['repeat']): void {
    this.patch({ repeat: mode })
  }

  setVolume(v: number): void {
    const vol = Math.min(1, Math.max(0, v))
    this.el.volume = vol
    this.patch({ volume: vol })
  }

  subscribeEnded(fn: (track: Track, duration: number) => void): () => void {
    this.endedSubs.add(fn)
    return () => this.endedSubs.delete(fn)
  }

  subscribe(fn: (s: PlaybackState) => void): () => void {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }

  getState(): PlaybackState {
    return this.state
  }

  dispose(): void {
    this.stopRaf()
    this.el.pause()
    this.el.src = ''
    this.cleanupMs?.()
    this.subs.clear()
    instance = null
  }

  // ─── внутренние ───────────────────────────────────────────────────────────

  private goToPos(autoplay: boolean): void {
    const { queue } = this.state
    const trackIdx = this.order[this.pos] ?? 0
    const track = queue[trackIdx] ?? null
    if (!track) return

    const wasPlaying = autoplay
    this.el.src = track.audio
    this.el.load()
    this.applyMetadata(track)
    this.patch({ track, index: trackIdx, status: 'loading', currentTime: 0, duration: 0, error: null })
    if (wasPlaying) this.play()
  }

  private applyMetadata(track: Track): void {
    updateMediaMetadata(track, FALLBACK_COVER)
  }

  private bindAudioEvents(): void {
    const el = this.el

    el.addEventListener('play', () => {
      this.startRaf()
      this.patch({ status: 'playing' })
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing' } catch {}
      }
    })

    el.addEventListener('pause', () => {
      this.stopRaf()
      if (this.state.status !== 'error') this.patch({ status: 'paused' })
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'paused' } catch {}
      }
    })

    el.addEventListener('waiting', () => {
      this.patch({ status: 'buffering' })
    })

    el.addEventListener('canplay', () => {
      if (this.state.status === 'loading' || this.state.status === 'buffering') {
        this.patch({ status: el.paused ? 'paused' : 'playing' })
      }
    })

    el.addEventListener('durationchange', () => {
      const dur = isFinite(el.duration) ? el.duration : 0
      this.patch({ duration: dur })
      updatePositionState(el)
    })

    el.addEventListener('ended', () => {
      const track = this.state.track
      const duration = this.state.duration
      this.stopRaf()
      if (track) this.endedSubs.forEach((fn) => fn(track, duration))
      this.next('ended')
    })

    el.addEventListener('error', () => {
      this.patch({ status: 'error', error: 'Трек недоступен' })
    })
  }

  private startRaf(): void {
    // всегда останавливаем старый цикл перед запуском нового — защита от рейса
    // когда play нового трека приходит раньше pause старого
    this.stopRaf()
    const tick = () => {
      this.rafId = requestAnimationFrame(tick)
      const ct = this.el.currentTime
      // currentTime в state — точный, из RAF; подписчики — 4 раза/сек
      if (ct === this.state.currentTime) return
      const now = performance.now()
      const throttle = now - this.lastNotify >= 250
      this.state = { ...this.state, currentTime: ct }
      if (throttle) {
        this.lastNotify = now
        this.notify()
      }
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopRaf(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private patch(partial: Partial<PlaybackState>): void {
    // Важные изменения (трек, статус, очередь) отдаём сразу: троттлинг нужен только
    // для currentTime в RAF, иначе первые события после старта молча теряются.
    this.state = { ...this.state, ...partial }
    this.lastNotify = performance.now()
    this.notify()
  }

  private notify(): void {
    const s = this.state
    this.subs.forEach((fn) => fn(s))
  }
}
