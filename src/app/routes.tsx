import { parse, usePathname, type Route } from './router'
import { SpikePage } from '@/features/spike/SpikePage'
import { PolarityPage } from '@/features/polarity/PolarityPage'

function Stub({ route }: { route: Route }) {
  return <div className="p-6">экран {route.name === 'release' ? `release/${route.id}` : route.name}</div>
}

export function Routes() {
  const route = parse(usePathname())
  if (route === null) return <div className="p-6 font-mono text-mono-label uppercase text-dim">экран не найден</div>
  if (route.name === 'spike') return <SpikePage />
  if (route.name === 'polarity') return <PolarityPage />
  return <Stub route={route} />
}
