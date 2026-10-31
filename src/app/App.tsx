import { useEffect, useState } from 'react'
import { Grain } from '@/ui/Grain'
import { Routes } from './routes'
import { usePolarity } from '@/features/polarity/usePolarity'
import { PlayerScreen } from '@/features/player/PlayerScreen'
import { TapeStrip } from '@/ui/TapeStrip'
import { useAudioStore } from '@/audio/store'
import { usePathname } from './router'
import { initTrackListener } from '@/features/fan/trackListen'

function useShowTape(): boolean {
  const track = useAudioStore((s) => s.track)
  const status = useAudioStore((s) => s.status)
  const pathname = usePathname()
  const isMain = pathname === '/' || pathname === '/catalog'
  return !isMain && !!track && status !== 'idle'
}

export function App() {
  usePolarity()
  const [playerOpen, setPlayerOpen] = useState(false)
  const showTape = useShowTape()

  useEffect(() => {
    const cleanup = initTrackListener()
    return cleanup
  }, [])

  return (
    <div className="min-h-[100dvh] bg-bg text-ink transition-colors duration-theme flex flex-col">
      <div className="flex-1 min-h-0">
        <Routes onOpenPlayer={() => setPlayerOpen(true)} />
      </div>
      {showTape && <TapeStrip onOpen={() => setPlayerOpen(true)} />}
      <Grain />
      {playerOpen && <PlayerScreen onClose={() => setPlayerOpen(false)} />}
    </div>
  )
}
