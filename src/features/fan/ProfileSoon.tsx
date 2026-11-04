import { NowPlayingBar } from '@/ui/NowPlayingBar'
import { IconTheme } from '@/ui/icons'
import { toggleTheme } from '@/features/polarity/usePolarity'
import { haptic } from '@/app/telegram'
import { AccountBlock } from '@/features/account/AccountScreen'

type Props = { onOpenPlayer: () => void }

export function ProfileSoon({ onOpenPlayer }: Props) {
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
