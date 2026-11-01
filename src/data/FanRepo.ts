import { getState } from '@/features/fan/state'
import { releaseProgress } from '@/features/fan/derive'
import type { Track } from './types'

export const FanRepo = {
  releaseProgress(releaseId: string, tracks: Track[]): number {
    return releaseProgress(releaseId, tracks, getState())
  },
}
