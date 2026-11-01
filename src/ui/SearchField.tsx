import { IconSearch, IconClose } from './icons'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

export function SearchField({ value, onChange, placeholder }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-screen border-b border-line"
      style={{ height: 44 }}
    >
      <span className="text-dim flex items-center"><IconSearch size={16} /></span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none font-mono text-mono-label uppercase text-ink placeholder:text-dim"
        style={{ border: 0 }}
        aria-label={placeholder}
      />
      {value !== '' && (
        <button
          onClick={() => onChange('')}
          className="flex items-center justify-center text-dim"
          style={{ width: 32, height: 32 }}
          aria-label="Очистить поиск"
        >
          <IconClose size={14} />
        </button>
      )}
    </div>
  )
}
