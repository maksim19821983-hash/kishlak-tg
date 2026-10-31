import { useEffect, useState } from 'react'
import { CatalogRepo } from '@/data/CatalogRepo'
import type { Catalog } from '@/data/types'
import { parse, usePathname, type Route } from './router'
import { SpikePage } from '@/features/spike/SpikePage'
import { PolarityPage } from '@/features/polarity/PolarityPage'

// Заглушки экранов. Каталог уже читает манифест — чтобы каркас проверял данные, а не моки.

type Load = { status: 'loading' } | { status: 'ready'; catalog: Catalog } | { status: 'error'; message: string }

function CatalogStub() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    CatalogRepo.load().then(
      (catalog) => alive && setLoad({ status: 'ready', catalog }),
      (err: unknown) => alive && setLoad({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
    )
    return () => {
      alive = false
    }
  }, [])

  return (
    <div>
      <h1 className="font-display text-h1 uppercase">Каталог</h1>
      <p className="font-mono text-mono-label uppercase text-dim">экран-заглушка</p>
      {load.status === 'loading' && <p className="mt-4 font-mono text-mono-label uppercase text-dim">загрузка…</p>}
      {load.status === 'error' && (
        <p role="alert" className="mt-4 font-mono text-mono-num">
          {load.message}
        </p>
      )}
      {load.status === 'ready' &&
        load.catalog.releases.map((release) => (
          <section key={release.id} className="mt-6">
            <p className="font-mono text-mono-label uppercase text-dim">
              {release.year} · {release.tracks.length} треков
            </p>
            <h2 className="font-display text-h2">{release.title}</h2>
            <ol className="mt-3">
              {release.tracks.map((track, i) => (
                <li key={track.id} className="flex gap-3 border-b border-line py-2 font-mono text-mono-num tabular-nums">
                  <span className="text-dim">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 font-display text-body-strong">{track.title}</span>
                  <span className="text-dim">
                    {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
    </div>
  )
}

function Stub({ route }: { route: Route }) {
  return <div>экран {route.name === 'release' ? `release/${route.id}` : route.name}</div>
}

export function Routes() {
  const route = parse(usePathname())
  if (route === null) return <div>экран не найден</div>
  if (route.name === 'catalog') return <CatalogStub />
  if (route.name === 'spike') return <SpikePage />
  if (route.name === 'polarity') return <PolarityPage />
  return <Stub route={route} />
}
