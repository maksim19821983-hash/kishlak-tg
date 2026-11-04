import { useRef, useState } from 'react'
import { useAudioStore } from '@/audio/store'
import { IconVolume, IconVolumeOff } from '@/ui/icons'
import { haptic } from '@/app/telegram'

/** Громкость для десктопа: вертикальный ползунок выезжает при наведении. */
export function VolumeHover() {
  const volume = useAudioStore((s) => s.volume)
  const setVolume = useAudioStore((s) => s.setVolume)
  const [open, setOpen] = useState(false)
  const lastRef = useRef(0.8)
  const trackRef = useRef<HTMLDivElement>(null)

  const muted = volume === 0

  const setFromPointer = (clientY: number): void => {
    const el = trackRef.current
    if (el === null) return
    const rect = el.getBoundingClientRect()
    const ratio = 1 - (clientY - rect.top) / rect.height
    setVolume(Math.max(0, Math.min(1, ratio)))
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 40, height: 44, color: muted ? 'var(--accent-text)' : 'var(--dim)' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => {
          if (muted) setVolume(lastRef.current > 0 ? lastRef.current : 0.8)
          else {
            lastRef.current = volume
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
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            paddingBottom: 6,
            zIndex: 20,
          }}
        >
          <div
            ref={trackRef}
            role="slider"
            aria-label="Громкость"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setFromPointer(e.clientY)
            }}
            onPointerMove={(e) => {
              if (e.buttons === 0) return
              setFromPointer(e.clientY)
            }}
            style={{
              position: 'relative',
              width: 6,
              height: 96,
              borderRadius: 3,
              background: 'var(--line)',
              cursor: 'pointer',
              margin: '0 12px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: `${volume * 100}%`,
                borderRadius: 3,
                background: 'var(--accent)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: `calc(${volume * 100}% - 6px)`,
                width: 12,
                height: 12,
                borderRadius: 999,
                background: 'var(--ink)',
                transform: 'translateX(-50%)',
                border: '2px solid var(--bg)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
