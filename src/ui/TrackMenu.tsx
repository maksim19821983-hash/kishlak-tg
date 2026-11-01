type Action = {
  label: string
  onSelect: () => void
  accent?: boolean
}

type Props = {
  open: boolean
  title: string
  actions: Action[]
  onClose: () => void
}

export function TrackMenu({ open, title, actions, onClose }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal>
      <button
        className="absolute inset-0 anim-backdrop"
        style={{ background: 'rgba(0,0,0,.55)' }}
        onClick={onClose}
        aria-label="Закрыть меню"
      />
      <div
        className="relative bg-bg border-t border-line anim-sheet"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="px-screen pt-3 pb-2 border-b border-line">
          <p className="font-mono text-mono-label uppercase text-dim line-clamp-1">{title}</p>
        </div>
        <ul>
          {actions.map((action) => (
            <li key={action.label}>
              <button
                onClick={() => { action.onSelect(); onClose() }}
                className="w-full text-left px-screen flex items-center font-mono text-mono-label uppercase"
                style={{
                  minHeight: 52,
                  color: action.accent ? 'var(--accent-text)' : 'var(--ink)',
                }}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="w-full px-screen font-mono text-mono-label uppercase text-dim border-t border-line"
          style={{ minHeight: 52 }}
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
