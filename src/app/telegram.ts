// Единственное место, где разрешено трогать window.Telegram.

import { useSyncExternalStore } from 'react'
import type { WebApp } from 'telegram-web-app'

export type TelegramStatus = 'loading' | 'ready' | 'browser'

let status: TelegramStatus = 'loading'
const statusListeners = new Set<() => void>()

function setStatus(next: TelegramStatus): void {
  status = next
  statusListeners.forEach((fn) => fn())
}

export function getTelegramStatus(): TelegramStatus { return status }

export function subscribeTelegramStatus(fn: () => void): () => void {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

export function useTelegramStatus(): TelegramStatus {
  return useSyncExternalStore(subscribeTelegramStatus, getTelegramStatus)
}

export function safeTelegram(): WebApp | null {
  try {
    const app = window.Telegram?.WebApp
    return app && app.initData !== '' ? app : null
  } catch {
    return null
  }
}

function call<T>(fn: (app: WebApp) => T): T | undefined {
  const app = safeTelegram()
  if (!app) return undefined
  try { return fn(app) } catch { return undefined }
}

// ── Haptics ──────────────────────────────────────────────────────────────────

type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

export function haptic(kind: HapticKind): void {
  call((app) => {
    if (kind === 'success' || kind === 'warning' || kind === 'error') {
      app.HapticFeedback.notificationOccurred(kind)
    } else {
      app.HapticFeedback.impactOccurred(kind)
    }
  })
}

/** @deprecated Используй haptic() */
export const HapticFeedback = {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void {
    call((app) => app.HapticFeedback.impactOccurred(style))
  },
  notificationOccurred(type: 'error' | 'success' | 'warning'): void {
    call((app) => app.HapticFeedback.notificationOccurred(type))
  },
  selectionChanged(): void {
    call((app) => app.HapticFeedback.selectionChanged())
  },
}

// ── BackButton ───────────────────────────────────────────────────────────────

let backHandler: (() => void) | null = null

export function showBackButton(handler: () => void): void {
  call((app) => {
    if (backHandler) app.BackButton.offClick(backHandler)
    backHandler = handler
    app.BackButton.onClick(handler)
    app.BackButton.show()
  })
}

export function hideBackButton(): void {
  call((app) => {
    if (backHandler) { app.BackButton.offClick(backHandler); backHandler = null }
    app.BackButton.hide()
  })
}

// ── Цвета ────────────────────────────────────────────────────────────────────

export function setHeaderColor(color: `#${string}`): void {
  call((app) => app.setHeaderColor(color))
}

export function setBackgroundColor(color: `#${string}`): void {
  call((app) => app.setBackgroundColor(color))
}

// ── Навигация / ссылки ────────────────────────────────────────────────────────

export function openLink(url: string): void {
  call((app) => app.openLink(url))
}

export function openTelegramLink(url: string): void {
  call((app) => app.openTelegramLink(url))
}

// ── Пользователь ─────────────────────────────────────────────────────────────

export function getUser(): { id: number; username?: string } | null {
  const app = safeTelegram()
  if (!app) return null
  try {
    const u = app.initDataUnsafe?.user
    return u ? { id: u.id, username: u.username } : null
  } catch { return null }
}

// ── Deep link ─────────────────────────────────────────────────────────────────

export function getStartParam(): string | null {
  try {
    const app = safeTelegram()
    return app?.initDataUnsafe?.start_param ?? null
  } catch { return null }
}

// ── SDK ───────────────────────────────────────────────────────────────────────

export function ready(): void { call((app) => app.ready()) }
export function expand(): void { call((app) => app.expand()) }
export function disableVerticalSwipes(): void { call((app) => app.disableVerticalSwipes()) }

/** Отступы, которые Telegram добавляет в полноэкранном режиме под свои кнопки. */
function applySafeAreas(app: WebApp): void {
  const root = document.documentElement
  const content = (app as WebApp & { contentSafeAreaInset?: { top?: number } }).contentSafeAreaInset
  const safe = (app as WebApp & { safeAreaInset?: { top?: number } }).safeAreaInset
  const top = Math.max(content?.top ?? 0, safe?.top ?? 0)
  root.style.setProperty('--tg-safe-top', `${top}px`)
}

/** Полноэкранный режим (Bot API 8.0+). На старых клиентах тихо игнорируется. */
/** Полноэкранный режим включаем только на телефоне: на десктопе нужна обычная панель. */
function isMobileClient(): boolean {
  try {
    const platform = window.Telegram?.WebApp?.platform ?? ''
    if (platform === 'ios' || platform === 'android') return true
    if (platform !== '') return false
  } catch {
    /* без SDK — смотрим на экран */
  }
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches && window.innerWidth < 820
}

export function requestFullscreen(): void {
  if (!isMobileClient()) return
  try {
    const app = window.Telegram?.WebApp as (WebApp & { requestFullscreen?: () => void }) | undefined
    app?.requestFullscreen?.()
  } catch {
    /* не поддерживается — остаёмся в обычном режиме */
  }
}

/** Свернуть полноэкранный режим обратно в окно (нужно на десктопе). */
export function exitFullscreen(): void {
  try {
    const app = window.Telegram?.WebApp as (WebApp & { exitFullscreen?: () => void; isFullscreen?: boolean }) | undefined
    if (app?.isFullscreen) app.exitFullscreen?.()
  } catch {}
}

let sdkPromise: Promise<void> | null = null

export function ensureSdk(timeoutMs = 3000): Promise<void> {
  if (sdkPromise) return sdkPromise
  if (window.Telegram?.WebApp) { sdkPromise = Promise.resolve(); return sdkPromise }
  sdkPromise = new Promise<void>((resolve) => {
    const script = document.createElement('script')
    let settled = false
    const done = (): void => { if (settled) return; settled = true; resolve() }
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
  void ensureSdk().then(() => {
    const app = safeTelegram()
    setStatus(app ? 'ready' : 'browser')
    if (!app) return
    ready()
    expand()
    disableVerticalSwipes()
    requestFullscreen()
    applySafeAreas(app)
    try {
      app.onEvent('viewportChanged', () => applySafeAreas(app))
      app.onEvent('fullscreenChanged', () => applySafeAreas(app))
    } catch {}

    // на десктопе принудительно выходим из полноэкранного режима
    if (!isMobileClient()) exitFullscreen()

    // некоторые клиенты разрешают полноэкранный режим только после касания
    if (isMobileClient() && !app.isFullscreen) {
      const once = () => {
        if (!app.isFullscreen) requestFullscreen()
        window.removeEventListener('pointerdown', once)
      }
      window.addEventListener('pointerdown', once, { once: true })
    }

    // синхронизировать цвет при старте
    const pol = document.documentElement.dataset.polarity ?? 'dark'
    const bg = pol === 'paper' ? '#EDE7DC' : '#0B0B0C'
    setHeaderColor(bg as `#${string}`)
    setBackgroundColor(bg as `#${string}`)

    // повторная активация (приложение уже открыто)
    try {
      app.onEvent('activated', () => {
        // сброс состояния не нужен, deep link обрабатывается через URL
      })
    } catch {}
  })
}
