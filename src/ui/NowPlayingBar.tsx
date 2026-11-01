import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/audio/store'
import { IconPlay, IconPause, IconPrev, IconNext } from '@/ui/icons'
import { haptic } from '@/app/telegram'

// компонент-скоупный keyframe; prefers-reduced-motion глушит анимацию
const MARQUEE_CSS = `
@keyframes npb-marquee {
  0%, 15%   { transform: translateX(0); }
  85%, 100% { transform: translateX(var(--npb-shift)); }
}
@media (prefers-reduced-motion: reduce) {
  .npb-marquee { animation: none !important; }
}
`

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

type Props = { onOpen: () => void }

export function NowPlayingBar({ onOpen }: Props) {
  const track       = useAudioStore((s) => s.track)
  const status      = useAudioStore((s) => s.status)
  const currentTime = useAudioStore((s) => s.currentTime)
  const toggle      = useAudioStore((s) => s.toggle)
  const nextFn      = useAudioStore((s) => s.next)
  const prevFn      = useAudioStore((s) => s.prev)
  const playing     = status === 'playing'

  const wrapRef  = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)

  // пересчитываем переполнение при смене трека
  useEffect(() => {
    const wrap  = wrapRef.current
    const title = titleRef.current
    if (!wrap || !title) { setShift(0); return }
    const ov = title.scrollWidth - wrap.clientWidth
    setShift(Math.max(0, ov))
  }, [track?.id])

  if (!track || (status !== 'playing' && status !== 'paused')) return null

  const animate = shift > 0

  return (
    <>
      <style>{MARQUEE_CSS}</style>
      <div className="flex items-center gap-1 px-screen border-b border-line" style={{ height: 40 }}>
        {/* тап по левой части — открыть плеер */}
        <button
          onClick={onOpen}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
          aria-label="Открыть плеер"
        >
          <span className="font-mono text-mono-label shrink-0" style={{ color: 'var(--accent)' }}>●</span>
          <div ref={wrapRef} className="flex-1 min-w-0 overflow-hidden">
            <span
              ref={titleRef}
              className={`font-display text-body-strong text-ink whitespace-nowrap inline-block${animate ? ' npb-marquee' : ''}`}
              style={animate ? ({
                '--npb-shift': `-${shift}px`,
                animation: 'npb-marquee 12s ease-in-out infinite',
              } as React.CSSProperties) : undefined}
            >
              {track.title}
            </span>
          </div>
          <span className="font-mono text-mono-num text-dim shrink-0 tabular-nums">{fmt(currentTime)}</span>
        </button>

        {/* транспорт */}
        <button
          onClick={() => { prevFn(); haptic('light') }}
          className="flex items-center justify-center text-ink shrink-0"
          style={{ width: 36, height: 36 }}
          aria-label="Предыдущий трек"
        >
          <IconPrev size={16} />
        </button>
        <button
          onClick={() => { toggle(); haptic('light') }}
          className="flex items-center justify-center text-ink shrink-0"
          style={{ width: 36, height: 36 }}
          aria-label={playing ? 'Пауза' : 'Продолжить'}
        >
          {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
        </button>
        <button
          onClick={() => { nextFn('user'); haptic('light') }}
          className="flex items-center justify-center text-ink shrink-0"
          style={{ width: 36, height: 36 }}
          aria-label="Следующий трек"
        >
          <IconNext size={16} />
        </button>
      </div>
    </>
  )
}
