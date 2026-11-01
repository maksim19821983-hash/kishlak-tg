import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'
import { accentText } from './accent'
import { analyzeCover } from './analyzeCover'

export const AUTO_POLARITY = false
const STORAGE_KEY = 'kishlak:theme'

function getStoredTheme(): 'paper' | 'dark' {
  try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'paper' } catch { return 'paper' }
}

function applyToDOM(mode: 'paper' | 'dark', accent: string, aText: string): void {
  const el = document.documentElement
  el.dataset.polarity = mode
  el.style.setProperty('--accent', accent)
  el.style.setProperty('--accent-text', aText)
}

export function toggleTheme(): void {
  const current = (document.documentElement.dataset.polarity as 'paper' | 'dark') ?? 'paper'
  const next = current === 'paper' ? 'dark' : 'paper'
  try { localStorage.setItem(STORAGE_KEY, next) } catch {}
  applyToDOM(next, '#8C5334', accentText('#8C5334', next))
}

export function useCurrentPolarity(): 'paper' | 'dark' {
  const [pol, setPol] = useState<'paper' | 'dark'>(
    () => (document.documentElement.dataset.polarity as 'paper' | 'dark') ?? 'paper',
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setPol((document.documentElement.dataset.polarity as 'paper' | 'dark') ?? 'paper')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-polarity'] })
    return () => obs.disconnect()
  }, [])
  return pol
}

export function usePolarity(): void {
  const track = useAudioStore((s) => s.track)
  const releaseId = track?.releaseId ?? null
  const prevReleaseId = useRef<string | null>(null)

  // когда AUTO_POLARITY выключен — читаем из localStorage и применяем один раз
  useEffect(() => {
    if (AUTO_POLARITY) return
    const theme = getStoredTheme()
    applyToDOM(theme, '#8C5334', accentText('#8C5334', theme))
  }, [])

  // автоопределение по обложке — работает только при AUTO_POLARITY = true
  useEffect(() => {
    if (!AUTO_POLARITY) return
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
