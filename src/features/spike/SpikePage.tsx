import { useEffect, useState } from 'react'
import { useTelegramStatus } from '@/app/telegram'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

type MsMode = 'tracks' | 'withSeek' | 'all' | 'none'

const MS_ACTIONS = [
  'play', 'pause', 'previoustrack', 'nexttrack',
  'seekto', 'seekbackward', 'seekforward',
] as const

export function SpikePage() {
  const tgStatus = useTelegramStatus()
  const status    = useAudioStore((s) => s.status)
  const track     = useAudioStore((s) => s.track)
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration  = useAudioStore((s) => s.duration)
  const toggle    = useAudioStore((s) => s.toggle)
  const next      = useAudioStore((s) => s.next)
  const seek      = useAudioStore((s) => s.seek)
  const load      = useAudioStore((s) => s.load)

  const playing = status === 'playing'
  const [loadError, setLoadError] = useState<string | null>(null)
  const [catalogState, setCatalogState] = useState('…')
  const [msMode, setMsMode] = useState<MsMode>('tracks')
  const [msLog, setMsLog] = useState<string[]>([])
  const prev = useAudioStore((s) => s.prev)

  // Эксперимент: перерегистрируем обработчики Media Session под выбранный режим.
  // Нужно, чтобы понять, какие именно действия заставляют iOS заменить ⏮⏭ на ±10.
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      setMsLog(['mediaSession недоступен'])
      return
    }
    const ms = navigator.mediaSession
    const log: string[] = []

    for (const action of MS_ACTIONS) {
      try { ms.setActionHandler(action, null) } catch { /* не поддерживается */ }
    }

    const reg = (action: MediaSessionAction, handler: MediaSessionActionHandler): void => {
      try {
        ms.setActionHandler(action, handler)
        log.push(`${action}: ok`)
      } catch (err) {
        log.push(`${action}: ERROR ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (msMode !== 'none') {
      reg('play', () => toggle())
      reg('pause', () => toggle())
      reg('previoustrack', () => prev())
      reg('nexttrack', () => next())
    }
    if (msMode === 'withSeek' || msMode === 'all') {
      reg('seekto', (d) => { if (typeof d.seekTime === 'number') seek(d.seekTime) })
    }
    if (msMode === 'all') {
      reg('seekbackward', (d) => seek(Math.max(0, currentTime - (d.seekOffset ?? 10))))
      reg('seekforward', (d) => seek(currentTime + (d.seekOffset ?? 10)))
    }

    setMsLog(log)
  }, [msMode, toggle, prev, next, seek, currentTime])

  // Загружаем треки из каталога при маунте
  useEffect(() => {
    CatalogRepo.load()
      .then((catalog) => {
        const tracks = catalog.releases.flatMap((r) => r.tracks)
        setCatalogState(`ok: ${tracks.length} треков`)
        if (tracks.length === 0) setLoadError('в манифесте нет треков')
        load(tracks, 0)
      })
      .catch((err: unknown) => {
        setCatalogState('ошибка')
        setLoadError(err instanceof Error ? err.message : String(err))
      })
  }, [load])

  return (
    <div className="p-6 font-mono">
      <p className="font-display text-h1 uppercase mb-6">Спайк</p>

      <span
        className={`inline-block px-2 py-1 text-mono-label uppercase mb-6 ${
          tgStatus === 'ready'
            ? 'bg-[var(--accent)] text-[var(--bg-base)]'
            : 'border border-line text-dim'
        }`}
      >
        {tgStatus === 'ready' ? 'tg: ok' : tgStatus === 'loading' ? 'tg: …' : 'tg: браузер'}
      </span>

      <p className="mb-2 text-mono-num text-dim">каталог: {catalogState}</p>

      {loadError !== null && (
        <p className="mb-4 text-mono-num text-[var(--accent-text)]">ошибка: {loadError}</p>
      )}

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

      <div className="mt-8 border-t border-line pt-4">
        <p className="text-mono-label uppercase text-dim mb-2">media session</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(['tracks', 'withSeek', 'all', 'none'] as MsMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setMsMode(mode)}
              className={`font-mono text-mono-label uppercase border px-3 py-2 min-h-[44px] ${
                msMode === mode ? 'border-ink text-ink' : 'border-line text-dim'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <ul className="text-mono-num">
          {msLog.map((line) => (
            <li key={line} className="text-dim">{line}</li>
          ))}
        </ul>
      </div>

      <div className="flex gap-4 mt-6">
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
