import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'
import { accentText } from './accent'
import { analyzeCover } from './analyzeCover'

function applyToDOM(mode: 'paper' | 'dark', accent: string, aText: string): void {
  const el = document.documentElement
  el.dataset.polarity = mode
  el.style.setProperty('--accent', accent)
  el.style.setProperty('--accent-text', aText)
}

export function usePolarity(): void {
  const track = useAudioStore((s) => s.track)
  const releaseId = track?.releaseId ?? null
  const prevReleaseId = useRef<string | null>(null)

  useEffect(() => {
    if (releaseId === prevReleaseId.current) return
    prevReleaseId.current = releaseId

    let cancelled = false

    async function apply(): Promise<void> {
      if (!releaseId) {
        applyToDOM('paper', '#8C5334', accentText('#8C5334', 'paper'))
        return
      }

      try {
        const catalog = await CatalogRepo.load()
        if (cancelled) return
        const release = catalog.releases.find((r) => r.id === releaseId)
        if (!release) return

        let mode: 'paper' | 'dark'
        let accent: string

        if (release.palette) {
          mode = release.palette.mode
          accent = release.palette.accent
        } else {
          // фолбэк: canvas-анализ (только для релизов без palette в манифесте)
          const palette = await analyzeCover(release.cover)
          if (cancelled) return
          mode = palette.mode
          accent = palette.accent
        }

        applyToDOM(mode, accent, accentText(accent, mode))
      } catch {
        // не блокируем UI при ошибке каталога
      }
    }

    void apply()
    return () => { cancelled = true }
  }, [releaseId])
}
