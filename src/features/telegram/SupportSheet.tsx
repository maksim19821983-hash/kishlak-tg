import { useState } from 'react'
import { openSupport } from './share'
import { haptic } from '@/app/telegram'

type Props = { onClose: () => void }

const AMOUNTS = [50, 100, 250] as const

export function SupportSheet({ onClose }: Props) {
  const [selected, setSelected] = useState<number>(100)

  const handleSupport = () => {
    openSupport()
    haptic('success')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full bg-bg"
        style={{
          borderRadius: '16px 16px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-screen pt-4 pb-2">
          {/* ручка */}
          <div
            className="mx-auto mb-4 rounded-full bg-line"
            style={{ width: 36, height: 4 }}
          />

          <h2 className="font-display text-h2 uppercase text-ink mb-1">
            Поддержать Кишлака
          </h2>
          <p className="font-mono text-mono-label uppercase text-dim mb-6">
            Звёзды уходят напрямую артисту
          </p>

          {/* выбор суммы */}
          <div className="flex gap-3 mb-6">
            {AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelected(amount)}
                className="flex-1 flex flex-col items-center justify-center py-3 font-mono"
                style={{
                  border: `1px solid ${selected === amount ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 8,
                  color: selected === amount ? 'var(--accent-text)' : 'var(--ink)',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>
                  {amount}
                </span>
                <span
                  className="uppercase text-dim mt-1"
                  style={{ fontSize: 9, letterSpacing: '0.12em' }}
                >
                  ⭐
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleSupport}
            className="w-full font-mono text-mono-label uppercase py-4 text-bg"
            style={{ background: 'var(--ink)', borderRadius: 8, minHeight: 52 }}
          >
            Поддержать {selected} ⭐
          </button>

          <button
            onClick={onClose}
            className="w-full font-mono text-mono-label uppercase py-3 text-dim mt-2"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
