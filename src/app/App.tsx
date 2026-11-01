import { useEffect, useState } from 'react'
import { Grain } from '@/ui/Grain'
import { usePolarity } from '@/features/polarity/usePolarity'
import { PlayerTab } from '@/features/player/PlayerTab'
import { CatalogScreen } from '@/features/catalog/CatalogScreen'
import { ProfileScreen } from '@/features/fan/ProfileScreen'
import { TabBar, type Tab } from '@/ui/TabBar'
import { initTrackListener } from '@/features/fan/trackListen'
import { applyDeepLink } from './deepLink'
import { getWebEngine } from '@/audio/webEngine'
import { getState } from '@/features/fan/state'
import type { Release, Track } from '@/data/types'
import { CatalogRepo } from '@/data/CatalogRepo'
import { SpikePage } from '@/features/spike/SpikePage'
import { PolarityPage } from '@/features/polarity/PolarityPage'

function firstUnlistenedIndex(release: Release): number {
  const fanState = getState()
  for (let i = 0; i < release.tracks.length; i++) {
    const t = release.tracks[i]!
    const stat = fanState.tracks[t.id]
    if (!stat || stat.listens === 0) return i
  }
  return 0
}

export function App() {
  usePolarity()
  const [activeTab, setActiveTab] = useState<Tab>('player')

  useEffect(() => {
    const cleanup = initTrackListener()
    return cleanup
  }, [])

  useEffect(() => {
    applyDeepLink().then(({ openPlayer }) => {
      if (openPlayer) setActiveTab('player')
    }).catch(() => {})
  }, [])

  const p = window.location.pathname
  if (p === '/spike') return <SpikePage />
  if (import.meta.env.DEV && p === '/polarity') return <PolarityPage />

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

  return (
    <div
      className="bg-bg text-ink transition-colors duration-theme flex flex-col"
      style={{ height: '100dvh' }}
    >
      <Grain />

      <div className="flex-1 min-h-0 relative">
        <div
          className="absolute inset-0"
          style={{ display: activeTab === 'player' ? undefined : 'none' }}
        >
          <PlayerTab />
        </div>
        <div
          className="absolute inset-0 overflow-y-auto overscroll-contain"
          style={{ display: activeTab === 'catalog' ? undefined : 'none' }}
        >
          <CatalogScreen onPlayRelease={handlePlayRelease} onOpenPlayer={() => setActiveTab('player')} />
        </div>
        <div
          className="absolute inset-0 overflow-y-auto overscroll-contain"
          style={{ display: activeTab === 'profile' ? undefined : 'none' }}
        >
          <ProfileScreen asTab onOpenPlayer={() => setActiveTab('player')} />
        </div>
      </div>

      <TabBar active={activeTab} onSelect={setActiveTab} />
    </div>
  )
}
