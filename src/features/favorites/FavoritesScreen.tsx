import { useEffect, useState } from 'react'
import { CatalogRepo } from '@/data/CatalogRepo'
import type { Catalog, Track } from '@/data/types'
import { useFavorites } from './store'
import { useAudioStore } from '@/audio/store'
import { getWebEngine } from '@/audio/webEngine'
import { haptic } from '@/app/telegram'
import { Sleeve } from '@/ui/Sleeve'
import { NowPlayingBar } from '@/ui/NowPlayingBar'
import { TrackMenu } from '@/ui/TrackMenu'
import { IconMore, IconPlay } from '@/ui/icons'
import { HeartButton } from '@/ui/HeartButton'
import { releaseProgress } from '@/features/fan/derive'
import { getState } from '@/features/fan/state'

function fmt(sec: number): string {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type Props = { onOpenPlayer: () => void }

export function FavoritesScreen({ onOpenPlayer }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const favoriteTracks = useFavorites((s) => s.tracks)
  const favoriteReleases = useFavorites((s) => s.releases)
  const toggleTrack = useFavorites((s) => s.toggleTrack)
  const toggleRelease = useFavorites((s) => s.toggleRelease)
  const playNext = useAudioStore((s) => s.playNext)
  const currentId = useAudioStore((s) => s.track?.id)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)

  useEffect(() => {
    CatalogRepo.load().then(setCatalog).catch(() => {})
  }, [])

  const allTracks: Track[] = catalog?.releases.flatMap((r) => r.tracks) ?? []
  const trackById = new Map(allTracks.map((t) => [t.id, t]))
  const releaseById = new Map((catalog?.releases ?? []).map((r) => [r.id, r]))

  const tracks = favoriteTracks.map((id) => trackById.get(id)).filter((t): t is Track => Boolean(t))
  const releases = favoriteReleases.map((id) => releaseById.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r))

  const startQueue = (list: Track[], index: number) => {
    if (list.length === 0) return
    const engine = getWebEngine()
    engine.load(list, Math.max(0, Math.min(index, list.length - 1)))
    engine.play()
    haptic('medium')
    onOpenPlayer()
  }

  // включить только любимое: очередь = любимые треки
  const playFavorites = () => startQueue(tracks, 0)

  const playTrack = (track: Track) => {
    const idx = tracks.findIndex((t) => t.id === track.id)
    startQueue(tracks, idx < 0 ? 0 : idx)
  }

  const playRelease = (releaseId: string) => {
    const release = releaseById.get(releaseId)
    if (!release || release.tracks.length === 0) return
    // альбом играет своими треками, а не всем каталогом
    startQueue(release.tracks, 0)
  }

  return (
    <div className="min-h-full flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-screen shrink-0" style={{ height: 40 }}>
        <span className="font-mono text-mono-label uppercase text-ink">КИШЛАК</span>
      </div>

      <NowPlayingBar onOpen={onOpenPlayer} />

      <div className="px-screen pt-4 pb-3">
        <h1 className="font-display text-h1 uppercase text-ink">Любимое</h1>
        <p className="font-mono text-mono-label uppercase text-dim mt-1">
          {tracks.length} ТРЕКОВ · {releases.length} РЕЛИЗОВ
        </p>
      </div>

      {tracks.length === 0 && releases.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-screen">
          <p className="font-mono text-mono-label uppercase text-dim text-center">
            Жми на сердце или три точки у трека — и он окажется здесь
          </p>
        </div>
      )}

      {tracks.length > 0 && (
        <div className="px-screen pb-4 anim-fade-up">
          <button
            onClick={playFavorites}
            className="w-full flex items-center justify-center gap-2 rounded-pill border border-line press mb-4"
            style={{ height: 52 }}
            aria-label="Слушать любимое"
          >
            <IconPlay size={18} />
            <span className="font-mono text-mono-label uppercase text-ink">
              Слушать любимое · {tracks.length}
            </span>
          </button>
          <p className="font-mono text-mono-label uppercase text-dim mb-1">треки</p>
          {tracks.map((track) => {
            const isPlaying = track.id === currentId
            return (
              <div
                key={track.id}
                className="flex items-center gap-2 border-b border-line"
                style={{ minHeight: 52 }}
              >
                <button
                  onClick={() => playTrack(track)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-display text-body-strong line-clamp-1"
                      style={{ color: isPlaying ? 'var(--accent-text)' : 'var(--ink)' }}
                    >
                      {track.title}
                    </p>
                    <p className="font-mono text-mono-label uppercase text-dim line-clamp-1">
                      {releaseById.get(track.releaseId)?.title ?? ''}
                    </p>
                  </div>
                  <span className="font-mono text-mono-num tabular-nums text-dim shrink-0">
                    {fmt(track.duration)}
                  </span>
                </button>
                <button
                  onClick={() => { setMenuTrack(track); haptic('light') }}
                  className="flex items-center justify-center text-dim"
                  style={{ width: 44, height: 44 }}
                  aria-label={`Действия: ${track.title}`}
                >
                  <IconMore size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {releases.length > 0 && (
        <div className="px-screen pb-4 anim-fade-up">
          <p className="font-mono text-mono-label uppercase text-dim mb-2">альбомы</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            {releases.map((release) => (
              <div key={release.id} className="relative">
                <Sleeve
                  release={release}
                  progress={releaseProgress(release.id, allTracks, getState())}
                  listenedCount={release.tracks.filter((t) => getState().tracks[t.id]?.completed).length}
                  onClick={() => playRelease(release.id)}
                />
                <div
                  className="absolute rounded-full"
                  style={{ top: 4, right: 4, background: 'rgba(0,0,0,.35)' }}
                >
                  <HeartButton
                    active
                    onToggle={() => { toggleRelease(release.id); haptic('light') }}
                    size={16}
                    box={34}
                    label={`Убрать из любимого: ${release.title}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TrackMenu
        open={menuTrack !== null}
        title={menuTrack?.title ?? ''}
        onClose={() => setMenuTrack(null)}
        actions={menuTrack ? [
          {
            label: 'Убрать из любимого',
            onSelect: () => { toggleTrack(menuTrack.id); haptic('light') },
            accent: true,
          },
          { label: 'Играть следующим', onSelect: () => { playNext(menuTrack); haptic('light') } },
          { label: 'Слушать трек', onSelect: () => playTrack(menuTrack) },
        ] : []}
      />
    </div>
  )
}
