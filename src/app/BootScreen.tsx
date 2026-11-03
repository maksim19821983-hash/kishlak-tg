import { Grain } from '@/ui/Grain'

/**
 * Загрузочный экран: логотип 11:11 заливается цветом снизу вверх
 * по мере загрузки архива. progress — 0..1.
 */
export function BootScreen({ done, progress }: { done: boolean; progress: number }) {
  const pct = Math.max(0, Math.min(1, progress))
  const fillInset = `${(1 - pct) * 100}%`

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
        {/* логотип: серый слой + цветной поверх, обрезанный снизу вверх */}
        <div className="relative select-none" style={{ lineHeight: 0.9 }}>
          <span
            className="font-display uppercase block"
            style={{ fontSize: 76, letterSpacing: '-.04em', color: 'var(--line)' }}
            aria-hidden
          >
            11:11
          </span>

          <span
            className="font-display uppercase absolute inset-0 block"
            style={{
              fontSize: 76,
              letterSpacing: '-.04em',
              backgroundImage: 'linear-gradient(to top, var(--accent) 0%, var(--accent-text) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              clipPath: `inset(${fillInset} 0 0 0)`,
              transition: 'clip-path 600ms cubic-bezier(.22,.8,.28,1)',
            }}
          >
            11:11
          </span>
        </div>

        <div
          className="flex items-center justify-between"
          style={{ width: 232, marginTop: 26 }}
        >
          <span className="font-mono uppercase text-dim" style={{ fontSize: 9, letterSpacing: '.2em' }}>
            Загружаю архив
          </span>
          <span className="font-mono tabular-nums text-dim" style={{ fontSize: 9, letterSpacing: '.1em' }}>
            {Math.round(pct * 100)}%
          </span>
        </div>

        {/* тонкая шкала под логотипом */}
        <div style={{ width: 232, height: 1, background: 'var(--line)', marginTop: 8, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: '0 auto 0 0',
              width: `${pct * 100}%`,
              background: 'var(--accent)',
              transition: 'width 600ms cubic-bezier(.22,.8,.28,1)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
