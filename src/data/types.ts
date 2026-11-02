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
  /** Постер для локскрина: обложка + альбом и год, без названия трека */
  lockArt?: string
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
  /** Место релиза в дискографии: index из total */
  series?: { index: number; total: number }
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
