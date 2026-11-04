import { useEffect, useState } from 'react'

/** Показывает текст ошибки на экране: без этого Safari даёт просто белый экран. */
export function ErrorOverlay() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const onError = (event: ErrorEvent): void => {
      setMessage(`${event.message}\n${event.filename}:${event.lineno}`)
    }
    const onRejection = (event: PromiseRejectionEvent): void => {
      setMessage(String(event.reason))
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (message === null) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'var(--bg)',
        color: 'var(--ink)',
        padding: 20,
        paddingTop: 'calc(env(safe-area-inset-top) + 20px)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        overflow: 'auto',
      }}
      role="alert"
    >
      <p style={{ marginBottom: 12, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 10 }}>
        Приложение упало
      </p>
      {message}
      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => window.location.reload()}
          style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '8px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}
        >
          перезагрузить
        </button>
      </div>
    </div>
  )
}
