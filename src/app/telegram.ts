// Единственное место, где разрешено трогать window.Telegram.

import type { WebApp } from 'telegram-web-app'

export function safeTelegram(): WebApp | null {
  try {
    const app = window.Telegram?.WebApp
    // Скрипт SDK грузится и вне Телеграма; initData пуст, если мы не в клиенте
    return app && app.initData !== '' ? app : null
  } catch {
    return null
  }
}

function call(fn: (app: WebApp) => void): void {
  const app = safeTelegram()
  if (!app) return
  try {
    fn(app)
  } catch {
    // старые клиенты не знают части методов — молча пропускаем
  }
}

export function ready(): void {
  call((app) => app.ready())
}

export function expand(): void {
  call((app) => app.expand())
}

export function disableVerticalSwipes(): void {
  call((app) => app.disableVerticalSwipes())
}

export function setHeaderColor(color: `#${string}`): void {
  call((app) => app.setHeaderColor(color))
}

export function setBackgroundColor(color: `#${string}`): void {
  call((app) => app.setBackgroundColor(color))
}


/**
 * SDK Телеграма грузим сами и неблокирующе: если telegram.org недоступен (бывает в РФ),
 * приложение всё равно отрисуется, а Telegram-функции просто не сработают.
 */
let sdkPromise: Promise<void> | null = null

export function ensureSdk(timeoutMs = 3000): Promise<void> {
  if (sdkPromise) return sdkPromise
  if (window.Telegram?.WebApp) {
    sdkPromise = Promise.resolve()
    return sdkPromise
  }
  sdkPromise = new Promise<void>((resolve) => {
    const script = document.createElement('script')
    let settled = false
    const done = (): void => {
      if (settled) return
      settled = true
      resolve()
    }
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.async = true
    script.onload = done
    script.onerror = done
    window.setTimeout(done, timeoutMs)
    document.head.appendChild(script)
  })
  return sdkPromise
}

export function initTelegram(): void {
  // Рендер не ждёт SDK: инициализация догоняет, когда скрипт загрузится или отвалится.
  void ensureSdk().then(() => {
    ready()
    expand()
    disableVerticalSwipes()
  })
}
