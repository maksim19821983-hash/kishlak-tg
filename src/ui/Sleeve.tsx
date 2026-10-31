import type { Release } from '@/data/types'

type Props = {
  release: Release
  progress: number // 0..1
  listenedCount: number
  onClick: () => void
  onPlay?: () => void
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Sleeve({ release, progress, listenedCount, onClick, onPlay }: Props) {
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
        {/* базовый слой: при p=0 saturate(0.3) — узнаваем, к p=1 уходит в серый под цветной копией */}
        <img
          src={release.cover}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: `saturate(${0.3 * (1 - p)})` }}
          draggable={false}
        />

        {/* цветная копия: открывается снизу по прогрессу; saturate(.3) при p=0 — узнаваема */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(${(1 - p) * 100}% 0 0 0)` }}
        >
          <img
            src={release.cover}
            alt={release.title}
            className="w-full h-full object-cover"
            style={{ filter: `saturate(${0.3 + 0.7 * p})` }}
            draggable={false}
          />
        </div>

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
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-body-strong line-clamp-2 text-ink flex-1">{release.title}</p>
          {onPlay && (
            <button
              onClick={(e) => { e.stopPropagation(); onPlay() }}
              className="shrink-0 flex items-center justify-center border border-line rounded-full text-ink"
              style={{ width: 44, height: 44, fontSize: 14 }}
              aria-label={`Слушать ${release.title}`}
            >
              ▶
            </button>
          )}
        </div>
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
