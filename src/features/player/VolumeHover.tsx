import { useState } from 'react'
import { useAudioStore } from '@/audio/store'
import { IconVolume, IconVolumeOff } from '@/ui/icons'
import { haptic } from '@/app/telegram'

/** Громкость для десктопа: ползунок выезжает при наведении. */
export function VolumeHover() {
  const volume = useAudioStore((s) => s.volume)
  const setVolume = useAudioStore((s) => s.setVolume)
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState(0.8)

  const muted = volume === 0

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 40, height: 44, color: muted ? 'var(--accent-text)' : 'var(--dim)' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => {
          if (muted) setVolume(last)
          else {
            setLast(volume)
            setVolume(0)
          }
          haptic('light')
        }}
        aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        aria-pressed={muted}
        style={{ width: 40, height: 44, display: 'grid', placeItems: 'center' }}
      >
        {muted ? <IconVolumeOff size={21} /> : <IconVolume size={21} />}
      </button>

      {open && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            paddingBottom: 8,
            zIndex: 20,
          }}
        >
          <div
            style={{
              width: 34,
              height: 108,
              borderRadius: 17,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label="Громкость"
              style={{
                width: 88,
                height: 22,
                transform: 'rotate(-90deg)',
                accentColor: 'var(--accent)',
                background: 'transparent',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
