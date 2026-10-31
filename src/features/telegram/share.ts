import { openTelegramLink, haptic, safeTelegram } from '@/app/telegram'

const BOT_USERNAME = 'kishlak_bot'
const SHARE_TEXT = 'Болею тобой — Кишлак'

export function shareTrack(trackId: string): void {
  const url = `https://t.me/${BOT_USERNAME}?startapp=track_${trackId}`
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(SHARE_TEXT)}`

  if (safeTelegram()) {
    openTelegramLink(shareUrl)
  } else {
    void navigator.clipboard?.writeText(url).catch(() => {})
  }
  haptic('success')
}

export function openSupport(): void {
  openTelegramLink(`https://t.me/${BOT_USERNAME}?start=support`)
  console.log('[Stars] support link opened')
}
