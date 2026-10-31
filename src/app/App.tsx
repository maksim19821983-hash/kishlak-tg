import { Grain } from '@/ui/Grain'
import { Routes } from './routes'
import { usePolarity } from '@/features/polarity/usePolarity'

export function App() {
  usePolarity()
  return (
    <div
      className="min-h-[100dvh] bg-bg px-screen text-ink transition-colors duration-theme"
      style={{
        paddingTop: 'calc(var(--screen-pad) + env(safe-area-inset-top))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Routes />
      <Grain />
    </div>
  )
}
