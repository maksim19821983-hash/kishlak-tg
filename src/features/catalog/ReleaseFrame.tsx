import { useEffect, useRef, useState } from 'react'
import type { Release } from '@/data/types'
import { useAudioStore } from '@/audio/store'
import type { Track } from '@/data/types'
import { showBackButton, hideBackButton, disableVerticalSwipes, haptic } from '@/app/telegram'
import { useFavorites } from '@/features/favorites/store'
import { HeartButton } from '@/ui/HeartButton'

const SCRIM = 'linear-gradient(to bottom, rgba(0,0,0,.5), transparent 22%, rgba(0,0,0,.4) 55%, rgba(0,0,0,.94) 90%)'

type Props = {
  release: Release
  listenedCount: number
  onClose: () => void
  onPlay: () => void
  onPlayTrack?: (track: Track) => void
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ReleaseFrame({ release, listenedCount, onClose, onPlay, onPlayTrack }: Props) {
  const touchStartY = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [closing, setClosing] = useState(false)
  const isFavorite = useFavorites((st) => st.releases.includes(release.id))
  const toggleRelease = useFavorites((st) => st.toggleRelease)
  const favoriteTracks = useFavorites((st) => st.tracks)
  const toggleTrack = useFavorites((st) => st.toggleTrack)
  const currentId = useAudioStore((st) => st.track?.id)
  const totalDuration = release.tracks.reduce((a, t) => a + t.duration, 0)
  const progress = release.tracks.length > 0 ? listenedCount / release.tracks.length : 0

  // BackButton Telegram
  useEffect(() => {
    disableVerticalSwipes()
    showBackButton(close)
    return () => hideBackButton()
  }, [])

  const close = () => {
    setClosing(true)
    setTimeout(() => { onClose() }, 300)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const dy = (e.touches[0]?.clientY ?? 0) - touchStartY.current
    if (dy > 0) setOffset(dy)
  }
  const onTouchEnd = () => {
    if (offset > 120) { close() } else { setOffset(0) }
    touchStartY.current = null
  }

  return (
    <div
      className="fixed inset-0 z-50 anim-frame"
      style={{
        transform: `translateY(${offset}px)`,
        transition: offset === 0 && !closing ? 'transform 300ms ease' : closing ? 'transform 300ms ease' : 'none',
        opacity: closing ? 0 : 1,
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest('[data-scroll-tracks]')) return
        onTouchStart(e)
      }}
      onTouchMove={(e) => {
        if ((e.target as HTMLElement).closest('[data-scroll-tracks]')) return
        onTouchMove(e)
      }}
      onTouchEnd={(e) => {
        if ((e.target as HTMLElement).closest('[data-scroll-tracks]')) return
        onTouchEnd()
      }}
    >
      {/* обложка на весь экран */}
      <img
        src={release.cover}
        alt={release.title}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* скрим снизу */}
      <div className="absolute inset-0" style={{ background: SCRIM }} />
      {/* скрим сверху — под список треков, иначе светлые обложки съедают контраст */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: '52%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,.82), rgba(0,0,0,.55) 45%, transparent)',
        }}
      />

      {/* контент: сверху треки, снизу название и кнопки */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          paddingTop: 'calc(64px + env(safe-area-inset-top))',
          paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
          paddingLeft: 24, paddingRight: 24,
        }}
      >
        {/* треки релиза — занимают всё свободное место сверху */}
        <div
          data-scroll-tracks
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 mb-4 anim-fade-up"
        >
          {release.tracks.map((track, i) => {
            const isCurrent = currentId === track.id
            const isFav = favoriteTracks.includes(track.id)
            return (
              <div
                key={track.id}
                className="flex items-center gap-2 border-b border-[rgba(241,237,230,.12)] last:border-0"
                style={{ minHeight: 48 }}
              >
                <button
                  onClick={() => (onPlayTrack ? onPlayTrack(track) : onPlay())}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                >
                  <span
                    className="font-mono text-mono-num tabular-nums shrink-0"
                    style={{ width: 22, color: isCurrent ? 'var(--accent)' : 'rgba(241,237,230,.5)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="font-display text-body-strong line-clamp-1 flex-1"
                    style={{ color: isCurrent ? 'var(--accent)' : '#F1EDE6' }}
                  >
                    {track.title}
                  </span>
                  <span className="font-mono text-mono-num tabular-nums shrink-0" style={{ color: 'rgba(241,237,230,.5)' }}>
                    {fmtDuration(track.duration)}
                  </span>
                </button>
                <HeartButton
                  active={isFav}
                  onToggle={() => { toggleTrack(track.id); haptic('light') }}
                  size={16}
                  label={isFav ? 'Убрать из любимого' : 'В любимое'}
                  inactiveColor="rgba(241,237,230,.45)"
                />
              </div>
            )
          })}
        </div>

        {/* нижний блок: название, метаданные, прогресс, кнопки */}
        <div className="shrink-0">
          <p className="font-mono text-mono-label uppercase text-[#F1EDE6] mb-1">
            РЕЛИЗ · {release.year}
          </p>
          <p
            className="font-display text-[#F1EDE6] mb-2 line-clamp-1 leading-[0.95]"
            style={{
              fontSize: `min(52px, ${Math.max(26, Math.round(300 / Math.max(4, release.title.length) * 1.5))}px)`,
            }}
          >
            {release.title}
          </p>
          <p className="font-mono text-mono-num text-[rgba(241,237,230,.7)] mb-3">
            {release.tracks.length} ТРЕКОВ · {listenedCount} ПРОСЛУШАНО · {fmtDuration(totalDuration)}
          </p>

          <div className="h-0.5 w-full bg-[rgba(241,237,230,.2)] rounded-full mb-4">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress * 100}%`, background: 'var(--accent)' }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onPlay}
              className="flex-1 h-[54px] rounded-pill bg-[#F1EDE6] font-mono text-mono-label uppercase text-[#131211] tracking-widest min-h-[44px] press"
            >
              СЛУШАТЬ
            </button>
            <div
              className="rounded-full"
              style={{ border: '1px solid rgba(241,237,230,.35)', width: 54, height: 54, display: 'grid', placeItems: 'center' }}
            >
              <HeartButton
                active={isFavorite}
                onToggle={() => { toggleRelease(release.id); haptic('light') }}
                size={22}
                label={isFavorite ? 'Убрать из любимого' : 'В любимое'}
                inactiveColor="rgba(241,237,230,.75)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* кнопка закрыть */}
      <button
        onClick={close}
        className="absolute top-0 left-0 right-0 h-16 flex items-start justify-start"
        style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingLeft: 24 }}
        aria-label="Закрыть кадр релиза"
      >
        <span className="font-mono text-mono-label uppercase text-[rgba(241,237,230,.7)]">← назад</span>
      </button>
    </div>
  )
}

export function useCurrentTrackMeta() {
  const track = useAudioStore((s) => s.track)
  const status = useAudioStore((s) => s.status)
  const currentTime = useAudioStore((s) => s.currentTime)
  return { track, status, currentTime }
}
