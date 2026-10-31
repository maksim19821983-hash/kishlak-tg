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

function pluralRelease(n: number): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return `${n} РЕЛИЗОВ`
  if (mod10 === 1) return `${n} РЕЛИЗ`
  if (mod10 >= 2 && mod10 <= 4) return `${n} РЕЛИЗА`
  return `${n} РЕЛИЗОВ`
}

// dev: ?p=0.6 подставляет фиксированную долю прослушивания вместо FanRepo
function devProgress(): number | null {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(window.location.search).get('p')
  const n = v !== null ? parseFloat(v) : NaN
  return isFinite(n) ? Math.max(0, Math.min(1, n)) : null
}

function getProgress(releaseId: string): number {
  const dev = devProgress()
  return dev !== null ? dev : FanRepo.releaseProgress(releaseId)
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
  const completedCount = releases.filter((r) => getProgress(r.id) >= 1).length

  const handlePlay = (release: Release) => {
    if (release.tracks.length === 0) return
    loadTracks(release.tracks, 0)
    // плеер откроется когда появится кассета (задача 05)
  }

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-x-hidden">
      {/* шапка */}
      <header
        className="flex items-center justify-between gap-2 px-screen"
        style={{
          height: 40,
          marginTop: 'env(safe-area-inset-top)',
          paddingTop: 0,
        }}
      >
        {track && (playing || status === 'paused') ? (
          // режим C: играет трек
          <>
            <button
              onClick={() => toggle()}
              className="flex-1 min-w-0 flex items-center gap-2 min-h-[44px] text-left"
              aria-label={playing ? 'Пауза' : 'Продолжить'}
            >
              <span className="font-mono text-mono-label text-[var(--accent)] shrink-0">●</span>
              <span className="font-display text-body-strong truncate">{track.title}</span>
              <span className="font-mono text-mono-num text-dim shrink-0">{fmt(currentTime)}</span>
            </button>
            <div className="flex items-center gap-2 shrink-0">
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
            <span className="font-mono text-mono-label uppercase text-ink shrink-0">КИШЛАК</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-mono-num text-dim">{pluralRelease(completedCount)}</span>
              <ProfileButton />
            </div>
          </>
        )}
      </header>

      {/* линия прогресса под шапкой если играет */}
      {track && playing && (
        <div className="h-0.5 w-full bg-line shrink-0">
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
        <div className="h-10 bg-surface flex items-center px-screen shrink-0">
          <span className="font-mono text-mono-label uppercase text-dim">нет сети</span>
        </div>
      )}

      {/* dev-подсказка */}
      {import.meta.env.DEV && devProgress() !== null && (
        <div className="px-screen py-1 bg-surface shrink-0">
          <span className="font-mono text-mono-label uppercase text-dim">dev: p={devProgress()}</span>
        </div>
      )}

      {/* контент */}
      <main
        className="flex-1 px-screen pb-8"
        style={{ paddingTop: 24, paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}
      >
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
                progress={getProgress(release.id)}
                listenedCount={Math.round(getProgress(release.id) * release.tracks.length)}
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
          listenedCount={Math.round(getProgress(activeRelease.id) * activeRelease.tracks.length)}
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
      className="w-[30px] h-[30px] rounded-full border border-line flex items-center justify-center font-mono text-mono-label text-ink"
      aria-label="Профиль"
    >
      Р
    </button>
  )
}
