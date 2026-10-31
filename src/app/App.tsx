import { Grain } from '@/ui/Grain'
import { Routes } from './routes'
import { usePolarity } from '@/features/polarity/usePolarity'

export function App() {
  usePolarity()
  return (
    // Каждый экран управляет своими отступами сам — App не добавляет padding
    <div className="min-h-[100dvh] bg-bg text-ink transition-colors duration-theme">
      <Routes />
      <Grain />
    </div>
  )
}
