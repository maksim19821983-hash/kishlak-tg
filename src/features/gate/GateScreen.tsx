import { Grain } from '@/ui/Grain'
import { haptic, openTelegramLink } from '@/app/telegram'

export const CHANNEL_URL = 'https://t.me/Kishlak_music_tgk'
export const CHANNEL_HANDLE = '@Kishlak_music_tgk'

type Props = {
  status: 'checking' | 'blocked' | 'error'
  onCheck: () => void
}

/**
 * Шлагбаум: без подписки на канал плеер не открывается.
 * Экран намеренно тихий — один заголовок, две кнопки, без декора.
 */
export function GateScreen({ status, onCheck }: Props) {
  const checking = status === 'checking'
  const failed = status === 'error'

  const subscribe = (): void => {
    haptic('light')
    openTelegramLink(CHANNEL_URL)
  }

  return (
    <div
      className="fixed inset-0 z-[58] bg-bg text-ink flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Grain />

      <div className="px-screen" style={{ paddingTop: 28 }}>
        <p className="font-mono uppercase text-dim" style={{ fontSize: 9.5, letterSpacing: '.2em' }}>
          Кишлак · АПФС
        </p>
      </div>

      <div className="flex-1 min-h-0 px-screen flex flex-col justify-center" style={{ paddingBottom: 72 }}>
        <p
          className="font-mono uppercase text-dim flex items-center"
          style={{ fontSize: 10.5, letterSpacing: '.16em', gap: 8 }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--accent)' }} />
          {checking ? 'проверяем' : 'доступ'}
        </p>

        <h1
          className="font-display uppercase text-ink"
          style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: '-.02em', marginTop: 12 }}
        >
          Сначала подписка
        </h1>

        <p className="text-body text-dim" style={{ marginTop: 16, lineHeight: 1.5, maxWidth: 320 }}>
          {failed
            ? 'Не получилось проверить подписку. Проверь связь и попробуй ещё раз.'
            : 'Плеер открывается для подписчиков канала. Подписка — один тап, и обратно тоже.'}
        </p>

        <div className="flex flex-col" style={{ marginTop: 28, gap: 10 }}>
          <button
            onClick={subscribe}
            className="font-display uppercase"
            style={{
              height: 52,
              borderRadius: 999,
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontSize: 13,
              letterSpacing: '.04em',
            }}
          >
            Подписаться
          </button>

          <button
            onClick={onCheck}
            disabled={checking}
            className="font-display uppercase"
            style={{
              height: 48,
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: checking ? 'var(--dim)' : 'var(--ink)',
              fontSize: 12.5,
              letterSpacing: '.04em',
            }}
          >
            {checking ? 'Проверяем…' : 'Я подписался'}
          </button>
        </div>
      </div>

      <div className="px-screen" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 22px)' }}>
        <p className="font-mono uppercase text-dim" style={{ fontSize: 9.5, letterSpacing: '.18em' }}>
          {CHANNEL_HANDLE}
        </p>
      </div>
    </div>
  )
}
