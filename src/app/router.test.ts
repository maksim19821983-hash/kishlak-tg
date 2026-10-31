import { describe, expect, it } from 'vitest'

// router.ts вешает popstate на window — в node его нет, поэтому подставляем минимальный
Object.assign(globalThis, { window: { addEventListener: () => undefined } })
const { href, parse } = await import('./router')

describe('router', () => {
  it('разбирает все экраны', () => {
    expect(parse('/')).toEqual({ name: 'catalog' })
    expect(parse('/catalog')).toEqual({ name: 'catalog' })
    expect(parse('/release/vdps-2026')).toEqual({ name: 'release', id: 'vdps-2026' })
    expect(parse('/player')).toEqual({ name: 'player' })
    expect(parse('/insert')).toEqual({ name: 'insert' })
    expect(parse('/profile')).toEqual({ name: 'profile' })
    expect(parse('/search')).toEqual({ name: 'search' })
  })

  it('отбрасывает неизвестное', () => {
    expect(parse('/release')).toBeNull()
    expect(parse('/player/1')).toBeNull()
    expect(parse('/nope')).toBeNull()
  })

  it('href обратим', () => {
    const r = { name: 'release', id: 'a b' } as const
    expect(parse(href(r))).toEqual(r)
  })
})
