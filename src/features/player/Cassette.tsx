import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/audio/store'

const COPPER    = '#8C5334'
const REEL_SIZE = 72
const TAPE_MIN  = 10
const TAPE_MAX  = 30
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

  const leftHubRef    = useRef<HTMLDivElement>(null)
  const rightHubRef   = useRef<HTMLDivElement>(null)
  const angleRef      = useRef(0)
  const lastTsRef     = useRef<number | null>(null)
  const rafRef        = useRef(0)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (reducedMotion.current) return
    function tick(ts: number) {
      rafRef.current = requestAnimationFrame(tick)
      if (document.hidden || !playing) { lastTsRef.current = null; return }
      if (lastTsRef.current === null)  { lastTsRef.current = ts; return }
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
  const windowBg   = pol === 'paper' ? 'rgba(0,0,0,.45)'       : 'rgba(19,18,17,.12)'
  const hubColor   = pol === 'paper' ? '#0E0C0A'               : '#EDE7DB'

  const trackLabel = trackTitle ? `КИШЛАК — ${trackTitle.toUpperCase()}` : 'КИШЛАК'

  return (
    <button
      onClick={onTap}
      aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      className="relative w-full select-none overflow-hidden"
      style={{
        borderRadius: 10,
        background: bodyBg,
        // блик 1 px по верхней кромке
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.08), 0 6px 16px rgba(0,0,0,.22)`,
        border: `1px solid ${bodyBorder}`,
        padding: '14px 16px',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* 4 винта — 8 px от углов */}
      {[
        { top: 8, left: 8 },
        { top: 8, right: 8 },
        { bottom: 8, left: 8 },
        { bottom: 8, right: 8 },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{ width: 5, height: 5, background: bodyDim, ...pos }}
        />
      ))}

      {/* лейбл */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="font-mono uppercase truncate"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', lineHeight: 1.3, color: bodyInk }}
        >
          {trackLabel}
        </span>
        <span
          className="font-mono uppercase shrink-0"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', lineHeight: 1.3, color: bodyDim }}
        >
          №0341
        </span>
      </div>

      {/* окно с катушками */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          height: 92,
          marginTop: 10,
          borderRadius: 6,
          background: windowBg,
          border: `1px solid ${bodyBorder}`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,.5)',
        }}
      >
        {/* левая катушка — диск ленты по прогрессу */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: REEL_SIZE, height: REEL_SIZE }}
        >
          <div
            className="absolute rounded-full"
            style={{ width: leftR * 2, height: leftR * 2, background: COPPER }}
          />
          <div
            ref={leftHubRef}
            className="absolute rounded-full"
            style={{ width: 16, height: 16, background: hubColor }}
          >
            <Spokes color={bodyBg} />
          </div>
        </div>

        {/* лента */}
        <div style={{ flex: 1, height: 2, background: COPPER }} />

        {/* правая катушка — диск ленты по прогрессу */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: REEL_SIZE, height: REEL_SIZE }}
        >
          <div
            className="absolute rounded-full"
            style={{ width: rightR * 2, height: rightR * 2, background: COPPER }}
          />
          <div
            ref={rightHubRef}
            className="absolute rounded-full"
            style={{ width: 16, height: 16, background: hubColor }}
          >
            <Spokes color={bodyBg} />
          </div>
        </div>
      </div>

      {/* нижняя подпись */}
      <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', lineHeight: 1, color: bodyInk }}
        >
          СТОРОНА {side}
        </span>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', lineHeight: 1, color: bodyDim }}
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
          <div style={{ width: 2, height: 12, background: color, borderRadius: 1, transform: `rotate(${deg}deg)` }} />
        </div>
      ))}
    </>
  )
}
