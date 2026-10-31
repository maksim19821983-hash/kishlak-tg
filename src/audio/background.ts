import type { Track } from '@/data/types'

// Фолбэк: отправить трек файлом через бота. Не реализован — нужен только если
// фоновое воспроизведение через Media Session не работает на целевых платформах.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requestBackgroundFallback(_track: Track): Promise<boolean> {
  return false
}
