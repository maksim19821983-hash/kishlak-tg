import { useEffect, useState } from 'react'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'
import type { Release } from '@/data/types'
import { Cassette } from './Cassette'
import { HapticFeedback } from '@/app/telegram'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtRemaining(cur: number, dur: number): string {
  const rem = Math.max(0, dur - cur)
  return `-${fmt(rem)}`
}

type Props = { onClose: () => void }

export function PlayerScreen({ onClose }: Props) {
  const track       = useAudioStore((s) => s.track)
  const queue       = useAudioStore((s) => s.queue)
  const index       = useAudioStore((s) => s.index)
  const status      = useAudioStore((s) => s.status)
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration    = useAudioStore((s) => s.duration)
  const playing     = status === 'playing'

  const toggle  = useAudioStore((s) => s.toggle)
  const nextFn  = useAudioStore((s) => s.next)
  const prevFn  = useAudioStore((s) => s.prev)
  const seek    = useAudioStore((s) => s.seek)

  const [release, setRelease] = useState<Release | null>(null)
  const [side, setSide] = useState<'A' | 'B'>('A')
  const [dragging, setDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)

  useEffect(() => {
    if (!track) return
    CatalogRepo.load().then((cat) => {
      const rel = cat.releases.find((r) => r.id === track.releaseId) ?? null
      setRelease(rel)
    }).catch(() => {})
  }, [track?.releaseId])

  const progress = duration > 0 ? currentTime / duration : 0
  const nextTracks = queue.slice(index + 1, index + 3)
  const trackNum = index >= 0 ? String(index + 1).padStart(2, '0') : '01'
  const total = queue.length > 0 ? String(queue.length).padStart(2, '0') : '01'

  const handleTap = () => {
    try { HapticFeedback.impactOccurred('medium') } catch {}
    toggle()
  }

  const handleFlip = () => {
    setSide((s) => s === 'A' ? 'B' : 'A')
    try { HapticFeedback.impactOccurred('medium') } catch {}
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(ratio * duration)
    try { HapticFeedback.impactOccurred('light') } catch {}
  }

  const handleProgressDragMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, ((e.touches[0]?.clientX ?? 0) - rect.left) / rect.width))
    setDragTime(ratio * duration)
    setDragging(true)
  }

  const handleProgressDragEnd = () => {
    if (dragging) {
      seek(dragTime)
      try { HapticFeedback.impactOccurred('light') } catch {}
    }
    setDragging(false)
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-bg overflow-hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* шапка */}
      <div
        className="flex items-center justify-between px-screen shrink-0"
        style={{ height: 40, marginTop: 'env(safe-area-inset-top)' }}
      >
        <button
          onClick={onClose}
          className="font-mono text-mono-label uppercase text-dim min-h-[44px] pr-4"
          aria-label="Закрыть плеер"
        >
          ↓
        </button>
        <span className="font-mono text-mono-num tabular-nums text-dim">
          {trackNum} / {total}
        </span>
        <span className="font-mono text-mono-label uppercase text-ink">КИШЛАК</span>
      </div>

      {/* кассета */}
      <div className="px-screen shrink-0 mt-4">
        <Cassette side={side} onTap={handleTap} />
      </div>

      {/* название */}
      <div className="px-screen mt-4 shrink-0">
        <p className="font-display text-display-l uppercase text-ink line-clamp-2">
          {track?.title ?? '—'}
        </p>
        <p className="font-mono text-mono-label uppercase text-dim mt-1">
          КИШЛАК · {release?.year ?? '—'} · {release?.type?.toUpperCase() ?? '—'}
        </p>
      </div>

      {/* текст-заглушка (задача 06 — LRC) */}
      <div className="px-screen mt-3 shrink-0">
        <p className="font-mono text-lyric text-dim line-clamp-1">···</p>
        <p className="font-display text-lyric-active text-[var(--accent-text)] line-clamp-1">···</p>
        <p className="font-mono text-lyric text-dim line-clamp-1">···</p>
      </div>

      {/* дальше на кассете */}
      {nextTracks.length > 0 && (
        <div className="px-screen mt-3 shrink-0">
          <p className="font-mono text-mono-label uppercase text-dim mb-1">Дальше на кассете</p>
          {nextTracks.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 py-1 border-b border-line last:border-0">
              <span className="font-mono text-mono-num text-dim tabular-nums w-6">
                {String(index + 2 + i).padStart(2, '0')}
              </span>
              <span className="font-display text-body-strong flex-1 line-clamp-1">{t.title}</span>
              <span className="font-mono text-mono-num text-dim tabular-nums">
                {fmt(t.duration)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* прогресс */}
      <div className="px-screen mb-2 shrink-0">
        {dragging && (
          <div className="flex justify-center mb-1">
            <span className="font-mono text-mono-num tabular-nums text-ink bg-surface px-2 py-0.5 rounded">
              {fmt(dragTime)}
            </span>
          </div>
        )}
        <div
          className="relative h-[3px] rounded-full cursor-pointer"
          style={{ background: 'var(--line)' }}
          onClick={handleProgressClick}
          onTouchMove={handleProgressDragMove}
          onTouchEnd={handleProgressDragEnd}
          role="slider"
          aria-label="Прогресс трека"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${(dragging ? dragTime / duration : progress) * 100}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-mono text-mono-num tabular-nums text-dim">{fmt(currentTime)}</span>
          <span className="font-mono text-mono-num tabular-nums text-dim">{fmtRemaining(currentTime, duration)}</span>
        </div>
      </div>

      {/* транспорт */}
      <div className="px-screen pb-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => prevFn()}
          className="w-11 h-11 flex items-center justify-center text-ink"
          aria-label="Предыдущий трек"
          style={{ fontSize: 20 }}
        >
          ⏮
        </button>

        <button
          onClick={handleTap}
          className="rounded-full flex items-center justify-center text-bg"
          style={{ width: 58, height: 58, background: 'var(--ink)', fontSize: 22 }}
          aria-label={playing ? 'Пауза' : 'Воспроизвести'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <button
          onClick={() => nextFn('user')}
          className="w-11 h-11 flex items-center justify-center text-ink"
          aria-label="Следующий трек"
          style={{ fontSize: 20 }}
        >
          ⏭
        </button>

        <button
          onClick={handleFlip}
          className="font-mono text-mono-label uppercase border border-line px-3 h-[34px] rounded-pill text-ink"
          aria-label="Перевернуть кассету"
        >
          ПЕРЕВЕРНУТЬ
        </button>
      </div>
    </div>
  )
}
