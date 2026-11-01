import { useAudioStore } from '@/audio/store'
import { IconPlay, IconPause } from '@/ui/icons'

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

type Props = { onOpen: () => void }

export function NowPlayingBar({ onOpen }: Props) {
  const track       = useAudioStore((s) => s.track)
  const status      = useAudioStore((s) => s.status)
  const currentTime = useAudioStore((s) => s.currentTime)
  const toggle      = useAudioStore((s) => s.toggle)
  const playing     = status === 'playing'

  if (!track || (status !== 'playing' && status !== 'paused')) return null

  return (
    <div
      className="flex items-center gap-2 px-screen border-b border-line shrink-0"
      style={{ height: 40 }}
    >
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 flex items-center gap-2 min-h-[44px] text-left"
        aria-label="Открыть плеер"
      >
        <span className="font-mono text-mono-label shrink-0" style={{ color: 'var(--accent)' }}>●</span>
        <span className="font-display text-body-strong truncate text-ink">{track.title}</span>
        <span className="font-mono text-mono-num text-dim shrink-0 tabular-nums">{fmt(currentTime)}</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); toggle() }}
        className="shrink-0 flex items-center justify-center text-ink"
        style={{ width: 44, height: 44 }}
        aria-label={playing ? 'Пауза' : 'Продолжить'}
      >
        {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
      </button>
    </div>
  )
}
