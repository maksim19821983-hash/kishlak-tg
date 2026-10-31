import { useEffect } from 'react'
import { safeTelegram } from '@/app/telegram'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

const isTg = safeTelegram() !== null

export function SpikePage() {
  const status    = useAudioStore((s) => s.status)
  const track     = useAudioStore((s) => s.track)
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration  = useAudioStore((s) => s.duration)
  const toggle    = useAudioStore((s) => s.toggle)
  const next      = useAudioStore((s) => s.next)
  const seek      = useAudioStore((s) => s.seek)
  const load      = useAudioStore((s) => s.load)

  const playing = status === 'playing'

  // Загружаем треки из каталога при маунте
  useEffect(() => {
    CatalogRepo.load().then((catalog) => {
      const tracks = catalog.releases.flatMap((r) => r.tracks)
      load(tracks, 0)
    }).catch(() => {})
  }, [load])

  return (
    <div className="p-6 font-mono">
      <p className="font-display text-h1 uppercase mb-6">Спайк</p>

      <span
        className={`inline-block px-2 py-1 text-mono-label uppercase mb-6 ${
          isTg
            ? 'bg-[var(--accent)] text-[var(--bg-base)]'
            : 'border border-line text-dim'
        }`}
      >
        {isTg ? 'tg: ok' : 'tg: браузер'}
      </span>

      <div className="mb-2">
        <p className="text-mono-label uppercase text-dim">сейчас</p>
        <p className="font-display text-body-strong">{track?.title ?? '—'}</p>
        <p className="text-mono-label uppercase text-dim mt-1">{status}</p>
      </div>

      <p className="text-mono-num tabular-nums mb-4">
        {fmt(currentTime)} / {duration > 0 ? fmt(duration) : '--:--'}
      </p>

      <input
        type="range"
        min={0}
        max={duration > 0 ? duration : 0}
        step={0.5}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
        className="w-full mb-6 min-h-[44px]"
        style={{ accentColor: 'var(--accent)' }}
      />

      <div className="flex gap-4">
        <button
          onClick={() => toggle()}
          className="font-mono text-mono-label uppercase border border-line px-4 py-2 min-h-[44px]"
        >
          {playing ? 'pause' : 'play'}
        </button>
        <button
          onClick={() => next('user')}
          className="font-mono text-mono-label uppercase border border-line px-4 py-2 min-h-[44px]"
        >
          следующий
        </button>
      </div>
    </div>
  )
}
