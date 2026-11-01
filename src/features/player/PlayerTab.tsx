import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'
import type { Release, Track } from '@/data/types'
import { Cassette } from './Cassette'
import { haptic } from '@/app/telegram'
import { parseLrc, getActiveLineIndex } from '@/features/lyrics/parseLrc'
import type { Lyrics } from '@/features/lyrics/parseLrc'
import { InsertScreen } from '@/features/lyrics/InsertScreen'
import { shareTrack } from '@/features/telegram/share'
import { SupportSheet } from '@/features/telegram/SupportSheet'
import { getWebEngine } from '@/audio/webEngine'
import { IconPrev, IconNext, IconPlay, IconPause, IconStar } from '@/ui/icons'
import { getState } from '@/features/fan/state'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtRemaining(cur: number, dur: number): string {
  const rem = Math.max(0, dur - cur)
  return `-${fmt(rem)}`
}

type FlatTrack = { track: Track; release: Release; indexInRelease: number }

function buildFlat(releases: Release[]): FlatTrack[] {
  const result: FlatTrack[] = []
  for (const release of releases) {
    for (let i = 0; i < release.tracks.length; i++) {
      result.push({ track: release.tracks[i]!, release, indexInRelease: i })
    }
  }
  return result
}

function firstUnlistenedIndex(release: Release): number {
  const fanState = getState()
  for (let i = 0; i < release.tracks.length; i++) {
    const t = release.tracks[i]!
    const stat = fanState.tracks[t.id]
    if (!stat || stat.listens === 0) return i
  }
  return 0
}

export function PlayerTab() {
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
  const [dragging, setDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)
  const [insertOpen, setInsertOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [lyrics, setLyrics] = useState<Lyrics | null>(null)
  const [polarity, setPolarity] = useState<'paper' | 'dark'>('paper')
  const [flatTracks, setFlatTracks] = useState<FlatTrack[]>([])

  const cassetteTouchStartY = useRef<number | null>(null)
  const playingRowRef = useRef<HTMLDivElement>(null)

  // полярность
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

  // начальная загрузка: первый непрослушанный трек первого релиза
  useEffect(() => {
    CatalogRepo.load().then((cat) => {
      setFlatTracks(buildFlat(cat.releases))

      // загрузить трек без автоплея если ничего не загружено
      const engine = getWebEngine()
      if (engine.getState().track) return
      const firstRelease = cat.releases[0]
      if (!firstRelease || firstRelease.tracks.length === 0) return
      const startIdx = firstUnlistenedIndex(firstRelease)
      engine.load(firstRelease.tracks, startIdx)
    }).catch(() => {})
  }, [])

  // релиз текущего трека
  useEffect(() => {
    if (!track) return
    CatalogRepo.load().then((cat) => {
      setRelease(cat.releases.find((r) => r.id === track.releaseId) ?? null)
    }).catch(() => {})
  }, [track?.releaseId])

  // LRC текущего трека
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

  // скролл к играющей строке
  useEffect(() => {
    playingRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [index])

  const progress = duration > 0 ? currentTime / duration : 0
  const textLines = lyrics ? lyrics.lines.filter((l) => !l.isSection) : []
  const activeIdx = lyrics ? getActiveLineIndex(textLines, currentTime) : -1
  const prevLine  = activeIdx > 0 ? textLines[activeIdx - 1] ?? null : null
  const activeLine = activeIdx >= 0 ? textLines[activeIdx] ?? null : null
  const nonBlank  = textLines.filter((l) => !l.isBlank)
  const displayActive = activeLine ?? nonBlank[0] ?? null
  const nextLine = activeIdx === -1
    ? (nonBlank[1] ?? null)
    : (activeIdx < textLines.length - 1 ? textLines[activeIdx + 1] ?? null : null)
  const hasLyrics = lyrics !== null && textLines.length > 0

  const handleTap = () => { haptic('medium'); toggle() }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
    haptic('light')
  }

  const handleProgressDragMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    setDragTime(Math.max(0, Math.min(1, ((e.touches[0]?.clientX ?? 0) - rect.left) / rect.width)) * duration)
    setDragging(true)
  }

  const handleProgressDragEnd = () => {
    if (dragging) { seek(dragTime); haptic('light') }
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

  const handleTrackTap = (ft: FlatTrack) => {
    const engine = getWebEngine()
    engine.load(ft.release.tracks, ft.indexInRelease)
    engine.play()
    haptic('light')
  }

  const globalIndex = track ? flatTracks.findIndex((ft) => ft.track.id === track.id) : -1
  const totalCount = flatTracks.length

  return (
    <div
      className="flex flex-col bg-bg overflow-hidden"
      style={{ height: '100%', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* шапка */}
      <div
        className="flex items-center justify-between px-screen shrink-0"
        style={{ height: 40 }}
      >
        <span className="font-mono text-mono-label uppercase text-ink">КИШЛАК</span>
        <span className="font-mono text-mono-num tabular-nums text-dim">
          {track && totalCount > 0 ? `${String(globalIndex + 1).padStart(2, '0')} / ${String(totalCount).padStart(2, '0')}` : '—'}
        </span>
      </div>

      {/* кассета */}
      <div
        className="px-screen shrink-0 mt-2"
        onTouchStart={handleCassetteTouchStart}
        onTouchEnd={handleCassetteTouchEnd}
      >
        <Cassette
          side="A"
          onTap={handleTap}
          trackTitle={track?.title}
          releaseYear={release?.year}
          polarity={polarity}
        />
      </div>

      {/* название */}
      <div className="px-screen mt-3 shrink-0">
        <p className="font-display text-display-l uppercase text-ink line-clamp-1">
          {track?.title ?? '—'}
        </p>
        <p className="font-mono text-mono-label uppercase text-dim mt-0.5">
          КИШЛАК · {release?.title ?? '—'} · {release?.year ?? '—'}
        </p>
      </div>

      {/* превью текста */}
      {hasLyrics && (
        <div className="px-screen mt-2 shrink-0">
          <button onClick={() => setInsertOpen(true)} className="w-full text-left" aria-label="Открыть текст">
            {prevLine && !prevLine.isBlank
              ? <p className="font-mono text-lyric text-dim line-clamp-1">{prevLine.text}</p>
              : <p className="font-mono text-lyric text-dim line-clamp-1 opacity-0">·</p>
            }
            <p className="font-display text-lyric-active text-[var(--accent-text)] line-clamp-1">
              {displayActive && !displayActive.isBlank ? displayActive.text : ''}
            </p>
            {nextLine && !nextLine.isBlank
              ? <p className="font-mono text-lyric text-dim line-clamp-1">{nextLine.text}</p>
              : <p className="font-mono text-lyric text-dim line-clamp-1 opacity-0">·</p>
            }
          </button>
        </div>
      )}

      {/* прогресс */}
      <div className="px-screen mt-3 shrink-0">
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
      <div className="px-screen py-2 flex items-center justify-between shrink-0">
        <button onClick={() => { prevFn(); haptic('light') }} className="w-11 h-11 flex items-center justify-center text-ink" aria-label="Предыдущий трек">
          <IconPrev />
        </button>
        <button
          onClick={handleTap}
          className="rounded-full flex items-center justify-center text-bg"
          style={{ width: 52, height: 52, background: 'var(--ink)' }}
          aria-label={playing ? 'Пауза' : 'Воспроизвести'}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button onClick={() => { nextFn('user'); haptic('light') }} className="w-11 h-11 flex items-center justify-center text-ink" aria-label="Следующий трек">
          <IconNext />
        </button>
      </div>

      {/* действия */}
      <div className="px-screen pb-2 flex items-center gap-3 shrink-0">
        <button
          onClick={() => { if (track) shareTrack(track.id) }}
          disabled={!track}
          className="flex-1 font-mono text-mono-label uppercase border border-line h-[34px] rounded-pill text-ink disabled:opacity-40"
        >
          ПОДЕЛИТЬСЯ
        </button>
        <button
          onClick={() => setSupportOpen(true)}
          className="flex-1 font-mono text-mono-label uppercase border border-line h-[34px] rounded-pill text-ink flex items-center justify-center gap-1.5"
        >
          ПОДДЕРЖАТЬ <IconStar size={18} />
        </button>
      </div>

      {/* список треков */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-screen py-2 border-t border-line">
          <p className="font-mono text-mono-label uppercase text-dim">
            ВСЕ ТРЕКИ · {totalCount}
          </p>
        </div>
        {flatTracks.map((ft, globalIdx) => {
          const isPlaying = track?.id === ft.track.id
          return (
            <div
              key={ft.track.id}
              ref={isPlaying ? playingRowRef : undefined}
              onClick={() => handleTrackTap(ft)}
              className="flex items-center gap-3 px-screen py-2 border-b border-line last:border-0 active:bg-surface"
              style={{ minHeight: 44, cursor: 'pointer' }}
            >
              <span
                className="font-mono text-mono-num tabular-nums shrink-0 w-6"
                style={{ color: isPlaying ? 'var(--accent)' : 'var(--dim)' }}
              >
                {String(globalIdx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="font-display text-body-strong line-clamp-1"
                  style={{ color: isPlaying ? 'var(--accent-text)' : 'var(--ink)' }}
                >
                  {ft.track.title}
                </p>
                <p className="font-mono text-mono-label uppercase text-dim line-clamp-1">
                  {ft.release.title}
                </p>
              </div>
              <span className="font-mono text-mono-num tabular-nums text-dim shrink-0">
                {fmt(ft.track.duration)}
              </span>
            </div>
          )
        })}
        {/* отступ под TabBar */}
        <div style={{ height: 8 }} />
      </div>

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
      {supportOpen && <SupportSheet onClose={() => setSupportOpen(false)} />}
    </div>
  )
}
