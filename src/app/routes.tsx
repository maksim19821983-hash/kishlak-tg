import { parse, usePathname, type Route } from './router'
import { SpikePage } from '@/features/spike/SpikePage'
import { PolarityPage } from '@/features/polarity/PolarityPage'
import { CatalogScreen } from '@/features/catalog/CatalogScreen'

function Stub({ route }: { route: Route }) {
  return <div>экран {route.name === 'release' ? `release/${route.id}` : route.name}</div>
}

export function Routes() {
  const route = parse(usePathname())
  if (route === null) return <div>экран не найден</div>
  if (route.name === 'catalog') return <CatalogScreen />
  if (route.name === 'spike') return <SpikePage />
  if (route.name === 'polarity') return <PolarityPage />
  return <Stub route={route} />
}
