import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'
import type { Release } from '@/data/types'
import { Cassette } from './Cassette'
import { haptic } from '@/app/telegram'
import { parseLrc, getActiveLineIndex } from '@/features/lyrics/parseLrc'
import type { Lyrics } from '@/features/lyrics/parseLrc'
import { InsertScreen } from '@/features/lyrics/InsertScreen'
import { shareTrack } from '@/features/telegram/share'
import { SupportSheet } from '@/features/telegram/SupportSheet'

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
  const [flipDeg, setFlipDeg] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [lyrics, setLyrics] = useState<Lyrics | null>(null)
  const [polarity, setPolarity] = useState<'paper' | 'dark'>('paper')

  // cassette swipe-up to open insert
  const cassetteTouchStartY = useRef<number | null>(null)

  useEffect(() => {
    const pol = document.documentElement.dataset.polarity as 'paper' | 'dark' | undefined
    setPolarity(pol ?? 'paper')
    const observer = new MutationObserver(() => {
      const p = document.documentElement.dataset.polarity as 'paper' | 'dark' | undefined
      setPolarity(p ?? 'paper')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-polarity'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!track) return
    CatalogRepo.load().then((cat) => {
      const rel = cat.releases.find((r) => r.id === track.releaseId) ?? null
      setRelease(rel)
    }).catch(() => {})
  }, [track?.releaseId])

  // load LRC when track changes
  useEffect(() => {
    setLyrics(null)
    if (!track?.lrc) return
    let cancelled = false
    fetch(track.lrc)
      .then((r) => r.text())
      .then((text) => { if (!cancelled) setLyrics(parseLrc(text)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [track?.lrc])

  const progress = duration > 0 ? currentTime / duration : 0
  const nextTracks = queue.slice(index + 1, index + 3)
  const trackNum = index >= 0 ? String(index + 1).padStart(2, '0') : '01'
  const total = queue.length > 0 ? String(queue.length).padStart(2, '0') : '01'

  // live lyrics: 3 lines around active (only text lines, not sections)
  const textLines = lyrics ? lyrics.lines.filter((l) => !l.isSection) : []
  const activeIdx = lyrics ? getActiveLineIndex(textLines, currentTime) : -1
  const prevLine = activeIdx > 0 ? textLines[activeIdx - 1] ?? null : null
  const activeLine = activeIdx >= 0 ? textLines[activeIdx] ?? null : null
  // до первой строки: первая непустая как активная, вторая как следующая
  const nonBlank = textLines.filter((l) => !l.isBlank)
  const displayActive = activeLine ?? nonBlank[0] ?? null
  const nextLine = activeIdx === -1
    ? (nonBlank[1] ?? null)
    : (activeIdx < textLines.length - 1 ? textLines[activeIdx + 1] ?? null : null)
  const hasLyrics = lyrics !== null && textLines.length > 0

  const handleTap = () => {
    haptic('medium')
    toggle()
  }

  const handleFlip = () => {
    if (flipping) return
    setFlipping(true)
    setFlipDeg((d) => d + 180)
    setTimeout(() => {
      setSide((s) => s === 'A' ? 'B' : 'A')
      setFlipping(false)
    }, 600)
    haptic('medium')
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(ratio * duration)
    haptic('light')
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
      haptic('light')
    }
    setDragging(false)
  }

  const handleCassetteTouchStart = (e: React.TouchEvent) => {
    cassetteTouchStartY.current = e.touches[0]?.clientY ?? null
  }

  const handleCassetteTouchEnd = (e: React.TouchEvent) => {
    const start = cassetteTouchStartY.current
    cassetteTouchStartY.current = null
    const end = e.changedTouches[0]?.clientY
    if (start !== null && end !== undefined && start - end > 60 && hasLyrics) {
      setInsertOpen(true)
    }
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

      {/* кассета с 3D-флипом */}
      <div
        className="px-screen shrink-0 mt-4"
        style={{ perspective: '600px' }}
        onTouchStart={handleCassetteTouchStart}
        onTouchEnd={handleCassetteTouchEnd}
      >
        <div
          style={{
            transform: `rotateY(${flipDeg}deg)`,
            transition: flipping ? 'transform var(--dur-tape)' : 'none',
            transformStyle: 'preserve-3d',
          }}
        >
          <Cassette
            side={side}
            onTap={handleTap}
            releaseTitle={release?.title}
            polarity={polarity}
          />
        </div>
      </div>

      {/* название */}
      <div className="px-screen mt-4 shrink-0">
        <p className="font-display text-display-l uppercase text-ink line-clamp-2">
          {track?.title ?? '—'}
        </p>
        <p className="font-mono text-mono-label uppercase text-dim mt-1">
          КИШЛАК · {release?.title ?? '—'} · {release?.year ?? '—'}
        </p>
      </div>

      {/* превью текста / кнопка вкладыша — только если есть LRC */}
      {hasLyrics && (
        <div className="px-screen mt-3 shrink-0">
          <button
            onClick={() => setInsertOpen(true)}
            className="w-full text-left"
            aria-label="Открыть текст песни"
          >
            {prevLine && !prevLine.isBlank && (
              <p className="font-mono text-lyric text-dim line-clamp-1">{prevLine.text}</p>
            )}
            {!prevLine && <p className="font-mono text-lyric text-dim line-clamp-1 opacity-0">·</p>}
            <p className="font-display text-lyric-active text-[var(--accent-text)] line-clamp-1">
              {displayActive && !displayActive.isBlank ? displayActive.text : ''}
            </p>
            {nextLine && !nextLine.isBlank && (
              <p className="font-mono text-lyric text-dim line-clamp-1">{nextLine.text}</p>
            )}
            {!nextLine && <p className="font-mono text-lyric text-dim line-clamp-1 opacity-0">·</p>}
          </button>
        </div>
      )}

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
      <div className="px-screen pb-2 flex items-center justify-between shrink-0">
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
          disabled={flipping}
        >
          ПЕРЕВЕРНУТЬ
        </button>
      </div>

      {/* вспомогательные действия */}
      <div className="px-screen pb-4 flex items-center gap-3 shrink-0">
        <button
          onClick={() => { if (track) { shareTrack(track.id) } }}
          disabled={!track}
          className="flex-1 font-mono text-mono-label uppercase border border-line h-[34px] rounded-pill text-ink disabled:opacity-40"
          aria-label="Поделиться треком"
        >
          ПОДЕЛИТЬСЯ
        </button>
        <button
          onClick={() => setSupportOpen(true)}
          className="flex-1 font-mono text-mono-label uppercase border border-line h-[34px] rounded-pill text-ink"
          aria-label="Поддержать артиста"
        >
          ПОДДЕРЖАТЬ ⭐
        </button>
      </div>

      {/* вкладыш */}
      {insertOpen && lyrics && (
        <InsertScreen
          lyrics={lyrics}
          currentTime={currentTime}
          queue={queue}
          release={release}
          onSeek={seek}
          onClose={() => setInsertOpen(false)}
        />
      )}

      {supportOpen && (
        <SupportSheet onClose={() => setSupportOpen(false)} />
      )}
    </div>
  )
}
