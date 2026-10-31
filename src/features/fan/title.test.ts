import { describe, it, expect } from 'vitest'
import { pickTitle, maybeUpdateTitle } from './title'
import type { FanStats } from './title'
import { emptyState } from './state'

const base: FanStats = {
  listenedTracks: 0,
  totalCatalogTracks: 20,
  totalCatalogReleases: 3,
  fullReleasesListened: 0,
  totalSeconds: 0,
  topReleaseTimeShare: 0,
  nightShare: 0,
  lyricsShare: 0,
  totalSessions: 0,
  maxTrackPlays: 0,
}

describe('pickTitle', () => {
  it('нет данных → null', () => {
    expect(pickTitle(base)).toBeNull()
  })

  it('СЛУШАТЕЛЬ: от 10 прослушанных треков', () => {
    expect(pickTitle({ ...base, listenedTracks: 10 })).toBe('СЛУШАТЕЛЬ')
  })

  it('СЛУШАТЕЛЬ: ровно 10', () => {
    expect(pickTitle({ ...base, listenedTracks: 10 })).toBe('СЛУШАТЕЛЬ')
  })

  it('9 треков → ещё не СЛУШАТЕЛЬ', () => {
    expect(pickTitle({ ...base, listenedTracks: 9 })).toBeNull()
  })

  it('РЕЗИДЕНТ: топ-релиз 41% + 70% каталога', () => {
    const stats: FanStats = {
      ...base,
      listenedTracks: 14,   // 14/20 = 70%
      totalCatalogTracks: 20,
      topReleaseTimeShare: 0.41,
    }
    expect(pickTitle(stats)).toBe('РЕЗИДЕНТ')
  })

  it('РЕЗИДЕНТ требует оба условия: без каталога — не выдаётся', () => {
    const stats: FanStats = {
      ...base,
      listenedTracks: 5,  // 25% < 70%
      topReleaseTimeShare: 0.5,
    }
    expect(pickTitle(stats)).not.toBe('РЕЗИДЕНТ')
  })

  it('НОЧНАЯ СМЕНА: ночь 60% и ≥60 мин', () => {
    const stats: FanStats = {
      ...base,
      nightShare: 0.6,
      totalSeconds: 4000,  // ~67 мин
    }
    expect(pickTitle(stats)).toBe('НОЧНАЯ СМЕНА')
  })

  it('НОЧНАЯ СМЕНА: ночь есть но мало минут → не выдаётся', () => {
    expect(pickTitle({ ...base, nightShare: 0.6, totalSeconds: 3000 })).not.toBe('НОЧНАЯ СМЕНА')
  })

  it('ДОСЛОВНЫЙ: lyrics 50% и ≥20 сессий', () => {
    expect(pickTitle({ ...base, lyricsShare: 0.5, totalSessions: 20 })).toBe('ДОСЛОВНЫЙ')
  })

  it('НА ПОВТОРЕ: 15 повторов трека', () => {
    expect(pickTitle({ ...base, maxTrackPlays: 15 })).toBe('НА ПОВТОРЕ')
  })

  it('НА ПОВТОРЕ: 14 → не выдаётся', () => {
    expect(pickTitle({ ...base, maxTrackPlays: 14 })).toBeNull()
  })

  it('ПЕРВЫЙ РЯД: весь каталог прослушан', () => {
    const stats: FanStats = { ...base, listenedTracks: 20, totalCatalogTracks: 20 }
    expect(pickTitle(stats)).toBe('ПЕРВЫЙ РЯД')
  })

  it('РЕЗИДЕНТ приоритетнее СЛУШАТЕЛЬ', () => {
    const stats: FanStats = {
      ...base,
      listenedTracks: 14,
      totalCatalogTracks: 20,
      topReleaseTimeShare: 0.41,
    }
    expect(pickTitle(stats)).toBe('РЕЗИДЕНТ')
  })
})

describe('maybeUpdateTitle', () => {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  it('первое получение → устанавливает титул', () => {
    const state = emptyState()
    const stats: FanStats = { ...base, listenedTracks: 10 }
    const patch = maybeUpdateTitle(state, stats, now)
    expect(patch.title?.id).toBe('СЛУШАТЕЛЬ')
    expect(patch.titleComputedAt).toBe(now)
  })

  it('не пересчитывает чаще раза в сутки', () => {
    const state = { ...emptyState(), titleComputedAt: now - oneDay + 1000 }
    const stats: FanStats = { ...base, listenedTracks: 10 }
    const patch = maybeUpdateTitle(state, stats, now)
    expect(patch.title).toBeUndefined()
    expect(patch.titleComputedAt).toBeUndefined()
  })

  it('смена не раньше 7 дней', () => {
    const state = {
      ...emptyState(),
      title: { id: 'СЛУШАТЕЛЬ', since: now - sevenDays + 1000 },
      titleComputedAt: now - oneDay - 1000,
    }
    const stats: FanStats = { ...base, maxTrackPlays: 15 }  // НА ПОВТОРЕ
    const patch = maybeUpdateTitle(state, stats, now)
    // Слишком рано — смены нет
    expect(patch.title).toBeUndefined()
  })

  it('смена после 7 дней работает', () => {
    const state = {
      ...emptyState(),
      title: { id: 'СЛУШАТЕЛЬ', since: now - sevenDays - 1000 },
      titleComputedAt: now - oneDay - 1000,
    }
    const stats: FanStats = { ...base, maxTrackPlays: 15 }  // НА ПОВТОРЕ
    const patch = maybeUpdateTitle(state, stats, now)
    expect(patch.title?.id).toBe('НА ПОВТОРЕ')
  })

  it('null titleId → не меняет title', () => {
    const state = emptyState()
    const stats: FanStats = { ...base }  // нет данных
    const patch = maybeUpdateTitle(state, stats, now)
    expect(patch.title).toBeUndefined()
  })
})
