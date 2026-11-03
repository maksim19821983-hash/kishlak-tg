import { Grain } from '@/ui/Grain'
import { Logo1111 } from '@/ui/Logo1111'

/**
 * Загрузочный экран: рисованный логотип 11:11 заливается цветом снизу вверх
 * по мере загрузки архива. progress — 0..1.
 */
export function BootScreen({ done, progress }: { done: boolean; progress: number }) {
  const pct = Math.max(0, Math.min(1, progress))

  return (
    <div
      className="fixed inset-0 z-[60] bg-bg flex flex-col items-center justify-center"
      style={{
        opacity: done ? 0 : 1,
        pointerEvents: done ? 'none' : 'auto',
        transition: 'opacity 420ms ease',
      }}
      aria-hidden={done}
    >
      <Grain />

      <div className="relative flex flex-col items-center">
        <div className="relative" style={{ height: 132 }}>
          {/* серый контур: видно всегда */}
          <div style={{ position: 'relative', zIndex: 1, filter: 'grayscale(1) contrast(.85) opacity(.55)' }}>
            <Logo1111 height={132} />
          </div>

          {/* цветной слой: обрезан по прогрессу, снизу вверх */}
          <div
            className="absolute inset-0"
            style={{
              zIndex: 2,
              clipPath: `inset(${(1 - pct) * 100}% 0 0 0)`,
              transition: 'clip-path 620ms cubic-bezier(.22,.8,.28,1)',
            }}
          >
            <Logo1111 height={132} />
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ width: 232, marginTop: 26 }}>
          <span className="font-mono uppercase text-dim" style={{ fontSize: 9, letterSpacing: '.2em' }}>
            Загружаю архив
          </span>
          <span className="font-mono tabular-nums text-dim" style={{ fontSize: 9, letterSpacing: '.1em' }}>
            {Math.round(pct * 100)}%
          </span>
        </div>

        <div style={{ width: 232, height: 1, background: 'var(--line)', marginTop: 8, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: '0 auto 0 0',
              width: `${pct * 100}%`,
              background: 'var(--accent)',
              transition: 'width 620ms cubic-bezier(.22,.8,.28,1)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
