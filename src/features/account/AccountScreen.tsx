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

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '14px 16px',
  background: 'var(--panel)',
}

/** Блок «аккаунт»: в Телеграме показывает код, в браузере — поле ввода. */
export function AccountBlock({ compact = false }: { compact?: boolean }) {
  const telegram = inTelegram()
  const [linked, setLinked] = useState(() => deviceToken() !== '')
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const createCode = async (): Promise<void> => {
    setBusy(true)
    setStatus('получаю код…')
    try {
      setCode(await createPairCode())
      setStatus('')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  const claim = async (): Promise<void> => {
    setBusy(true)
    setStatus('проверяю…')
    try {
      await claimPairCode(input)
      await syncRemote().catch(() => {})
      setLinked(true)
      setStatus('готово')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  return (
    <div style={cardStyle}>
      <p className="font-mono uppercase text-dim" style={{ fontSize: 9, letterSpacing: '.18em' }}>
        {telegram ? 'браузер и другие устройства' : 'аккаунт'}
      </p>

      {telegram ? (
        <>
          <p className="font-mono text-dim" style={{ fontSize: 11, lineHeight: 1.6, marginTop: 8 }}>
            Открой сайт в Safari, введи код — и там появятся твоё избранное и прослушивания.
          </p>
          {code === '' ? (
            <button
              onClick={() => void createCode()}
              disabled={busy}
              className="font-mono uppercase"
              style={{
                marginTop: 10, height: 40, padding: '0 14px', fontSize: 10, letterSpacing: '.14em',
                border: '1px solid var(--line)', borderRadius: 999, color: 'var(--accent)', opacity: busy ? 0.5 : 1,
              }}
            >
              {busy ? '…' : 'получить код'}
            </button>
          ) : (
            <>
              <p className="font-display uppercase text-ink" style={{ fontSize: compact ? 26 : 32, letterSpacing: '.2em', marginTop: 10 }}>
                {code}
              </p>
              <p className="font-mono text-dim" style={{ fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
                код живёт 10 минут, вводить на kishlak-tg.pages.dev
              </p>
            </>
          )}
        </>
      ) : linked ? (
        <>
          <p className="font-mono text-ink" style={{ fontSize: 11, lineHeight: 1.6, marginTop: 8 }}>
            Устройство подключено. Избранное и прослушивания синхронизируются.
          </p>
          <button
            onClick={() => { clearDeviceToken(); setLinked(false) }}
            className="font-mono uppercase text-dim"
            style={{ fontSize: 9, letterSpacing: '.14em', marginTop: 10, minHeight: 28 }}
          >
            отвязать устройство
          </button>
        </>
      ) : (
        <>
          <p className="font-mono text-dim" style={{ fontSize: 11, lineHeight: 1.6, marginTop: 8 }}>
            Введи код из приложения в Телеграме — подтянутся избранное и прослушивания.
          </p>
          <div className="flex items-center" style={{ gap: 8, marginTop: 10 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="КОД"
              autoCapitalize="characters"
              style={{
                flex: 1, height: 40, padding: '0 12px', fontSize: 16, letterSpacing: '.18em',
                fontFamily: 'var(--font-mono)', color: 'var(--ink)', background: 'var(--surface)',
                border: '1px solid var(--line)', borderRadius: 8,
              }}
            />
            <button
              onClick={() => void claim()}
              disabled={busy || input.trim().length < 4}
              className="font-mono uppercase"
              style={{
                height: 40, padding: '0 14px', fontSize: 10, letterSpacing: '.14em',
                border: '1px solid var(--line)', borderRadius: 8, color: 'var(--accent)',
                opacity: busy || input.trim().length < 4 ? 0.5 : 1,
              }}
            >
              {busy ? '…' : 'войти'}
            </button>
          </div>
        </>
      )}

      {status !== '' && (
        <p className="font-mono text-dim" style={{ fontSize: 10, marginTop: 8 }}>{status}</p>
      )}
    </div>
  )
}

/** Экран входа в браузере: показывается, пока аккаунт не подключён или не пропущен. */
export function ConnectGate({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-[58] bg-bg flex flex-col justify-center px-screen">
      <p className="font-mono uppercase text-dim" style={{ fontSize: 9.5, letterSpacing: '.2em' }}>
        Кишлак · архив
      </p>
      <h1 className="font-display uppercase text-ink" style={{ fontSize: 32, lineHeight: 1.05, marginTop: 8 }}>
        Это приложение
        <br />
        уже твоё
      </h1>
      <p className="font-mono text-dim" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 12, marginBottom: 18 }}>
        Подключи аккаунт — и здесь появятся избранное, прослушивания и статистика из Телеграма.
        Если не нужно, продолжай так.
      </p>

      <AccountBlock compact />

      <button
        onClick={onDone}
        className="font-mono uppercase text-dim"
        style={{ fontSize: 9.5, letterSpacing: '.16em', marginTop: 16, minHeight: 32 }}
      >
        продолжить без аккаунта
      </button>
    </div>
  )
}
