import { useState } from 'react'
import { IconHeart } from './icons'

type Props = {
  active: boolean
  onToggle: () => void
  size?: number
  label: string
  color?: string
  inactiveColor?: string
}

export function HeartButton({ active, onToggle, size = 20, label, color, inactiveColor }: Props) {
  const [tick, setTick] = useState(0)

  return (
    <button
      onClick={() => { setTick((n) => n + 1); onToggle() }}
      className="relative flex items-center justify-center press"
      style={{
        width: 44,
        height: 44,
        color: active ? (color ?? 'var(--like)') : (inactiveColor ?? 'var(--dim)'),
      }}
      aria-label={label}
      aria-pressed={active}
    >
      {tick > 0 && active && (
        <span
          key={`ring-${tick}`}
          className="absolute rounded-full heart-ring"
          style={{ width: size + 12, height: size + 12, border: `1.5px solid var(--like)` }}
        />
      )}
      <span key={`icon-${tick}`} className={tick > 0 ? 'heart-pop' : undefined} style={{ display: 'flex' }}>
        <IconHeart size={size} filled={active} />
      </span>
    </button>
  )
}
