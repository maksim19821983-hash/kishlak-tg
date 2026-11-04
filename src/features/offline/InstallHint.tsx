import { useState } from 'react'

const HINT_KEY = 'kishlak:install-hint:v1'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function inTelegram(): boolean {
  try {
    return (window.Telegram?.WebApp?.initData ?? '') !== ''
  } catch {
    return false
  }
}

/** Подсказка «поставить на домашний экран» — только в браузере, не в Телеграме. */
export function InstallHint() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) === '1'
    } catch {
      return false
    }
  })
  const [expanded, setExpanded] = useState(false)

  if (hidden || inTelegram() || isStandalone()) return null

  const dismiss = (): void => {
    setHidden(true)
    try {
      localStorage.setItem(HINT_KEY, '1')
    } catch {
      /* приватный режим */
    }
  }

  return (
    <div
      className="px-screen"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
    >
      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '10px 12px',
          background: 'var(--panel)',
        }}
      >
        <div className="flex items-start justify-between" style={{ gap: 10 }}>
          <p className="font-mono uppercase text-dim" style={{ fontSize: 9, letterSpacing: '.16em', lineHeight: 1.5 }}>
            чтобы слушать без интернета, поставь приложение на домашний экран
          </p>
          <button
            onClick={dismiss}
            className="font-mono uppercase text-dim shrink-0"
            style={{ fontSize: 9, letterSpacing: '.12em', minHeight: 24 }}
            aria-label="Скрыть подсказку"
          >
            скрыть
          </button>
        </div>

        {expanded ? (
          <p className="font-mono text-dim" style={{ fontSize: 10.5, lineHeight: 1.6, marginTop: 8 }}>
            iPhone: кнопка «Поделиться» → «На экран „Домой“».
            <br />
            Android: меню браузера → «Установить приложение».
          </p>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="font-mono uppercase"
            style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'var(--accent)', marginTop: 8 }}
          >
            как это сделать
          </button>
        )}
      </div>
    </div>
  )
}
