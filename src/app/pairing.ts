/** Привязка браузера к аккаунту Телеграма: код из мини-аппа + токен устройства. */

import { REMOTE_URL } from './remoteSync'

const TOKEN_KEY = 'kishlak:device-token:v1'

export function deviceToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveDeviceToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* приватный режим */
  }
}

export function clearDeviceToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ничего */
  }
}

function initData(): string {
  try {
    return window.Telegram?.WebApp?.initData ?? ''
  } catch {
    return ''
  }
}

/** В мини-аппе: получить код, который нужно ввести в браузере. */
export async function createPairCode(): Promise<string> {
  if (REMOTE_URL === '') throw new Error('сервер не настроен')
  const response = await fetch(`${REMOTE_URL.replace(/\/$/, '')}/pair/create`, {
    method: 'POST',
    headers: { 'x-init-data': initData() },
  })
  if (!response.ok) throw new Error(`сервер ответил ${response.status}`)
  const data = (await response.json()) as { code?: string }
  if (!data.code) throw new Error('код не получен')
  return data.code
}

/** В браузере: обменять код на токен устройства. */
export async function claimPairCode(code: string): Promise<void> {
  if (REMOTE_URL === '') throw new Error('сервер не настроен')
  const response = await fetch(`${REMOTE_URL.replace(/\/$/, '')}/pair/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (response.status === 404) throw new Error('код не найден или истёк')
  if (!response.ok) throw new Error(`сервер ответил ${response.status}`)
  const data = (await response.json()) as { token?: string }
  if (!data.token) throw new Error('токен не получен')
  saveDeviceToken(data.token)
}
