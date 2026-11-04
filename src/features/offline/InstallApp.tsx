import { useEffect, useState } from 'react'

type HomeScreenStatus = 'unsupported' | 'unknown' | 'added' | 'missed'

type WebAppExtras = {
  checkHomeScreenStatus?: (cb: (status: HomeScreenStatus) => void) => void
  addToHomeScreen?: () => void
}

function extras(): WebAppExtras | null {
  try {
    const app = window.Telegram?.WebApp as unknown as WebAppExtras | undefined
    if (!app || typeof app.addToHomeScreen !== 'function') return null
    return app
  } catch {
    return null
  }
}

/** Кнопка «на экран Домой»: работает через нативный API Телеграма (Bot API 8.0). */
export function InstallApp() {
  const [status, setStatus] = useState<HomeScreenStatus>('unknown')

  useEffect(() => {
    const app = extras()
    if (!app?.checkHomeScreenStatus) return
    try {
      app.checkHomeScreenStatus((value) => setStatus(value))
    } catch {
      setStatus('unsupported')
    }
  }, [])

  const app = extras()
  if (app === null || status === 'added' || status === 'unsupported') return null

  return (
    <button
      onClick={() => {
        try {
          app.addToHomeScreen?.()
        } catch {
          /* клиент не поддерживает */
        }
      }}
      className="font-mono uppercase flex items-center"
      style={{
        fontSize: 9,
        letterSpacing: '.16em',
        marginTop: 8,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid var(--line)',
        color: 'var(--accent)',
        gap: 6,
        minHeight: 28,
      }}
    >
      <span style={{ fontSize: 12, lineHeight: 1 }}>＋</span>
      на экран домой
    </button>
  )
}
