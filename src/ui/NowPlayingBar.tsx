import { useAudioStore } from '@/audio/store'
import { IconPlay, IconPause, IconPrev, IconNext } from '@/ui/icons'
import { haptic } from '@/app/telegram'

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

  if (!track || (status !== 'playing' && status !== 'paused')) return null

  return (
    <div className="flex items-center gap-1 px-screen border-b border-line" style={{ minHeight: 44 }}>
      {/* тап по левой части — открыть плеер */}
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 flex items-center gap-2 py-2 text-left"
        aria-label="Открыть плеер"
      >
        <span className="font-mono text-mono-label shrink-0" style={{ color: 'var(--accent)' }}>●</span>
        <span className="font-display text-body-strong truncate text-ink">{track.title}</span>
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
  )
}
