export type Tab = 'player' | 'catalog' | 'favorites' | 'profile'

const TABS: { id: Tab; label: string }[] = [
  { id: 'player',  label: 'ПЛЕЕР'   },
  { id: 'catalog', label: 'КАТАЛОГ' },
  { id: 'favorites', label: 'ЛЮБИМОЕ' },
  { id: 'profile', label: 'ПРОФИЛЬ' },
]

type Props = { active: Tab; onSelect: (tab: Tab) => void }

export function TabBar({ active, onSelect }: Props) {
  return (
    <div
      className="shrink-0 flex items-start justify-around border-t border-line bg-bg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', minHeight: 56 }}
      role="tablist"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className="flex-1 flex flex-col items-center justify-start pt-2 gap-1"
            style={{ minHeight: 44 }}
          >
            <span
              className="font-mono text-mono-label uppercase"
              style={{ color: isActive ? 'var(--ink)' : 'var(--dim)' }}
            >
              {tab.label}
            </span>
            <div
              className="w-1 h-1 rounded-full transition-opacity"
              style={{
                background: 'var(--accent)',
                opacity: isActive ? 1 : 0,
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
