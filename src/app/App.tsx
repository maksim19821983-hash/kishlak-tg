import { useEffect, useState } from 'react'
import { Grain } from '@/ui/Grain'
import { usePolarity } from '@/features/polarity/usePolarity'
import { useAudioStore } from '@/audio/store'
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
import { initCloud, pullAndMerge, pushAll, schedulePush, watchFavorites } from './cloudSync'
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
    const unwatch = watchFavorites()
    return () => {
      cleanup()
      unwatch()
    }
  }, [])

  // подтягиваем данные аккаунта из облака Телеграма (телефон ↔ ПК) и отдаём обратно
  useEffect(() => {
    let cancelled = false
    initCloud()
      .then((ok) => {
        if (cancelled || !ok) return
        return CatalogRepo.load().then((cat) => pullAndMerge(cat.releases.map((r) => r.id)))
      })
      .then(() => { if (!cancelled) void pushAll() })
      .catch(() => {})

    const onHide = (): void => { void pushAll() }
    document.addEventListener('visibilitychange', onHide)
    const timer = setInterval(() => schedulePush(0), 60_000)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onHide)
      clearInterval(timer)
    }
  }, [])

  // грузим манифест и шрифты; логотип 11:11 заливается плавно и достоверно
  useEffect(() => {
    let cancelled = false
    let loaded = false
    const started = performance.now()

    CatalogRepo.load().then(() => { loaded = true }).catch(() => { loaded = true })
    document.fonts?.ready.then(() => { loaded = true })

    const total = 1600
    const id = setInterval(() => {
      if (cancelled) return
      const elapsed = performance.now() - started
      const ready = loaded && elapsed >= total

      if (ready) {
        clearInterval(id)
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
    }
  }, [])

  useEffect(() => {
    applyDeepLink().then(({ openPlayer }) => {
      if (openPlayer) setActiveTab('player')
    }).catch(() => {})
  }, [])

  const p = window.location.pathname
  // отладка в Телеграме: открыть бота со ссылкой ?startapp=debug
  const startParam = (() => {
    try {
      return (window.Telegram?.WebApp as unknown as { initDataUnsafe?: { start_param?: string } } | undefined)
        ?.initDataUnsafe?.start_param ?? ''
    } catch {
      return ''
    }
  })()
  if (p === '/spike' || startParam === 'debug') return <SpikePage />
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
              filter: 'blur(5px) saturate(1.22)',
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

      <div className="flex-1 min-h-0 relative" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 tab-pane" data-active={activeTab === 'player'}>
          <PlayerTab
            onOpenRelease={(id) => { setPendingRelease(id); setActiveTab('catalog') }}
            onOpenDebug={() => setShowDebug(true)}
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

      {showDebug && (
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
