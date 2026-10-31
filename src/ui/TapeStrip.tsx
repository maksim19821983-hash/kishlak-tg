import { useAudioStore } from '@/audio/store'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

type Props = { onOpen: () => void }

export function TapeStrip({ onOpen }: Props) {
  const track       = useAudioStore((s) => s.track)
  const status      = useAudioStore((s) => s.status)
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration    = useAudioStore((s) => s.duration)
  const toggle      = useAudioStore((s) => s.toggle)

  const playing = status === 'playing'
  const progress = duration > 0 ? currentTime / duration : 0

  if (!track || (status === 'idle')) return null

  return (
    <div className="w-full shrink-0 border-t border-line bg-bg" style={{ height: 46 }}>
      {/* основная строка */}
      <div className="flex items-center gap-2 h-[44px] px-screen">
        {/* обложка-заглушка */}
        <div
          className="shrink-0 rounded-sm bg-surface border border-line overflow-hidden"
          style={{ width: 28, height: 28 }}
        />

        {/* текст */}
        <button
          onClick={onOpen}
          className="flex-1 min-w-0 text-left"
          aria-label="Открыть плеер"
        >
          <p
            className="font-display text-body-strong text-ink truncate"
            style={{ fontSize: 12, lineHeight: '16px' }}
          >
            {track.title}
          </p>
          <p
            className="font-mono text-dim truncate"
            style={{ fontSize: 8.5, letterSpacing: '0.03em', lineHeight: '12px' }}
          >
            КИШЛАК · {fmt(currentTime)} / {fmt(duration)}
          </p>
        </button>

        {/* пауза */}
        <button
          onClick={() => toggle()}
          className="shrink-0 w-10 h-10 flex items-center justify-center text-ink"
          aria-label={playing ? 'Пауза' : 'Воспроизвести'}
          style={{ fontSize: 18 }}
        >
          {playing ? '⏸' : '▶'}
        </button>
      </div>

      {/* линия прогресса 2 px */}
      <div className="w-full" style={{ height: 2, background: 'var(--line)', marginTop: -2 }}>
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'var(--accent)',
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  )
}
