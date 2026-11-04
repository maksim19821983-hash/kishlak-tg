import { create } from 'zustand'
import { track } from '@/app/analytics'

const STORAGE_KEY = 'kishlak:favorites:v2'

/** Избранное с меткой времени: при синхронизации побеждает тот, кто менял позже. */
type Saved = { tracks: string[]; releases: string[]; updatedAt: number }

function empty(): Saved {
  return { tracks: [], releases: [], updatedAt: 0 }
}

function load(): Saved {
  try {
    // переезд со старого формата без метки
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('kishlak:favorites:v1')
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<Saved>
    return {
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
      releases: Array.isArray(parsed.releases) ? parsed.releases : [],
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch {
    return empty()
  }
}

function persist(state: Saved): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* приватный режим — живём без сохранения */
  }
}

type FavoritesStore = Saved & {
  toggleTrack: (id: string) => void
  toggleRelease: (id: string) => void
  /** Применить состояние с другого устройства, если оно свежее. */
  applyRemote: (remote: { tracks: string[]; releases: string[]; updatedAt: number }) => void
}

const initial: Saved = typeof localStorage === 'undefined' ? empty() : load()

export const useFavorites = create<FavoritesStore>((set) => ({
  ...initial,

  toggleTrack: (id) =>
    set((state) => {
      const tracks = state.tracks.includes(id)
        ? state.tracks.filter((t) => t !== id)
        : [id, ...state.tracks]
      const next = { tracks, releases: state.releases, updatedAt: Date.now() }
      persist(next)
      if (tracks.includes(id)) track({ name: 'favorite', trackId: id })
      return next
    }),

  toggleRelease: (id) =>
    set((state) => {
      const releases = state.releases.includes(id)
        ? state.releases.filter((r) => r !== id)
        : [id, ...state.releases]
      const next = { tracks: state.tracks, releases, updatedAt: Date.now() }
      persist(next)
      return next
    }),

  applyRemote: (remote) =>
    set((state) => {
      // локальные изменения новее — не трогаем
      if (state.updatedAt > remote.updatedAt) return state
      const next: Saved = {
        tracks: remote.tracks,
        releases: remote.releases,
        updatedAt: remote.updatedAt,
      }
      persist(next)
      return next
    }),
}))
