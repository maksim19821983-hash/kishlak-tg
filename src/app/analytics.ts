/**
 * Минимальная статистика: открытия, запуски треков, добавления в избранное.
 * Работает только внутри Телеграма (нужна подпись initData).
 * События копятся и уходят пакетом, чтобы не дёргать сервер на каждое действие.
 */

type Event = { name: 'open' | 'play' | 'favorite'; trackId?: string; releaseId?: string }

const QUEUE: Event[] = []
let timer: number | null = null

function initData(): string {
  try {
    return window.Telegram?.WebApp?.initData ?? ''
  } catch {
    return ''
  }
}

function sessionId(): string {
  try {
    const key = 'kishlak:session'
    const existing = sessionStorage.getItem(key)
    if (existing !== null) return existing
    const fresh = Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem(key, fresh)
    return fresh
  } catch {
    return 'нет'
  }
}

async function flush(): Promise<void> {
  if (QUEUE.length === 0) return
  const events = QUEUE.splice(0, QUEUE.length)
  const data = initData()
  if (data === '') return

  await Promise.all(
    events.map((event) =>
      fetch('/api/event', {
        method: 'POST',
        keepalive: true,
        headers: { 'x-init-data': data, 'content-type': 'application/json' },
        body: JSON.stringify({ ...event, session: sessionId() }),
      }).catch(() => {}),
    ),
  )
}

function schedule(): void {
  if (timer !== null) return
  timer = window.setTimeout(() => {
    timer = null
    void flush()
  }, 4000)
}

export function track(event: Event): void {
  if (initData() === '') return
  QUEUE.push(event)
  schedule()
}

/** Дослать накопленное, когда приложение закрывают. */
export function flushAnalytics(): void {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
  void flush()
}
