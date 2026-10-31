import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/audio/store'

const COPPER = '#8C5334'
const REEL_SIZE = 72   // px, total container
const TAPE_MIN = 10    // px, radius of empty disc
const TAPE_MAX = 30    // px, radius of full disc
const DEG_PER_MS = 360 / 2000 // 360° / 2 s

function tapeRadius(progress: number, isLeft: boolean): number {
  const p = Math.max(0, Math.min(1, progress))
  // левая катушка: начинает полной (p=0 → TAPE_MAX), правая: начинает пустой
  return isLeft
    ? TAPE_MAX - p * (TAPE_MAX - TAPE_MIN)
    : TAPE_MIN + p * (TAPE_MAX - TAPE_MIN)
}

type Props = {
  side: 'A' | 'B'
  onTap: () => void
  releaseTitle?: string
  polarity?: 'paper' | 'dark'
}

export function Cassette({ side, onTap, releaseTitle, polarity }: Props) {
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
  const bodyBg = pol === 'paper' ? '#1E1C1A' : '#E4DED2'
  const windowBg = pol === 'paper' ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.15)'
  const releaseLabel = releaseTitle ? `КИШЛАК — ${releaseTitle.toUpperCase()}` : 'КИШЛАК'

  return (
    <button
      onClick={onTap}
      aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      className="relative w-full select-none"
      style={{
        aspectRatio: '1.44',
        borderRadius: 10,
        background: bodyBg,
        boxShadow: 'var(--shadow-cassette)',
        padding: '14px 16px',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* 4 винта */}
      {[['top-3 left-3'], ['top-3 right-3'], ['bottom-3 left-3'], ['bottom-3 right-3']].map(([cls], i) => (
        <div
          key={i}
          className={`absolute ${cls} rounded-full border border-line`}
          style={{ width: 5, height: 5, background: 'var(--bg)' }}
        />
      ))}

      {/* лейбл сверху */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono uppercase text-ink"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', lineHeight: 1 }}
        >
          {releaseLabel}
        </span>
        <span
          className="font-mono uppercase text-dim"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', lineHeight: 1 }}
        >
          №0341
        </span>
      </div>

      {/* окно с катушками */}
      <div
        className="relative flex items-center justify-center gap-0 overflow-hidden border border-line"
        style={{
          height: 92,
          borderRadius: 6,
          background: windowBg,
        }}
      >
        {/* левая катушка */}
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
            style={{ width: 20, height: 20, background: 'var(--bg)' }}
          >
            <Spokes />
          </div>
        </div>

        {/* лента */}
        <div
          style={{ width: 'calc(100% - 160px)', height: 2, background: COPPER, flexShrink: 0 }}
        />

        {/* правая катушка */}
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
            style={{ width: 20, height: 20, background: 'var(--bg)' }}
          >
            <Spokes />
          </div>
        </div>
      </div>

      {/* нижняя подпись */}
      <div className="flex items-center justify-between mt-2">
        <span
          className="font-mono uppercase text-ink"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', lineHeight: 1 }}
        >
          СТОРОНА {side}
        </span>
        <span
          className="font-mono uppercase text-dim"
          style={{ fontSize: 8.5, letterSpacing: '0.18em', lineHeight: 1 }}
        >
          C-60 · 2026
        </span>
      </div>
    </button>
  )
}

function Spokes() {
  return (
    <>
      {[0, 60, 120].map((deg) => (
        <div
          key={deg}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            style={{
              width: 1.5,
              height: 14,
              background: 'var(--surface)',
              borderRadius: 1,
              transform: `rotate(${deg}deg)`,
            }}
          />
        </div>
      ))}
    </>
  )
}
