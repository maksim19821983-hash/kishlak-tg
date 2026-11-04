import { NowPlayingBar } from '@/ui/NowPlayingBar'
import { IconTheme } from '@/ui/icons'
import { toggleTheme } from '@/features/polarity/usePolarity'
import { haptic } from '@/app/telegram'
import { AccountBlock } from '@/features/account/AccountScreen'
import { autofillEnabled, setAutofillEnabled } from '@/features/offline/downloadSync'
import { useState } from 'react'

type Props = { onOpenPlayer: () => void }

export function ProfileSoon({ onOpenPlayer }: Props) {
  const [autofill, setAutofill] = useState(() => autofillEnabled())
  return (
    <div
      className="min-h-full flex flex-col"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + var(--tg-safe-top, 0px))' }}
    >
      <div className="flex items-center justify-between px-screen shrink-0" style={{ height: 40 }}>
        <span className="font-mono text-mono-label uppercase text-ink">КИШЛАК</span>
        <button
          onClick={() => { toggleTheme(); haptic('light') }}
          className="flex items-center justify-center text-dim"
          style={{ width: 44, height: 44 }}
          aria-label="Переключить тему"
        >
          <IconTheme size={18} />
        </button>
      </div>

      <NowPlayingBar onOpen={onOpenPlayer} />

      <div className="px-screen" style={{ marginTop: 8, marginBottom: 16 }}>
        <AccountBlock />
      </div>

      <div className="px-screen" style={{ marginBottom: 16 }}>
        <button
          onClick={() => {
            const next = !autofill
            setAutofill(next)
            setAutofillEnabled(next)
            haptic('light')
          }}
          className="w-full flex items-center justify-between"
          style={{
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '12px 16px',
            background: 'var(--panel)',
            minHeight: 52,
          }}
          aria-pressed={autofill}
        >
          <span className="font-mono uppercase text-dim" style={{ fontSize: 9.5, letterSpacing: '.14em', textAlign: 'left' }}>
            догружать скачанное
            <br />
            с других устройств
          </span>
          <span
            style={{
              width: 38,
              height: 22,
              borderRadius: 999,
              background: autofill ? 'var(--accent)' : 'var(--line)',
              position: 'relative',
              transition: 'background-color 200ms ease',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: autofill ? 19 : 3,
                width: 16,
                height: 16,
                borderRadius: 999,
                background: 'var(--bg)',
                transition: 'left 200ms ease',
              }}
            />
          </span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-screen pb-16">
        <p className="font-mono text-mono-label uppercase text-dim mb-3">профиль</p>
        <h1 className="font-display text-h1 uppercase text-ink leading-[0.95]">Скоро</h1>
        <p
          className="font-mono text-mono-label uppercase text-dim mt-4"
          style={{ maxWidth: 260, lineHeight: 1.6 }}
        >
          Переделываем: титул, статистика и коллекция переезжают в новый вид
        </p>
      </div>
    </div>
  )
}
