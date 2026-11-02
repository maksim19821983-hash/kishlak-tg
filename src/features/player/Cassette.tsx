import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/audio/store'

const COPPER = '#8C5334'
const REEL_SIZE = 64
const TAPE_MIN = 9
const TAPE_MAX = 27
const DEG_PER_MS = 360 / 2000
const LABEL_INK = '#131211'
const LABEL_PAPER = '#EDE7DC'
const CATALOG = 'КШЛК-0341'

const TAPE_BY_TYPE: Record<string, string> = {
  album: 'C-60',
  ep: 'C-40',
  single: 'C-20',
}

function tapeRadius(progress: number, isLeft: boolean): number {
  const p = Math.max(0, Math.min(1, progress))
  return isLeft
    ? TAPE_MAX - p * (TAPE_MAX - TAPE_MIN)
    : TAPE_MIN + p * (TAPE_MAX - TAPE_MIN)
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function mix(hex: string, base: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const to = (a: number, b2: number): number => Math.round(a * amount + b2 * (1 - amount))
  return `rgb(${to(r, base[0])}, ${to(g, base[1])}, ${to(b, base[2])})`
}

type Props = {
  side: 'A' | 'B'
  onTap: () => void
  trackTitle?: string
  releaseTitle?: string
  releaseYear?: number
  releaseCover?: string
  releaseType?: 'album' | 'ep' | 'single'
  accent?: string
  series?: { index: number; total: number }
  polarity?: 'paper' | 'dark'
}

export function Cassette({
  side,
  onTap,
  releaseTitle,
  releaseYear,
  releaseCover,
  releaseType = 'single',
  accent = '#8C5334',
  series,
  polarity,
}: Props) {
  const playing = useAudioStore((s) => s.status === 'playing')
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration = useAudioStore((s) => s.duration)

  const progress = duration > 0 ? currentTime / duration : 0
  const leftR = tapeRadius(progress, true)
  const rightR = tapeRadius(progress, false)

  const leftHubRef = useRef<HTMLDivElement>(null)
  const rightHubRef = useRef<HTMLDivElement>(null)
  const angleRef = useRef(0)
  const lastTsRef = useRef<number | null>(null)
  const rafRef = useRef(0)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (reducedMotion.current) return
    function tick(ts: number): void {
      rafRef.current = requestAnimationFrame(tick)
      if (document.hidden || !playing) {
        lastTsRef.current = null
        return
      }
      if (lastTsRef.current === null) {
        lastTsRef.current = ts
        return
      }
      const delta = ts - lastTsRef.current
      lastTsRef.current = ts
      angleRef.current = (angleRef.current + DEG_PER_MS * delta) % 360
      const t = `rotate(${angleRef.current}deg)`
      if (leftHubRef.current) leftHubRef.current.style.transform = t
      if (rightHubRef.current) rightHubRef.current.style.transform = t
    }
    rafRef.current = requestAnimationFrame(tick)
    const onVisibility = (): void => {
      lastTsRef.current = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [playing])

  const pol = polarity ?? (document.documentElement.dataset.polarity as 'paper' | 'dark' | undefined) ?? 'paper'

  // пластик кассеты — в цвете альбома, но приглушённом, чтобы читались подписи
  const plastic = pol === 'paper' ? mix(accent, [30, 28, 26], 0.17) : mix(accent, [232, 226, 214], 0.09)
  const plasticInk = pol === 'paper' ? '#F1EDE6' : '#131211'
  const plasticDim = pol === 'paper' ? 'rgba(241,237,230,.45)' : 'rgba(19,18,17,.45)'
  const plasticBorder = pol === 'paper' ? 'rgba(255,255,255,.16)' : 'rgba(19,18,17,.16)'
  const windowBg = pol === 'paper' ? 'rgba(0,0,0,.55)' : 'rgba(19,18,17,.14)'
  const hubColor = pol === 'paper' ? '#0E0C0A' : '#EDE7DB'

  const tape = TAPE_BY_TYPE[releaseType] ?? 'C-60'
  const catNo = series ? `${CATALOG} · ${String(series.index).padStart(2, '0')}/${series.total}` : CATALOG

  return (
    <button
      onClick={onTap}
      aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      className="relative w-full select-none overflow-hidden text-left"
      style={{
        borderRadius: 10,
        background: plastic,
        border: `1px solid ${plasticBorder}`,
        boxShadow: '0 6px 16px rgba(0,0,0,.22)',
        padding: 12,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* винты */}
      {[
        { top: 6, left: 6 },
        { top: 6, right: 6 },
        { bottom: 6, left: 6 },
        { bottom: 6, right: 6 },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{ width: 4, height: 4, background: plasticDim, ...pos }}
        />
      ))}

      {/* бумажный лейбл с фотографией альбома */}
      <div
        className="relative flex items-start gap-2"
        style={{ background: LABEL_PAPER, borderRadius: 4, padding: 8, minHeight: 76 }}
      >
        {releaseCover !== undefined && (
          <img
            src={releaseCover}
            alt=""
            aria-hidden
            draggable={false}
            style={{ width: 58, height: 58, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className="font-display uppercase"
            style={{ fontSize: 15, lineHeight: 1.1, color: LABEL_INK, letterSpacing: '-.01em' }}
          >
            КИШЛАК
          </p>
          <p className="font-mono uppercase truncate" style={{ fontSize: 8, letterSpacing: '.16em', color: 'rgba(19,18,17,.62)', marginTop: 4 }}>
            {catNo}
          </p>
          <p className="font-mono uppercase truncate" style={{ fontSize: 8, letterSpacing: '.14em', color: 'rgba(19,18,17,.62)' }}>
            {releaseTitle ? `${releaseTitle} · ${tape} · ${releaseYear ?? '—'}` : `${tape} · СТОРОНА ${side}`}
          </p>
        </div>

        {/* круглая печать */}
        <div
          className="shrink-0 flex flex-col items-center justify-center rounded-full"
          style={{
            width: 38,
            height: 38,
            border: '1.5px solid rgba(146,70,58,.75)',
            color: 'rgba(146,70,58,.85)',
          }}
        >
          <span className="font-mono" style={{ fontSize: 6.5, letterSpacing: '.14em', lineHeight: 1.2 }}>РОСТОВ</span>
          <span className="font-mono" style={{ fontSize: 6, letterSpacing: '.14em', lineHeight: 1.2 }}>АПФС</span>
        </div>
      </div>

      {/* окно катушек */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          height: 74,
          marginTop: 8,
          borderRadius: 5,
          background: windowBg,
          border: `1px solid ${plasticBorder}`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,.5)',
          paddingLeft: 14,
          paddingRight: 14,
        }}
      >
        <div className="relative flex items-center justify-center" style={{ width: REEL_SIZE, height: REEL_SIZE }}>
          <div className="absolute rounded-full" style={{ width: leftR * 2, height: leftR * 2, background: COPPER }} />
          <div ref={leftHubRef} className="absolute rounded-full" style={{ width: 14, height: 14, background: hubColor }}>
            <Spokes color={plastic} />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            height: 2,
            background: COPPER,
            marginLeft: leftR - REEL_SIZE / 2,
            marginRight: rightR - REEL_SIZE / 2,
          }}
        />

        <div className="relative flex items-center justify-center" style={{ width: REEL_SIZE, height: REEL_SIZE }}>
          <div className="absolute rounded-full" style={{ width: rightR * 2, height: rightR * 2, background: COPPER }} />
          <div ref={rightHubRef} className="absolute rounded-full" style={{ width: 14, height: 14, background: hubColor }}>
            <Spokes color={plastic} />
          </div>
        </div>
      </div>

      {/* хронология серии */}
      <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: Math.min(series?.total ?? 12, 40) }).map((_, i) => {
            const active = series ? i + 1 === series.index : false
            return (
              <span
                key={i}
                style={{
                  width: 2,
                  height: active ? 10 : 5,
                  background: active ? plasticInk : plasticDim,
                  borderRadius: 1,
                }}
              />
            )
          })}
        </div>
        <span className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: '.16em', color: plasticDim }}>
          СТОРОНА {side}
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
          <div style={{ width: 2, height: 10, background: color, borderRadius: 1, transform: `rotate(${deg}deg)` }} />
        </div>
      ))}
    </>
  )
}
