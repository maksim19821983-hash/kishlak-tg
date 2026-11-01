import { IconSearch, IconClose } from './icons'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

export function SearchField({ value, onChange, placeholder }: Props) {
  return (
    <div className="search-field flex items-center gap-2 px-screen" style={{ height: 48 }}>
      <span className="flex items-center" style={{ color: 'var(--dim)' }}>
        <IconSearch size={16} />
      </span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent"
        style={{
          border: 0,
          outline: 'none',
          boxShadow: 'none',
          // 16 px — иначе iOS зумит страницу при фокусе
          fontSize: 16,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.02em',
          color: 'var(--ink)',
          caretColor: 'var(--accent)',
        }}
        aria-label={placeholder}
      />

      {value !== '' && (
        <button
          onClick={() => onChange('')}
          className="flex items-center justify-center press"
          style={{ width: 32, height: 32, color: 'var(--dim)' }}
          aria-label="Очистить поиск"
        >
          <IconClose size={14} />
        </button>
      )}
    </div>
  )
}
