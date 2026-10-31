import { describe, it, expect } from 'vitest'
import { shouldCountListen, isForwardSeek } from './trackListen'

describe('shouldCountListen', () => {
  it('79% не засчитывается', () => {
    expect(shouldCountListen(79, 100)).toBe(false)
  })

  it('79.9% не засчитывается', () => {
    expect(shouldCountListen(79.9, 100)).toBe(false)
  })

  it('80% засчитывается', () => {
    expect(shouldCountListen(80, 100)).toBe(true)
  })

  it('81% засчитывается', () => {
    expect(shouldCountListen(81, 100)).toBe(true)
  })

  it('100% засчитывается', () => {
    expect(shouldCountListen(100, 100)).toBe(true)
  })

  it('duration=0 → false', () => {
    expect(shouldCountListen(0, 0)).toBe(false)
  })

  it('duration отрицательный → false', () => {
    expect(shouldCountListen(10, -1)).toBe(false)
  })
})

describe('isForwardSeek', () => {
  it('маленький прыжок вперёд при playing → не перемотка', () => {
    expect(isForwardSeek(10, 10.25, 'playing')).toBe(false)
  })

  it('большой прыжок вперёд при playing → перемотка', () => {
    expect(isForwardSeek(10, 90, 'playing')).toBe(true)
  })

  it('прыжок вперёд при paused → не перемотка (уже не playing)', () => {
    expect(isForwardSeek(10, 90, 'paused')).toBe(false)
  })

  it('прыжок назад при playing → не перемотка', () => {
    expect(isForwardSeek(90, 10, 'playing')).toBe(false)
  })

  it('ровно 3 секунды → не перемотка (граница)', () => {
    expect(isForwardSeek(10, 13, 'playing')).toBe(false)
  })

  it('чуть больше 3 секунд → перемотка', () => {
    expect(isForwardSeek(10, 13.1, 'playing')).toBe(true)
  })
})
