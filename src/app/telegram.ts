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

export function initTelegram(): void {
  ready()
  expand()
  disableVerticalSwipes()
}
