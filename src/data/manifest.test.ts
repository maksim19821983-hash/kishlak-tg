import { describe, expect, it } from 'vitest'
import { ManifestError, parseManifest } from './manifest'

const track = {
  id: 't1',
  title: 'Интро',
  duration: 140,
  releaseId: 'r1',
  artistId: 'a1',
  audio: '/content/audio/r1/01.mp3',
}

const valid = {
  artist: { id: 'a1', name: 'Артист', aliases: [] },
  generatedAt: '2026-10-31T00:00:00Z',
  releases: [
    {
      id: 'r1',
      title: 'Релиз',
      artistId: 'a1',
      year: 2026,
      type: 'album',
      palette: { mode: 'paper', accent: '#64A4B4' },
      cover: '/c.jpg',
      coverSmall: '/c-400.jpg',
      tracks: [track, { ...track, id: 't2', lrc: '/l.lrc' }],
    },
  ],
}

describe('parseManifest', () => {
  it('читает валидный манифест', () => {
    const c = parseManifest(valid)
    expect(c.releases[0]?.tracks).toHaveLength(2)
    expect(c.releases[0]?.tracks[0]?.lrc).toBeUndefined()
    expect(c.releases[0]?.tracks[1]?.lrc).toBe('/l.lrc')
  })

  it('называет путь к битому полю', () => {
    const broken = structuredClone(valid)
    const t = broken.releases[0]?.tracks[1]
    if (t) t.duration = -1
    expect(() => parseManifest(broken)).toThrow('releases[0].tracks[1].duration')
  })

  it('ловит трек чужого релиза', () => {
    const broken = structuredClone(valid)
    const t = broken.releases[0]?.tracks[0]
    if (t) t.releaseId = 'other'
    expect(() => parseManifest(broken)).toThrow(ManifestError)
  })

  it('не принимает не-объект', () => {
    expect(() => parseManifest('<!doctype html>')).toThrow(ManifestError)
  })
})
