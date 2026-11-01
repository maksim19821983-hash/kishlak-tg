import type { TrackFact, FanState } from './state'
import type { Track, Release } from '@/data/types'

export function isListened(fact: TrackFact): boolean {
  if (fact.duration <= 0) return false
  return fact.maxPosition / fact.duration >= 0.5 || fact.completed
}

export function releaseProgress(releaseId: string, tracks: Track[], state: FanState): number {
  const inRelease = tracks.filter((t) => t.releaseId === releaseId)
  if (inRelease.length === 0) return 0
  const listenedCount = inRelease.filter((t) => {
    const fact = state.tracks[t.id]
    return fact ? isListened(fact) : false
  }).length
  return listenedCount / inRelease.length
}

export function collectedReleases(releases: Release[], state: FanState): number {
  return releases.filter((r) => {
    if (r.tracks.length === 0) return false
    return r.tracks.every((t) => {
      const fact = state.tracks[t.id]
      return fact ? isListened(fact) : false
    })
  }).length
}

export function listenedTracksCount(state: FanState): number {
  return Object.values(state.tracks).filter(isListened).length
}

export function favoriteTracks(tracks: Track[], state: FanState): Track[] {
  return tracks
    .filter((t) => {
      const fact = state.tracks[t.id]
      return fact ? isListened(fact) : false
    })
    .sort((a, b) => {
      const fa = state.tracks[a.id]!
      const fb = state.tracks[b.id]!
      return fb.lastAt - fa.lastAt
    })
}

export function newTracks(tracks: Track[], state: FanState): Track[] {
  return tracks.filter((t) => {
    const fact = state.tracks[t.id]
    return !fact || !isListened(fact)
  })
}
