import type { Artist, Catalog, Release, ReleaseType, Track } from './types'

// Валидация формы manifest.json без сторонних схем: ручные проверки + понятный путь к ошибке.

export class ManifestError extends Error {
  constructor(path: string, expected: string) {
    super(`manifest.json: ${path} — ожидалось ${expected}`)
    this.name = 'ManifestError'
  }
}

type Obj = Record<string, unknown>

function obj(v: unknown, path: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ManifestError(path, 'объект')
  return v as Obj
}

function str(o: Obj, key: string, path: string): string {
  const v = o[key]
  if (typeof v !== 'string' || v === '') throw new ManifestError(`${path}.${key}`, 'непустая строка')
  return v
}

function optStr(o: Obj, key: string, path: string): string | undefined {
  return o[key] === undefined ? undefined : str(o, key, path)
}

function num(o: Obj, key: string, path: string): number {
  const v = o[key]
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new ManifestError(`${path}.${key}`, 'число ≥ 0')
  return v
}

function arr(o: Obj, key: string, path: string): unknown[] {
  const v = o[key]
  if (!Array.isArray(v)) throw new ManifestError(`${path}.${key}`, 'массив')
  return v
}

function oneOf<T extends string>(o: Obj, key: string, path: string, values: readonly T[]): T {
  const v = str(o, key, path)
  const hit = values.find((x) => x === v)
  if (hit === undefined) throw new ManifestError(`${path}.${key}`, values.join(' | '))
  return hit
}

const RELEASE_TYPES = ['album', 'ep', 'single'] as const satisfies readonly ReleaseType[]

function parseArtist(v: unknown): Artist {
  const p = 'artist'
  const o = obj(v, p)
  return {
    id: str(o, 'id', p),
    name: str(o, 'name', p),
    aliases: (o.aliases === undefined ? [] : arr(o, 'aliases', p)).map((a, i) => {
      if (typeof a !== 'string') throw new ManifestError(`${p}.aliases[${i}]`, 'строка')
      return a
    }),
  }
}

function parseTrack(v: unknown, p: string, release: { id: string; artistId: string }): Track {
  const o = obj(v, p)
  const track: Track = {
    id: str(o, 'id', p),
    title: str(o, 'title', p),
    duration: num(o, 'duration', p),
    artistId: str(o, 'artistId', p),
    releaseId: str(o, 'releaseId', p),
    audio: str(o, 'audio', p),
  }
  const lrc = optStr(o, 'lrc', p)
  if (lrc !== undefined) track.lrc = lrc
  if (track.releaseId !== release.id) throw new ManifestError(`${p}.releaseId`, `"${release.id}"`)
  const cover = optStr(o, 'cover', p)
  if (cover !== undefined) track.cover = cover
  const lockArt = optStr(o, 'lockArt', p)
  if (lockArt !== undefined) track.lockArt = lockArt
  const accent = optStr(o, 'accent', p)
  if (accent !== undefined) track.accent = accent
  if (track.artistId !== release.artistId) throw new ManifestError(`${p}.artistId`, `"${release.artistId}"`)
  return track
}

function parseSeries(v: unknown, p: string): { index: number; total: number } {
  const o = obj(v, p)
  return { index: num(o, 'index', p), total: num(o, 'total', p) }
}

function parseRelease(v: unknown, i: number, artistId: string): Release {
  const p = `releases[${i}]`
  const o = obj(v, p)
  const palette = obj(o.palette, `${p}.palette`)
  const id = str(o, 'id', p)
  const relArtist = str(o, 'artistId', p)
  if (relArtist !== artistId) throw new ManifestError(`${p}.artistId`, `"${artistId}"`)
  return {
    id,
    title: str(o, 'title', p),
    artistId: relArtist,
    year: num(o, 'year', p),
    ...(typeof o.releasedAt === 'string' ? { releasedAt: o.releasedAt } : {}),
    type: oneOf(o, 'type', p, RELEASE_TYPES),
    ...(o.series !== undefined ? { series: parseSeries(o.series, `${p}.series`) } : {}),
    palette: {
      mode: oneOf(palette, 'mode', `${p}.palette`, ['paper', 'dark'] as const),
      accent: str(palette, 'accent', `${p}.palette`),
    },
    cover: str(o, 'cover', p),
    coverSmall: str(o, 'coverSmall', p),
    tracks: arr(o, 'tracks', p).map((t, j) => parseTrack(t, `${p}.tracks[${j}]`, { id, artistId: relArtist })),
  }
}

export function parseManifest(json: unknown): Catalog {
  const root = obj(json, 'корень')
  const artist = parseArtist(root.artist)
  return {
    artist,
    generatedAt: str(root, 'generatedAt', 'корень'),
    releases: arr(root, 'releases', 'корень').map((r, i) => parseRelease(r, i, artist.id)),
  }
}
