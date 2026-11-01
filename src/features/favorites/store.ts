import { create } from 'zustand'

const STORAGE_KEY = 'kishlak:favorites:v1'

type Saved = { tracks: string[]; releases: string[] }

function empty(): Saved {
  return { tracks: [], releases: [] }
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<Saved>
    return {
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
      releases: Array.isArray(parsed.releases) ? parsed.releases : [],
    }
  } catch {
    return empty()
  }
}

function persist(state: Saved): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tracks: state.tracks, releases: state.releases }))
  } catch {
    /* приватный режим — живём без сохранения */
  }
}

type FavoritesStore = Saved & {
  toggleTrack: (id: string) => void
  toggleRelease: (id: string) => void
}

const initial: Saved = typeof localStorage === 'undefined' ? empty() : load()

export const useFavorites = create<FavoritesStore>((set) => ({
  ...initial,
  toggleTrack: (id) =>
    set((state) => {
      const tracks = state.tracks.includes(id)
        ? state.tracks.filter((t) => t !== id)
        : [id, ...state.tracks]
      const next = { tracks, releases: state.releases }
      persist(next)
      return next
    }),
  toggleRelease: (id) =>
    set((state) => {
      const releases = state.releases.includes(id)
        ? state.releases.filter((r) => r !== id)
        : [id, ...state.releases]
      const next = { tracks: state.tracks, releases }
      persist(next)
      return next
    }),
}))
