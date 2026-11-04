import { useEffect, useState } from 'react'
import { Grain } from '@/ui/Grain'
import { usePolarity } from '@/features/polarity/usePolarity'
import { useAudioStore } from '@/audio/store'
import { useFavorites } from '@/features/favorites/store'
import { mixHex } from '@/features/polarity/accent'
import { PlayerTab } from '@/features/player/PlayerTab'
import { CatalogScreen } from '@/features/catalog/CatalogScreen'
import { ProfileSoon } from '@/features/fan/ProfileSoon'
import { FavoritesScreen } from '@/features/favorites/FavoritesScreen'
import { TabBar, type Tab } from '@/ui/TabBar'
import { initTrackListener } from '@/features/fan/trackListen'
import { applyDeepLink } from './deepLink'
import { getWebEngine } from '@/audio/webEngine'
import { isListened } from '@/features/fan/derive'
import { getState } from '@/features/fan/state'
import type { Release, Track } from '@/data/types'
import { CatalogRepo } from '@/data/CatalogRepo'
import { SpikePage } from '@/features/spike/SpikePage'
import { PolarityPage } from '@/features/polarity/PolarityPage'
import { BootScreen } from './BootScreen'
import { remoteAvailable, syncRemote, getSyncStatus, markSync, markDirty, hasPendingChanges } from './remoteSync'
import { ErrorOverlay } from './ErrorOverlay'
import { onPersist } from '@/features/fan/state'
import { Onboarding, hasSeenOnboarding } from '@/features/onboarding/Onboarding'

function firstUnlistenedIndex(release: Release): number {
  const fanState = getState()
  for (let i = 0; i < release.tracks.length; i++) {
    const t = release.tracks[i]!
    const stat = fanState.tracks[t.id]
    if (!stat || !isListened(stat)) return i
  }
  return 0
}

/** Фон сцены — обложка играющего релиза: афиша сверху, бумага снизу. */
const COVER_BACKDROP = true

/** Диагностика доступна только в разработке или при сборке с VITE_DEBUG=1. */
const DEBUG_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEBUG === '1'

export function App() {
  usePolarity()
  const cover = useAudioStore((s) => s.track?.cover)
  const polarity = (document.documentElement.dataset.polarity as 'paper' | 'dark') ?? 'paper'
  const accent = useAudioStore((s) => s.track?.accent)

  // светлота обложки: на тёмных обложках скрим плотнее, иначе текст проваливается
  const coverIsLight = (() => {
    if (accent === undefined) return true
    const c = accent.replace('#', '')
    const ch = (i: number): number => parseInt(c.slice(i, i + 2), 16) / 255
    return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4) > 0.45
  })()

  // скрим подкрашиваем цветом обложки, чтобы дымка не была серой
  const paperFree = polarity === 'paper' ? '#EDE7DC' : '#0B0B0C'
  const scrimRgb = accent !== undefined ? mixHex(accent, paperFree, polarity === 'paper' ? 0.3 : 0.24) : paperFree
  const scrim = (a: number): string => scrimRgb.replace('rgb(', 'rgba(').replace(')', `,${a})`)

  useEffect(() => {
    document.documentElement.style.setProperty('--scene', COVER_BACKDROP ? 'transparent' : 'var(--bg)')
    return () => {
      document.documentElement.style.removeProperty('--scene')
    }
  }, [])
  const [activeTab, setActiveTab] = useState<Tab>('player')
  const [pendingRelease, setPendingRelease] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)
  const [bootProgress, setBootProgress] = useState(0.06)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDebug, setShowDebug] = useState(false)


  useEffect(() => {
    const cleanup = initTrackListener()
    const unsubscribeFavorites = useFavorites.subscribe(() => markDirty())
    return () => {
      cleanup()
      unsubscribeFavorites()
    }
  }, [])

  // синхронизация через свой сервер: при старте, при возврате в приложение и раз в 90 секунд
  useEffect(() => {
    let cancelled = false
    let ready = false

    const syncOnce = async (): Promise<void> => {
      if (!remoteAvailable()) {
        markSync(false, 'приложение открыто не в Телеграме')
        return
      }
      try {
        await syncRemote()
      } catch (e) {
        // причина видна в профиле, иначе «ожидание обмена» без объяснений
        markSync(false, e instanceof Error ? e.message : String(e))
      }
    }

    void (async () => {
      try {
        const catalog = await CatalogRepo.load()
        if (cancelled) return

        // если ничего не играло — подставляем первую песню каталога
        const engine = getWebEngine()
        if (useAudioStore.getState().track === null) {
          const all = catalog.releases.flatMap((r) => r.tracks)
          if (all.length > 0) engine.load(all, 0)
        }
      } catch {
        /* каталог не загрузился — синхронизации это не мешает */
      }
      if (cancelled) return
      ready = true
      await syncOnce()
    })()

    // прогресс изменился — пометили и отправим одним пакетом позже
    onPersist(() => markDirty())

    // открыл приложение — только читаем, писать будем если есть изменения
    const onVisible = (): void => {
      if (!ready) return
      void syncRemote({ push: false }).catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)

    // отправка: раз в 30 секунд, и только если действительно что-то изменилось
    const pushTimer = setInterval(() => {
      if (!ready || !remoteAvailable()) return
      if (!hasPendingChanges()) return
      void syncOnce()
    }, 30_000)

    // чтение изменений с других устройств: раз в 3 минуты
    const pullTimer = setInterval(() => {
      if (!ready || !remoteAvailable()) return
      void syncRemote({ push: false }).catch(() => {})
    }, 180_000)

    // пока не прошёл первый обмен — пробуем, но не чаще раза в минуту
    let attempts = 0
    const retry = setInterval(() => {
      if (!ready || !remoteAvailable()) return
      if (getSyncStatus().at !== 0 || attempts >= 10) return
      attempts += 1
      void syncOnce()
    }, 60_000)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(retry)
      clearInterval(pullTimer)
      clearInterval(pushTimer)
    }
  }, [])

  // грузим манифест и шрифты; логотип 11:11 заливается плавно и достоверно
  useEffect(() => {
    let cancelled = false
    let loaded = false
    const started = performance.now()

    CatalogRepo.load().then(() => { loaded = true }).catch(() => { loaded = true })

    // шрифты не должны держать загрузку: на iOS промис иногда не завершается
    const fontsReady = document.fonts?.ready
    if (fontsReady !== undefined) {
      void Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 1200))]).then(() => { loaded = true })
    } else {
      loaded = true
    }

    const total = 1200
    // страховка: через 5 секунд показываем приложение при любом состоянии загрузки
    const hardStop = setTimeout(() => {
      if (cancelled) return
      setBootProgress(1)
      setBooting(false)
    }, 3200)

    const id = setInterval(() => {
      if (cancelled) return
      const elapsed = performance.now() - started
      const ready = loaded && elapsed >= total

      if (ready) {
        clearInterval(id)
        clearTimeout(hardStop)
        setBootProgress(1)
        setTimeout(() => {
          if (cancelled) return
          setBooting(false)
          // ждём, пока логотип погаснет, и только потом показываем онбординг
          setTimeout(() => {
            if (cancelled) return
            setShowOnboarding(!hasSeenOnboarding())
          }, 420)
        }, 520)
        return
      }

      // заливка идёт по времени и упирается в 90%, пока данные не готовы
      const ramp = Math.min(0.9, 0.05 + (elapsed / total) * 0.85)
      setBootProgress((prev) => Math.max(prev, ramp))
    }, 60)

    return () => {
      cancelled = true
      clearInterval(id)
      clearTimeout(hardStop)
    }
  }, [])

  useEffect(() => {
    applyDeepLink().then(({ openPlayer }) => {
      if (openPlayer) setActiveTab('player')
    }).catch(() => {})
  }, [])

  const p = window.location.pathname
  if (DEBUG_ENABLED && (p === '/spike' || p === '/debug')) return <SpikePage />
  if (import.meta.env.DEV && p === '/polarity') return <PolarityPage />

  const handlePlayTrack = (trackId: string) => {
    CatalogRepo.load().then((cat) => {
      const allTracks: Track[] = cat.releases.flatMap((r) => r.tracks)
      const idx = allTracks.findIndex((t) => t.id === trackId)
      if (idx < 0) return
      const engine = getWebEngine()
      engine.load(allTracks, idx)
      engine.play()
      setActiveTab('player')
    }).catch(() => {})
  }

  const handlePlayRelease = (release: Release) => {
    if (release.tracks.length === 0) return
    CatalogRepo.load().then((cat) => {
      const allTracks: Track[] = cat.releases.flatMap((r) => r.tracks)
      const firstTrackId = release.tracks[firstUnlistenedIndex(release)]?.id
      const startIdx = Math.max(0, allTracks.findIndex((t) => t.id === firstTrackId))
      const engine = getWebEngine()
      engine.load(allTracks, startIdx)
      engine.play()
    }).catch(() => {})
    setActiveTab('player')
  }

  const startRandom = (): void => {
    CatalogRepo.load().then((cat) => {
      const allTracks: Track[] = cat.releases.flatMap((r) => r.tracks)
      if (allTracks.length === 0) return
      const idx = Math.floor(Math.random() * allTracks.length)
      const engine = getWebEngine()
      engine.load(allTracks, idx)
      engine.play()
      setActiveTab('player')
    }).catch(() => {})
  }

  return (
    <div
      className="bg-bg text-ink transition-colors duration-theme flex flex-col"
      style={{ height: '100dvh' }}
    >
      <Grain />

      {COVER_BACKDROP && cover !== undefined && (
        <>
          <div
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              backgroundImage: `url(${cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              filter: 'blur(2px) saturate(1.18)',
              transform: 'scale(1.25)',
              opacity: polarity === 'paper' ? (coverIsLight ? 0.95 : 0.82) : 0.68,
              transition: 'opacity 600ms ease',
              pointerEvents: 'none',
              zIndex: 0,
              WebkitMaskImage: 'linear-gradient(to bottom, black 8%, rgba(0,0,0,.45) 40%, transparent 56%)',
              maskImage: 'linear-gradient(to bottom, black 8%, rgba(0,0,0,.45) 40%, transparent 56%)',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              background:
                `linear-gradient(to bottom, ${scrim(coverIsLight ? 0.18 : 0.4)} 0%, ${scrim(0.55)} 34%, ${scrim(1)} 56%)`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        </>
      )}

      <ErrorOverlay />

      <div className="flex-1 min-h-0 relative" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 tab-pane" data-active={activeTab === 'player'}>
          <PlayerTab
            onOpenRelease={(id) => { setPendingRelease(id); setActiveTab('catalog') }}
            onOpenDebug={DEBUG_ENABLED ? () => setShowDebug(true) : undefined}
          />
        </div>
        <div className="absolute inset-0 overflow-y-auto overscroll-contain tab-pane" data-active={activeTab === 'catalog'}>
          <CatalogScreen
            onPlayRelease={handlePlayRelease}
            onOpenPlayer={() => setActiveTab('player')}
            openReleaseId={pendingRelease}
            onReleaseOpened={() => setPendingRelease(null)}
            onPlayTrack={handlePlayTrack}
          />
        </div>
        <div className="absolute inset-0 overflow-y-auto overscroll-contain tab-pane" data-active={activeTab === 'favorites'}>
          <FavoritesScreen onOpenPlayer={() => setActiveTab('player')} />
        </div>
        <div className="absolute inset-0 overflow-y-auto overscroll-contain tab-pane" data-active={activeTab === 'profile'}>
          <ProfileSoon onOpenPlayer={() => setActiveTab('player')} />
        </div>
      </div>

      <TabBar active={activeTab} onSelect={setActiveTab} />

      {DEBUG_ENABLED && showDebug && (
        <div className="fixed inset-0 z-[70] bg-bg overflow-y-auto">
          <div className="flex items-center justify-between px-4 pt-4">
            <span className="font-mono uppercase text-dim" style={{ fontSize: 10, letterSpacing: '.16em' }}>
              диагностика
            </span>
            <button
              onClick={() => setShowDebug(false)}
              className="font-mono uppercase text-ink"
              style={{ fontSize: 11, minHeight: 44, paddingInline: 12 }}
            >
              закрыть
            </button>
          </div>
          <SpikePage />
        </div>
      )}

      <BootScreen done={!booting} progress={bootProgress} />
      {!booting && showOnboarding && (
        <Onboarding onDone={() => setShowOnboarding(false)} onStart={startRandom} />
      )}
    </div>
  )
}
