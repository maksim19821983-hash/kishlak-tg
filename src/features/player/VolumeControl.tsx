import { useEffect, useState } from 'react'
import { useAudioStore } from '@/audio/store'

const STORAGE_KEY = 'kishlak:volume'

/** Громкость нужна только на десктопе: на телефоне её регулирует система. */
function isDesktop(): boolean {
  try {
    const platform = window.Telegram?.WebApp?.platform ?? ''
    if (platform === 'tdesktop' || platform === 'macos' || platform === 'web') return true
  } catch {
    /* без SDK */
  }
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function storedVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return 1
    const value = Number(raw)
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1
  } catch {
    return 1
  }
}

export function VolumeControl() {
  const desktop = isDesktop()
  const setVolumeToStore = useAudioStore((s) => s.setVolume)
  const [value, setValue] = useState(() => storedVolume())

  useEffect(() => {
    if (!desktop) return
    setVolumeToStore(value)
  }, [desktop, setVolumeToStore, value])

  if (!desktop) return null

  return (
    <div className="px-screen flex items-center" style={{ gap: 10, marginTop: 10 }} aria-label="Громкость">
      <span
        className="font-mono uppercase text-dim shrink-0"
        style={{ fontSize: 10, letterSpacing: '.14em', width: 26, textAlign: 'center' }}
        aria-hidden
      >
        {value === 0 ? 'MUTE' : `${Math.round(value * 100)}`}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => {
          const next = Number(e.target.value) / 100
          setValue(next)
          try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
        }}
        className="seek-slider"
        style={{ flex: 1, height: 22 }}
        aria-label="Громкость"
      />
    </div>
  )
}
