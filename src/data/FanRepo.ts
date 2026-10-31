import { getCachedProgress } from '@/features/fan/trackListen'

export const FanRepo = {
  /** Доля прослушанных треков релиза, 0…1 (из кэша trackListen). */
  releaseProgress(releaseId: string): number {
    return getCachedProgress(releaseId)
  },
}
