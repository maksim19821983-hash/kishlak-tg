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
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
          }}
        >
          <div
            style={{
              padding: '12px 10px',
              borderRadius: 14,
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              boxShadow: '0 8px 24px rgba(0,0,0,.28)',
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
                width: 120,
                height: 120,
                cursor: 'pointer',
                touchAction: 'none',
              }}
            >
              {/* вертикальная дорожка */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 10,
                  bottom: 10,
                  width: 8,
                  marginLeft: -4,
                  borderRadius: 4,
                  background: 'var(--line)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 10,
                  width: 8,
                  marginLeft: -4,
                  height: `calc(${volume * 100}% - 20px * ${volume})`,
                  borderRadius: 4,
                  background: 'var(--accent)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: `calc(${volume * 100}% - ${volume * 20}px)`,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: 'var(--ink)',
                  transform: 'translate(-50%, 50%)',
                  border: '3px solid var(--panel)',
                  boxShadow: '0 2px 6px rgba(0,0,0,.35)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
