import { useState } from 'react'
import { IconHeart } from './icons'

type Props = {
  active: boolean
  onToggle: () => void
  size?: number
  box?: number
  label: string
  color?: string
  inactiveColor?: string
}

export function HeartButton({ active, onToggle, size = 20, box = 44, label, color, inactiveColor }: Props) {
  const [tick, setTick] = useState(0)

  return (
    <button
      onClick={() => { setTick((n) => n + 1); onToggle() }}
      className="relative flex items-center justify-center press"
      style={{
        width: box,
        height: box,
        color: active ? (color ?? 'var(--like)') : (inactiveColor ?? 'var(--dim)'),
      }}
      aria-label={label}
      aria-pressed={active}
    >
      <span key={`icon-${tick}`} className={tick > 0 ? 'heart-pop' : undefined} style={{ display: 'flex' }}>
        <IconHeart size={size} filled={active} />
      </span>
    </button>
  )
}
