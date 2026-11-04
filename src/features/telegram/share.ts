import { openTelegramLink, haptic, safeTelegram } from '@/app/telegram'

/**
 * Имя бота для ссылок. Пока не задано — делимся прямой ссылкой на сайт,
 * чтобы шаринг работал без бота (по адресу открывается тот же трек).
 */
const BOT_USERNAME = (import.meta.env.VITE_BOT_USERNAME as string | undefined) ?? ''
const SITE = 'https://kishlak-tg.pages.dev'
const SHARE_TEXT = 'Болею тобой — Кишлак'

/** Ссылка на трек: через бота, если имя задано, иначе напрямую на сайт. */
export function trackLink(trackId: string): string {
  if (BOT_USERNAME !== '') return `https://t.me/${BOT_USERNAME}?startapp=track_${trackId}`
  return `${SITE}/?track=${encodeURIComponent(trackId)}`
}

export function shareTrack(trackId: string): void {
  const url = trackLink(trackId)
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(SHARE_TEXT)}`

  if (safeTelegram()) {
    openTelegramLink(shareUrl)
  } else {
    void navigator.clipboard?.writeText(url).catch(() => {})
  }
  haptic('success')
}

export function botConfigured(): boolean {
  return BOT_USERNAME !== ''
}
