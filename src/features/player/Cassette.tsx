import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/audio/store'
import { Motif } from '@/ui/Motifs'

const COPPER    = '#8C5334'
const TAPE_HI   = '#C08A5E'
const TAPE_LO   = '#5E3722'
const TAPE_SHADOW = '#3B2216'
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
  releaseTitle?: string
  releaseYear?: number
  motif?: string
  motifColor?: string
  polarity?: 'paper' | 'dark'
}

export function Cassette({ side, onTap, trackTitle, releaseTitle, releaseYear, motif, motifColor, polarity }: Props) {
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

  const tint       = (document.documentElement.style.getPropertyValue('--cassette-tint') || '').trim()
  const bodyBg     = tint !== '' ? tint : (pol === 'paper' ? '#1E1C1A' : '#E4DED2')
  const bodyInk    = pol === 'paper' ? '#F1EDE6' : '#131211'
  const bodyDim    = pol === 'paper' ? 'rgba(241,237,230,.45)' : 'rgba(19,18,17,.45)'
  const bodyBorder = pol === 'paper' ? 'rgba(241,237,230,.15)' : 'rgba(19,18,17,.15)'
  const windowBg   = pol === 'paper' ? 'rgba(0,0,0,.45)'       : 'rgba(19,18,17,.12)'
  const hubColor   = pol === 'paper' ? '#0E0C0A'               : '#EDE7DB'

  return (
    <button
      onClick={onTap}
      aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      className="relative w-full select-none overflow-hidden text-left"
      style={{
        borderRadius: 10,
        background: bodyBg,
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

      {/* верхняя строка: артист слева, номер справа */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center" style={{ gap: 6 }}>
          <Motif name={motif} size={17} color={motifColor ?? bodyInk} />
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', lineHeight: 1.3, color: bodyInk }}
          >
            КИШЛАК
          </span>
        </span>
        <span
          className="font-mono uppercase shrink-0"
          style={{ fontSize: 9, letterSpacing: '0.18em', lineHeight: 1.3, color: bodyDim }}
        >
          №0341
        </span>
      </div>

      {/* название трека */}
      <p
        className="font-mono uppercase"
        style={{
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: '0.04em',
          lineHeight: 1.2,
          color: bodyInk,
          marginTop: 8,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {trackTitle ?? '—'}
      </p>

      {/* окно с катушками */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          height: 78,
          marginTop: 10,
          borderRadius: 6,
          background: windowBg,
          border: `1px solid ${bodyBorder}`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,.5)',
        }}
      >
        {/* левая катушка — лента намотана по прогрессу */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: REEL_SIZE, height: REEL_SIZE }}
        >
          <Reel radius={leftR} hubColor={hubColor} bodyColor={bodyBg} hubRef={leftHubRef} />
        </div>

        {/* лента между катушками */}
        <div style={{
          flex: 1,
          height: 3,
          borderRadius: 2,
          background: `linear-gradient(180deg, ${TAPE_HI} 0%, ${TAPE_LO} 55%, ${TAPE_SHADOW} 100%)`,
          marginLeft: leftR - REEL_SIZE / 2,
          marginRight: rightR - REEL_SIZE / 2,
          boxShadow: '0 1px 1px rgba(0,0,0,.35)',
        }} />

        {/* правая катушка */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: REEL_SIZE, height: REEL_SIZE }}
        >
          <Reel radius={rightR} hubColor={hubColor} bodyColor={bodyBg} hubRef={rightHubRef} />
        </div>

        {/* стекло: мягкий блик сверху */}
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-md"
          style={{
            inset: 0,
            background: 'linear-gradient(160deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.03) 22%, transparent 45%)',
          }}
        />
      </div>

      {/* вторичный цвет обложки: тонкая линия под подписями */}
      {motifColor !== undefined && (
        <div
          aria-hidden
          style={{
            height: 2,
            marginTop: 8,
            marginBottom: -2,
            borderRadius: 1,
            background: motifColor,
            opacity: 0.85,
          }}
        />
      )}

      {/* нижняя строка: релиз · год слева, C-60 справа */}
      <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
        <span
          className="font-mono uppercase truncate"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1, color: bodyInk }}
        >
          {releaseTitle ? `${releaseTitle} · ${releaseYear ?? '—'}` : `СТОРОНА ${side}`}
        </span>
        <span
          className="font-mono uppercase shrink-0"
          style={{ fontSize: 10, letterSpacing: '0.14em', lineHeight: 1, color: bodyDim, marginLeft: 8 }}
        >
          C-60
        </span>
      </div>
    </button>
  )
}

/** Катушка: намотанная лента с кольцами, ступица с зубцами и блик. */
function Reel({
  radius,
  hubColor,
  bodyColor,
  hubRef,
}: {
  radius: number
  hubColor: string
  bodyColor: string
  hubRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <>
      {/* слой ленты */}
      <div
        className="absolute rounded-full"
        style={{
          width: radius * 2,
          height: radius * 2,
          background: `radial-gradient(circle at 34% 28%, ${TAPE_HI} 0%, ${COPPER} 46%, ${TAPE_LO} 100%)`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,.45), inset 0 -2px 4px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.35)',
        }}
      />

      {/* кольца намотки */}
      <div
        className="absolute rounded-full"
        style={{
          width: radius * 2,
          height: radius * 2,
          background:
            'repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,.13) 0 1.5px, rgba(255,255,255,.04) 1.5px 3px)',
          opacity: 0.6,
        }}
      />

      {/* блик по ленте */}
      <div
        className="absolute rounded-full"
        style={{
          width: radius * 2,
          height: radius * 2,
          background: 'linear-gradient(145deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,.04) 35%, transparent 55%)',
        }}
      />

      {/* ступица с зубцами — вращается */}
      <div
        ref={hubRef}
        className="absolute rounded-full"
        style={{
          width: 18,
          height: 18,
          background: `radial-gradient(circle at 40% 35%, ${hubColor} 0%, ${hubColor} 55%, rgba(0,0,0,.55) 100%)`,
          boxShadow: '0 0 0 1px rgba(0,0,0,.35), inset 0 1px 2px rgba(255,255,255,.35)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Spokes color={bodyColor} />
        <div
          className="rounded-full"
          style={{ width: 6, height: 6, background: bodyColor, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.6)' }}
        />
      </div>
    </>
  )
}

function Spokes({ color }: { color: string }) {
  return (
    <>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <div key={deg} className="absolute inset-0 flex items-center justify-center">
          <div style={{ width: 2, height: 12, background: color, borderRadius: 1, transform: `rotate(${deg}deg)` }} />
        </div>
      ))}
    </>
  )
}
