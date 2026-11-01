import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/audio/store'

const COPPER = '#8C5334'
const REEL_SIZE = 64   // px, total container
const TAPE_MIN = 10    // px, radius of empty disc
const TAPE_MAX = 28    // px, radius of full disc
const DEG_PER_MS = 360 / 2000

function tapeRadius(progress: number, isLeft: boolean): number {
  const p = Math.max(0, Math.min(1, progress))
  return isLeft
    ? TAPE_MAX - p * (TAPE_MAX - TAPE_MIN)
    : TAPE_MIN + p * (TAPE_MAX - TAPE_MIN)
}

type Props = {
  side: 'A' | 'B'
  onTap: () => void
  trackTitle?: string
  releaseYear?: number
  polarity?: 'paper' | 'dark'
}

export function Cassette({ side, onTap, trackTitle, releaseYear, polarity }: Props) {
  const playing     = useAudioStore((s) => s.status === 'playing')
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration    = useAudioStore((s) => s.duration)

  const progress = duration > 0 ? currentTime / duration : 0
  const leftR  = tapeRadius(progress, true)
  const rightR = tapeRadius(progress, false)

  const leftHubRef  = useRef<HTMLDivElement>(null)
  const rightHubRef = useRef<HTMLDivElement>(null)
  const angleRef    = useRef(0)
  const lastTsRef   = useRef<number | null>(null)
  const rafRef      = useRef(0)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (reducedMotion.current) return
    function tick(ts: number) {
      rafRef.current = requestAnimationFrame(tick)
      if (document.hidden || !playing) { lastTsRef.current = null; return }
      if (lastTsRef.current === null) { lastTsRef.current = ts; return }
      const delta = ts - lastTsRef.current
      lastTsRef.current = ts
      angleRef.current = (angleRef.current + DEG_PER_MS * delta) % 360
      const t = `rotate(${angleRef.current}deg)`
      if (leftHubRef.current)  leftHubRef.current.style.transform  = t
      if (rightHubRef.current) rightHubRef.current.style.transform = t
    }
    rafRef.current = requestAnimationFrame(tick)
    const onVisibility = () => { lastTsRef.current = null }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [playing])

  const pol = polarity ?? (document.documentElement.dataset.polarity as 'paper' | 'dark' | undefined) ?? 'paper'
  const bodyBg     = pol === 'paper' ? '#1E1C1A' : '#E4DED2'
  const bodyInk    = pol === 'paper' ? '#F1EDE6' : '#131211'
  const bodyDim    = pol === 'paper' ? 'rgba(241,237,230,.45)' : 'rgba(19,18,17,.45)'
  const bodyBorder = pol === 'paper' ? 'rgba(241,237,230,.15)' : 'rgba(19,18,17,.15)'
  const windowBg   = pol === 'paper' ? 'rgba(0,0,0,.45)' : 'rgba(19,18,17,.12)'

  const trackLabel = trackTitle ? `КИШЛАК — ${trackTitle.toUpperCase()}` : 'КИШЛАК'

  return (
    <button
      onClick={onTap}
      aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      className="relative w-full select-none flex flex-col"
      style={{
        aspectRatio: '1.55',
        borderRadius: 10,
        background: bodyBg,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 19px)`,
        border: `1px solid ${bodyBorder}`,
        padding: '10px 14px',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* 4 винта */}
      {(['top-2.5 left-2.5', 'top-2.5 right-2.5', 'bottom-2.5 left-2.5', 'bottom-2.5 right-2.5'] as const).map((cls, i) => (
        <div
          key={i}
          className={`absolute ${cls} rounded-full`}
          style={{ width: 5, height: 5, background: bodyDim }}
        />
      ))}

      {/* лейбл: название трека */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="font-mono uppercase truncate"
          style={{ fontSize: 8.5, letterSpacing: '0.16em', lineHeight: 1.3, color: bodyInk }}
        >
          {trackLabel}
        </span>
        <span
          className="font-mono uppercase shrink-0"
          style={{ fontSize: 8.5, letterSpacing: '0.16em', lineHeight: 1.3, color: bodyDim }}
        >
          №0341
        </span>
      </div>

      {/* окно с катушками — flex-1 растягивается между лейблом и нижней строкой */}
      <div
        className="relative flex items-center justify-center overflow-hidden my-2 flex-1"
        style={{
          borderRadius: 6,
          background: windowBg,
          border: `1px solid ${bodyBorder}`,
        }}
      >
        {/* левая катушка */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: REEL_SIZE, height: REEL_SIZE }}
        >
          <div className="absolute rounded-full" style={{ width: leftR * 2, height: leftR * 2, background: COPPER }} />
          <div ref={leftHubRef} className="absolute rounded-full" style={{ width: 20, height: 20, background: bodyBg }}>
            <Spokes color={bodyBg} />
          </div>
        </div>

        {/* лента */}
        <div style={{ flex: 1, height: 2, background: COPPER }} />

        {/* правая катушка */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: REEL_SIZE, height: REEL_SIZE }}
        >
          <div className="absolute rounded-full" style={{ width: rightR * 2, height: rightR * 2, background: COPPER }} />
          <div ref={rightHubRef} className="absolute rounded-full" style={{ width: 20, height: 20, background: bodyBg }}>
            <Spokes color={bodyBg} />
          </div>
        </div>
      </div>

      {/* нижняя подпись */}
      <div className="flex items-center justify-between">
        <span
          className="font-mono uppercase"
          style={{ fontSize: 8.5, letterSpacing: '0.16em', lineHeight: 1, color: bodyInk }}
        >
          СТОРОНА {side}
        </span>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 8.5, letterSpacing: '0.16em', lineHeight: 1, color: bodyDim }}
        >
          C-60 · {releaseYear ?? 2026}
        </span>
      </div>
    </button>
  )
}

function Spokes({ color }: { color: string }) {
  return (
    <>
      {[0, 60, 120].map((deg) => (
        <div key={deg} className="absolute inset-0 flex items-center justify-center">
          <div style={{ width: 2, height: 14, background: color, borderRadius: 1, transform: `rotate(${deg}deg)` }} />
        </div>
      ))}
    </>
  )
}
