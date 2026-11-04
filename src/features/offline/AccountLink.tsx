import { useState } from 'react'
import { createPairCode, claimPairCode, deviceToken, clearDeviceToken } from '@/app/pairing'
import { syncRemote } from '@/app/remoteSync'

function inTelegram(): boolean {
  try {
    return (window.Telegram?.WebApp?.initData ?? '') !== ''
  } catch {
    return false
  }
}

/** Браузер без Телеграма: ввод кода, чтобы увидеть свои данные. */
export function AccountLinkBrowser() {
  const [code, setCode] = useState('')
  const [linked, setLinked] = useState(() => deviceToken() !== '')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  if (inTelegram()) return null

  if (linked) return null

  const claim = async (): Promise<void> => {
    setBusy(true)
    setStatus('проверяю код…')
    try {
      await claimPairCode(code)
      setStatus('готово, подтягиваю данные…')
      await syncRemote().catch(() => {})
      setLinked(true)
    } catch (e) {
      setStatus(String(e instanceof Error ? e.message : e))
    }
    setBusy(false)
  }

  return (
    <div className="px-screen" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
      <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: 'var(--panel)' }}>
        <p className="font-mono uppercase text-dim" style={{ fontSize: 9, letterSpacing: '.16em', lineHeight: 1.5 }}>
          подключить аккаунт: введи код из приложения в Телеграме
        </p>
        <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="КОД"
            inputMode="text"
            autoCapitalize="characters"
            style={{
              flex: 1,
              height: 36,
              padding: '0 10px',
              fontSize: 15,
              letterSpacing: '.16em',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink)',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
            }}
          />
          <button
            onClick={() => void claim()}
            disabled={busy || code.trim().length < 4}
            className="font-mono uppercase"
            style={{
              height: 36,
              padding: '0 12px',
              fontSize: 10,
              letterSpacing: '.14em',
              border: '1px solid var(--line)',
              borderRadius: 8,
              color: 'var(--accent)',
              opacity: busy || code.trim().length < 4 ? 0.5 : 1,
            }}
          >
            {busy ? '…' : 'войти'}
          </button>
        </div>
        {status !== '' && (
          <p className="font-mono text-dim" style={{ fontSize: 10, marginTop: 6, lineHeight: 1.5 }}>
            {status}
          </p>
        )}
      </div>
    </div>
  )
}

/** Мини-апп в Телеграме: показать код для браузера. */
export function AccountLinkTelegram() {
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  if (!inTelegram()) return null

  const create = async (): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      setCode(await createPairCode())
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
    setBusy(false)
  }

  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open && code === null) void create()
        }}
        className="font-mono uppercase text-dim"
        style={{ fontSize: 9, letterSpacing: '.16em', minHeight: 28 }}
      >
        {open ? 'скрыть код для браузера' : 'подключить браузер'}
      </button>

      {open && (
        <div style={{ marginTop: 6, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--panel)' }}>
          {code !== null ? (
            <>
              <p className="font-display uppercase text-ink" style={{ fontSize: 28, letterSpacing: '.18em' }}>
                {code}
              </p>
              <p className="font-mono text-dim" style={{ fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
                введи этот код на сайте в браузере — данные появятся там. Код живёт 10 минут.
              </p>
            </>
          ) : (
            <p className="font-mono text-dim" style={{ fontSize: 10 }}>
              {error !== '' ? error : busy ? 'получаю код…' : 'код не получен'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Для браузера: отвязать устройство. */
export function UnlinkDevice() {
  const [linked, setLinked] = useState(() => deviceToken() !== '')
  if (!linked || inTelegram()) return null
  return (
    <button
      onClick={() => {
        clearDeviceToken()
        setLinked(false)
      }}
      className="font-mono uppercase text-dim"
      style={{ fontSize: 9, letterSpacing: '.14em', marginTop: 6, minHeight: 24 }}
    >
      отвязать это устройство
    </button>
  )
}
