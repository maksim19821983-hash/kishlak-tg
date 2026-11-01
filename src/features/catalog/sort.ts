import type { Release } from '@/data/types'

/** Дата для сортировки: точная, если есть, иначе 1 января года */
function sortKey(release: Release): number {
  if (release.releasedAt) {
    const t = Date.parse(release.releasedAt)
    if (!Number.isNaN(t)) return t
  }
  return Date.UTC(release.year, 0, 1)
}

/** Новые релизы сверху, как в стриминговых профилях артиста */
export function sortReleases(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => {
    const diff = sortKey(b) - sortKey(a)
    if (diff !== 0) return diff
    return a.title.localeCompare(b.title, 'ru')
  })
}
