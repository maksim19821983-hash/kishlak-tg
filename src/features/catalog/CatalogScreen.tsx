import { useEffect, useState } from 'react'
import { CatalogRepo } from '@/data/CatalogRepo'
import { FanRepo } from '@/data/FanRepo'
import { subscribeFan } from '@/features/fan/trackListen'
import type { Catalog, Release } from '@/data/types'
import { Sleeve, SleeveSkeleton } from '@/ui/Sleeve'
import { ReleaseFrame } from './ReleaseFrame'
import { NowPlayingBar } from '@/ui/NowPlayingBar'
import { IconTheme } from '@/ui/icons'
import { toggleTheme } from '@/features/polarity/usePolarity'
import { haptic } from '@/app/telegram'

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'offline' }

function devProgress(): number | null {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(window.location.search).get('p')
  const n = v !== null ? parseFloat(v) : NaN
  return isFinite(n) ? Math.max(0, Math.min(1, n)) : null
}

function getProgress(releaseId: string, catalog: Catalog | null): number {
  const dev = devProgress()
  if (dev !== null) return dev
  const tracks = catalog?.releases.flatMap((r) => r.tracks) ?? []
  return FanRepo.releaseProgress(releaseId, tracks)
}

type Props = { onPlayRelease: (release: Release) => void; onOpenPlayer: () => void }

export function CatalogScreen({ onPlayRelease, onOpenPlayer }: Props) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [activeRelease, setActiveRelease] = useState<Release | null>(null)
  const [, setFanTick] = useState(0)

  useEffect(() => subscribeFan(() => setFanTick((n) => n + 1)), [])

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

  return (
    <div
      className="min-h-full flex flex-col overflow-x-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* шапка */}
      <header
        className="flex items-center justify-between gap-2 px-screen"
        style={{ height: 40 }}
      >
        <span className="font-mono text-mono-label uppercase text-ink">КИШЛАК</span>
        <div className="flex items-center gap-1">
          <span className="font-mono text-mono-num text-dim">
            {releases.length > 0 ? `${releases.filter((r) => getProgress(r.id, catalog) >= 1).length} СОБРАНО` : ''}
          </span>
          <button
            onClick={() => { toggleTheme(); haptic('light') }}
            className="flex items-center justify-center text-dim"
            style={{ width: 44, height: 44 }}
            aria-label="Переключить тему"
          >
            <IconTheme size={18} />
          </button>
        </div>
      </header>

      <NowPlayingBar onOpen={onOpenPlayer} />

      {load.status === 'offline' && (
        <div className="h-10 bg-surface flex items-center px-screen shrink-0">
          <span className="font-mono text-mono-label uppercase text-dim">нет сети</span>
        </div>
      )}

      {import.meta.env.DEV && devProgress() !== null && (
        <div className="px-screen py-1 bg-surface shrink-0">
          <span className="font-mono text-mono-label uppercase text-dim">dev: p={devProgress()}</span>
        </div>
      )}

      <main className="flex-1 px-screen" style={{ paddingTop: 24, paddingBottom: 32 }}>
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
                progress={getProgress(release.id, catalog)}
                listenedCount={Math.round(getProgress(release.id, catalog) * release.tracks.length)}
                onClick={() => setActiveRelease(release)}
                onPlay={() => onPlayRelease(release)}
              />
            ))}
          </div>
        )}
      </main>

      {activeRelease && (
        <ReleaseFrame
          release={activeRelease}
          listenedCount={Math.round(getProgress(activeRelease.id, catalog) * activeRelease.tracks.length)}
          onClose={() => setActiveRelease(null)}
          onPlay={() => {
            onPlayRelease(activeRelease)
            setActiveRelease(null)
          }}
        />
      )}
    </div>
  )
}
