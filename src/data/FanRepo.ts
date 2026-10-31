// Заглушка фан-слоя (docs/spec/fan-layer.md). Реальный учёт прослушиваний — фаза 5.

export const FanRepo = {
  /** Доля прослушанных треков релиза, 0…1. */
  releaseProgress(releaseId: string): number {
    void releaseId
    return 0
  },
}
