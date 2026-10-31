import { describe, it, expect } from 'vitest'
import { shuffleOrder, nextIndex, prevIndex, clampIndex } from './queue'

// ─── shuffleOrder ─────────────────────────────────────────────────────────────

describe('shuffleOrder', () => {
  it('пустая очередь → []', () => {
    expect(shuffleOrder(0, 0)).toEqual([])
  })

  it('один трек → [0]', () => {
    expect(shuffleOrder(1, 0)).toEqual([0])
  })

  it('текущий трек всегда первый', () => {
    for (let keep = 0; keep < 5; keep++) {
      expect(shuffleOrder(5, keep)[0]).toBe(keep)
    }
  })

  it('содержит все индексы ровно по одному разу', () => {
    const order = shuffleOrder(6, 2)
    expect(order.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5])
  })
})

// ─── nextIndex ────────────────────────────────────────────────────────────────

describe('nextIndex — пустая очередь', () => {
  it('всегда null', () => {
    expect(nextIndex(0, 0, 'off')).toBeNull()
    expect(nextIndex(0, 0, 'all')).toBeNull()
    expect(nextIndex(0, 0, 'one', 'ended')).toBeNull()
  })
})

describe('nextIndex — один трек', () => {
  it('repeat:off, ended → null', () => {
    expect(nextIndex(0, 1, 'off', 'ended')).toBeNull()
  })
  it('repeat:off, user → null', () => {
    expect(nextIndex(0, 1, 'off', 'user')).toBeNull()
  })
  it('repeat:all → 0 (оборот)', () => {
    expect(nextIndex(0, 1, 'all', 'ended')).toBe(0)
  })
  it('repeat:one, ended → 0 (тот же)', () => {
    expect(nextIndex(0, 1, 'one', 'ended')).toBe(0)
  })
  it('repeat:one, user → 0 (оборот)', () => {
    expect(nextIndex(0, 1, 'one', 'user')).toBe(0)
  })
})

describe('nextIndex — несколько треков', () => {
  it('repeat:off, не последний → следующий', () => {
    expect(nextIndex(1, 5, 'off')).toBe(2)
  })
  it('repeat:off, последний → null', () => {
    expect(nextIndex(4, 5, 'off', 'ended')).toBeNull()
  })
  it('repeat:all, последний → 0', () => {
    expect(nextIndex(4, 5, 'all', 'ended')).toBe(0)
  })
  it('repeat:one, ended → тот же', () => {
    expect(nextIndex(2, 5, 'one', 'ended')).toBe(2)
  })
  it('repeat:one, user → следующий', () => {
    expect(nextIndex(2, 5, 'one', 'user')).toBe(3)
  })
  it('repeat:one, user, последний → 0', () => {
    expect(nextIndex(4, 5, 'one', 'user')).toBe(0)
  })
})

// ─── prevIndex ────────────────────────────────────────────────────────────────

describe('prevIndex', () => {
  it('0 → 0 (не уходит в минус)', () => {
    expect(prevIndex(0)).toBe(0)
  })
  it('3 → 2', () => {
    expect(prevIndex(3)).toBe(2)
  })
})

// ─── clampIndex ───────────────────────────────────────────────────────────────

describe('clampIndex', () => {
  it('пустая очередь → -1', () => {
    expect(clampIndex(0, 0)).toBe(-1)
  })
  it('в диапазоне → без изменений', () => {
    expect(clampIndex(2, 5)).toBe(2)
  })
  it('отрицательный → 0', () => {
    expect(clampIndex(-1, 5)).toBe(0)
  })
  it('больше длины → последний', () => {
    expect(clampIndex(10, 5)).toBe(4)
  })
})
