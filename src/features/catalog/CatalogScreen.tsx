import { useEffect, useState } from 'react'
import { CatalogRepo } from '@/data/CatalogRepo'
import { FanRepo } from '@/data/FanRepo'
import type { Catalog, Release } from '@/data/types'
import { useAudioStore } from '@/audio/store'
import { Sleeve, SleeveSkeleton } from '@/ui/Sleeve'
import { ReleaseFrame } from './ReleaseFrame'

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'offline' }

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

export function CatalogScreen() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [activeRelease, setActiveRelease] = useState<Release | null>(null)

  const track = useAudioStore((s) => s.track)
  const status = useAudioStore((s) => s.status)
  const currentTime = useAudioStore((s) => s.currentTime)
  const toggle = useAudioStore((s) => s.toggle)
  const loadTracks = useAudioStore((s) => s.load)

  const playing = status === 'playing'

  const fetchCatalog = () => {
    setLoad({ status: 'loading' })
    CatalogRepo.load().then(
      (catalog) => setLoad({ status: 'ready', catalog }),
      () => {
        if (!navigator.onLine) setLoad({ status: 'offline' })
        else setLoad({ status: 'error', message: 'Не удалось загрузить каталог' })
      },
    )
  }

  useEffect(() => { fetchCatalog() }, [])

  const catalog = load.status === 'ready' ? load.catalog : null
  const releases = catalog?.releases ?? []
  const completedCount = releases.filter((r) => FanRepo.releaseProgress(r.id) >= 1).length

  const handlePlay = (release: Release) => {
    const firstUnlistened = release.tracks[0] ?? null
    if (!firstUnlistened) return
    loadTracks(release.tracks, 0)
    // плеер откроется когда появится кассета (задача 05)
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* шапка */}
      <header
        className="flex items-center justify-between px-screen"
        style={{
          height: 40,
          paddingTop: 'env(safe-area-inset-top)',
          marginTop: 'env(safe-area-inset-top)',
        }}
      >
        {track && (playing || status === 'paused') ? (
          // режим C: играет трек
          <>
            <button
              onClick={() => toggle()}
              className="flex-1 flex items-center gap-2 min-h-[44px] text-left"
              aria-label={playing ? 'Пауза' : 'Продолжить'}
            >
              <span className="font-mono text-mono-label text-[var(--accent)]">●</span>
              <span className="font-display text-body-strong line-clamp-1">{track.title}</span>
              <span className="font-mono text-mono-num text-dim">{fmt(currentTime)}</span>
            </button>
            <div className="flex items-center gap-3 ml-2">
              <button
                onClick={() => toggle()}
                className="font-mono text-mono-label uppercase text-ink w-10 h-10 flex items-center justify-center"
                aria-label={playing ? 'Пауза' : 'Продолжить'}
              >
                {playing ? '⏸' : '▶'}
              </button>
              <ProfileButton />
            </div>
          </>
        ) : (
          // обычный режим
          <>
            <span className="font-mono text-mono-label uppercase text-ink">КИШЛАК</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-mono-num text-dim">{completedCount} / {releases.length}</span>
              <ProfileButton />
            </div>
          </>
        )}
      </header>

      {/* линия прогресса под шапкой если играет */}
      {track && playing && (
        <div className="h-0.5 w-full bg-line">
          <div
            className="h-full"
            style={{
              width: track.duration > 0 ? `${(currentTime / track.duration) * 100}%` : '0%',
              background: 'var(--accent)',
              transition: 'width 1s linear',
            }}
          />
        </div>
      )}

      {/* офлайн-баннер */}
      {load.status === 'offline' && (
        <div className="h-10 bg-surface flex items-center px-screen">
          <span className="font-mono text-mono-label uppercase text-dim">нет сети</span>
        </div>
      )}

      {/* контент */}
      <main className="flex-1 px-screen pb-8" style={{ paddingTop: 24 }}>
        <h1 className="font-display text-h1 uppercase text-ink mb-1">Каталог</h1>
        <p className="font-mono text-mono-label uppercase text-dim mb-6">
          Проявляется по мере прослушивания
        </p>

        {load.status === 'loading' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {Array.from({ length: 6 }).map((_, i) => <SleeveSkeleton key={i} />)}
          </div>
        )}

        {load.status === 'error' && (
          <div className="flex flex-col items-start gap-4">
            <p className="font-mono text-mono-num text-dim">{load.message}</p>
            <button
              onClick={fetchCatalog}
              className="font-mono text-mono-label uppercase border border-line px-4 py-2 min-h-[44px]"
            >
              Повторить
            </button>
          </div>
        )}

        {(load.status === 'ready' || load.status === 'offline') && releases.length === 0 && (
          <p className="font-mono text-mono-num text-dim">Каталог ещё собирается</p>
        )}

        {(load.status === 'ready' || load.status === 'offline') && releases.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {releases.map((release) => (
              <Sleeve
                key={release.id}
                release={release}
                progress={FanRepo.releaseProgress(release.id)}
                listenedCount={Math.round(FanRepo.releaseProgress(release.id) * release.tracks.length)}
                onClick={() => setActiveRelease(release)}
              />
            ))}
          </div>
        )}
      </main>

      {/* кадр релиза */}
      {activeRelease && (
        <ReleaseFrame
          release={activeRelease}
          listenedCount={Math.round(FanRepo.releaseProgress(activeRelease.id) * activeRelease.tracks.length)}
          onClose={() => setActiveRelease(null)}
          onPlay={() => {
            handlePlay(activeRelease)
            setActiveRelease(null)
          }}
        />
      )}
    </div>
  )
}

function ProfileButton() {
  return (
    <button
      className="w-[30px] h-[30px] rounded-full border border-line flex items-center justify-center font-mono text-mono-label text-ink min-h-[30px]"
      aria-label="Профиль"
    >
      Р
    </button>
  )
}
