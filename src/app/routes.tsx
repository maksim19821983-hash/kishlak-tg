import { parse, usePathname, type Route } from './router'
import { SpikePage } from '@/features/spike/SpikePage'
import { PolarityPage } from '@/features/polarity/PolarityPage'
import { CatalogScreen } from '@/features/catalog/CatalogScreen'

type Props = { onOpenPlayer: () => void }

function Stub({ route }: { route: Route }) {
  return <div className="p-6">экран {route.name === 'release' ? `release/${route.id}` : route.name}</div>
}

export function Routes({ onOpenPlayer }: Props) {
  const route = parse(usePathname())
  if (route === null) return <div className="p-6 font-mono text-mono-label uppercase text-dim">экран не найден</div>
  if (route.name === 'catalog') return <CatalogScreen onOpenPlayer={onOpenPlayer} />
  if (route.name === 'spike') return <SpikePage />
  if (route.name === 'polarity') return <PolarityPage />
  return <Stub route={route} />
}
