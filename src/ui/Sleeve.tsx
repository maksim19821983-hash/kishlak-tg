import type { Release } from '@/data/types'

type Props = {
  release: Release
  progress: number // 0..1
  listenedCount: number
  onClick: () => void
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Sleeve({ release, progress, listenedCount, onClick }: Props) {
  const p = Math.max(0, Math.min(1, progress))
  const totalDuration = release.tracks.reduce((a, t) => a + t.duration, 0)

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onClick}
        className="relative w-full aspect-square rounded-sleeve overflow-hidden border border-line min-h-[44px]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label={`${release.title}, открыть кадр релиза`}
      >
        {/* серая подложка */}
        <img
          src={release.cover}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'grayscale(1)' }}
          draggable={false}
        />

        {/* цветная копия: открывается снизу по прогрессу */}
        {p > 0 && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(${(1 - p) * 100}% 0 0 0)` }}
          >
            <img
              src={release.cover}
              alt={release.title}
              className="w-full h-full object-cover"
              style={{ filter: `saturate(${0.2 + 0.8 * p})` }}
              draggable={false}
            />
          </div>
        )}

        {/* штамп при p=1 */}
        {p >= 1 && (
          <div
            className="absolute top-2 right-2 w-[30px] h-[30px] rounded-sleeve flex items-center justify-center font-mono text-mono-label"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            aria-label="Релиз собран"
          >
            ✓
          </div>
        )}
      </button>

      <div>
        <p className="font-display text-body-strong line-clamp-2 text-ink">{release.title}</p>
        <p className="font-mono text-mono-num text-dim">
          {release.year} · {listenedCount}/{release.tracks.length} · {fmt(totalDuration)}
        </p>
      </div>
    </div>
  )
}

export function SleeveSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="w-full aspect-square rounded-sleeve bg-surface animate-pulse" />
      <div className="h-3 w-3/4 rounded bg-surface animate-pulse" />
      <div className="h-2.5 w-1/2 rounded bg-surface animate-pulse" />
    </div>
  )
}
