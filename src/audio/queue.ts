import type { PlaybackState } from './port'

export type Repeat = PlaybackState['repeat']

/** Fisher-Yates shuffle, сохраняет keepAt на позиции 0 */
export function shuffleOrder(length: number, keepAt: number): number[] {
  if (length === 0) return []
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== keepAt)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j] as number, rest[i] as number]
  }
  return [keepAt, ...rest]
}

/**
 * Следующая позиция в порядке воспроизведения.
 * reason='ended' + repeat='one' → воспроизвести тот же трек (engine сам перемотает).
 * Возвращает null если нужно остановиться (repeat='off', последний трек).
 */
export function nextIndex(
  pos: number,
  length: number,
  repeat: Repeat,
  reason: 'ended' | 'user' = 'user',
): number | null {
  if (length === 0) return null
  if (repeat === 'one' && reason === 'ended') return pos
  if (pos < length - 1) return pos + 1
  if (repeat === 'all' || repeat === 'one') return 0
  return null
}

/** Предыдущая позиция, минимум 0 */
export function prevIndex(pos: number): number {
  return Math.max(0, pos - 1)
}

/** Привести индекс к допустимому диапазону; пустая очередь → -1 */
export function clampIndex(index: number, length: number): number {
  if (length === 0) return -1
  return Math.max(0, Math.min(length - 1, index))
}
