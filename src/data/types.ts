export type Artist = {
  id: string
  name: string
  aliases: string[]
}

export type Polarity = 'paper' | 'dark'

export type ReleaseType = 'album' | 'ep' | 'single'

export type Track = {
  id: string
  title: string
  /** секунды */
  duration: number
  artistId: string
  releaseId: string
  audio: string
  /** Обложка релиза — для локскрина и системного плеера */
  cover?: string
  lrc?: string
}

export type Release = {
  id: string
  title: string
  artistId: string
  year: number
  /** Точная дата выхода (ISO), если известна — для сортировки каталога */
  releasedAt?: string
  type: ReleaseType
  palette: { mode: Polarity; accent: string }
  cover: string
  coverSmall: string
  tracks: Track[]
}

export type Catalog = {
  artist: Artist
  releases: Release[]
  generatedAt: string
}
