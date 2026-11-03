import { Grain } from '@/ui/Grain'

/** Загрузочный экран: кассета наматывает ленту, пока грузится архив. */
export function BootScreen({ done }: { done: boolean }) {
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

      <div className="relative" style={{ width: 260 }}>
        <p
          className="font-mono uppercase text-dim"
          style={{ fontSize: 9.5, letterSpacing: '.22em', marginBottom: 10 }}
        >
          Кишлак · архив
        </p>

        {/* корпус */}
        <div
          className="relative"
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: 12,
            background: 'var(--surface)',
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className="rounded-full border"
              style={{ width: 56, height: 56, borderColor: 'var(--accent)', animation: 'boot-reel 2.6s linear infinite' }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <div className="rounded-full" style={{ width: 10, height: 10, background: 'var(--accent)' }} />
              </div>
            </div>

            <div className="flex-1 mx-3 relative" style={{ height: 12 }}>
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: 1, background: 'var(--line)' }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0"
                style={{ height: 2, background: 'var(--accent)', animation: 'boot-tape 1.8s ease-in-out infinite' }}
              />
            </div>

            <div
              className="rounded-full border"
              style={{ width: 40, height: 40, borderColor: 'var(--accent)', animation: 'boot-reel 1.8s linear infinite reverse' }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <div className="rounded-full" style={{ width: 8, height: 8, background: 'var(--accent)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
          <span className="font-mono uppercase text-dim" style={{ fontSize: 9, letterSpacing: '.18em' }}>
            Загружаю архив
          </span>
          <span className="flex items-center" style={{ gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="lyric-dot"
                style={{ animationDelay: `${i * 140}ms`, background: 'var(--accent)', width: 6, height: 6 }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
