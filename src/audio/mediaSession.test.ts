import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupMediaSession } from './mediaSession'

type Call = { action: string; handler: unknown }

function makeFakeSession() {
  const calls: Call[] = []
  return {
    calls,
    session: {
      setActionHandler(action: string, handler: unknown) {
        calls.push({ action, handler })
      },
      metadata: null,
      playbackState: 'none',
    },
  }
}

const handlers = {
  play: vi.fn(),
  pause: vi.fn(),
  prev: vi.fn(),
  next: vi.fn(),
}

describe('Media Session: локскрин', () => {
  let fake: ReturnType<typeof makeFakeSession>

  beforeEach(() => {
    fake = makeFakeSession()
    vi.stubGlobal('navigator', { mediaSession: fake.session })
  })

  it('регистрирует переключение треков', () => {
    setupMediaSession(handlers)
    const actions = fake.calls.map((c) => c.action)
    expect(actions).toContain('previoustrack')
    expect(actions).toContain('nexttrack')
    expect(actions).toContain('play')
    expect(actions).toContain('pause')
  })

  it('prev и next идут раньше play/pause', () => {
    setupMediaSession(handlers)
    const actions = fake.calls.map((c) => c.action)
    expect(actions.indexOf('previoustrack')).toBeLessThan(actions.indexOf('play'))
    expect(actions.indexOf('nexttrack')).toBeLessThan(actions.indexOf('play'))
  })

  it('НЕ объявляет перемотку — иначе iOS показывает ±10 вместо ⏮⏭', () => {
    setupMediaSession(handlers)
    const seekCalls = fake.calls.filter((c) => c.action.startsWith('seek'))
    expect(seekCalls.length).toBeGreaterThan(0)
    for (const call of seekCalls) {
      expect(call.handler).toBeNull()
    }
  })

  it('снимает обработчики при остановке', () => {
    const dispose = setupMediaSession(handlers)
    const before = fake.calls.length
    dispose()
    const cleared = fake.calls.slice(before)
    expect(cleared.every((c) => c.handler === null)).toBe(true)
  })

  it('падение одного setActionHandler не мешает остальным', () => {
    const broken = makeFakeSession()
    ;(broken.session as { setActionHandler: unknown }).setActionHandler = (action: string, handler: unknown) => {
      if (action === 'previoustrack') throw new TypeError('unsupported')
      broken.calls.push({ action, handler })
    }
    vi.stubGlobal('navigator', { mediaSession: broken.session })

    setupMediaSession(handlers)
    const actions = broken.calls.map((c) => c.action)
    expect(actions).toContain('nexttrack')
    expect(actions).toContain('play')
  })
})
