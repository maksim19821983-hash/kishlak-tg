/** Проверка подписки на канал перед входом в плеер. */

export type GateResult = 'allowed' | 'blocked' | 'error'

function initData(): string {
  try {
    return window.Telegram?.WebApp?.initData ?? ''
  } catch {
    return ''
  }
}

/**
 * В браузере проверять нечего — пускаем.
 * В Телеграме решает сервер: подпись initData + getChatMember.
 */
export async function checkGate(): Promise<GateResult> {
  const data = initData()
  if (data === '') return 'allowed'

  try {
    const response = await fetch('/api/gate', {
      method: 'POST',
      headers: { 'x-init-data': data },
    })
    if (!response.ok) return 'error'
    const body = (await response.json()) as { subscribed?: boolean }
    return body.subscribed === true ? 'allowed' : 'blocked'
  } catch {
    return 'error'
  }
}
