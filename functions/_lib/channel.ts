/**
 * Общее для функций: канал-шлагбаум и проверка initData.
 * Канал «Аф» — обязательная подписка для входа в плеер.
 */

export const CHANNEL_ID = '-1003977368931'
export const CHANNEL_URL = 'https://t.me/Kishlak_music_tgk'

const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member'])

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmac(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
  const raw = typeof key === 'string' ? new TextEncoder().encode(key) : new Uint8Array(key)
  const cryptoKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
}

/** Проверяет подпись initData и возвращает id пользователя. */
export async function verifyInitData(initData: string, botToken: string): Promise<number | null> {
  if (initData === '' || botToken === '') return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (hash === null) return null
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')

  const secret = await hmac('WebAppData', botToken)
  const signature = toHex(await hmac(secret, dataCheckString))
  if (signature !== hash) return null

  const user = params.get('user')
  if (user === null) return null
  try {
    const parsed = JSON.parse(user) as { id?: number }
    return typeof parsed.id === 'number' ? parsed.id : null
  } catch {
    return null
  }
}

/**
 * Подписан ли пользователь на канал. Бот обязан быть админом канала,
 * иначе Telegram не отдаст статус и функция бросит ошибку.
 */
export async function isSubscribed(botToken: string, userId: number): Promise<boolean> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHANNEL_ID, user_id: userId }),
  })

  const data = (await response.json().catch(() => null)) as
    | { ok: true; result: { status?: string; is_member?: boolean } }
    | { ok: false; description?: string }
    | null

  if (data === null) throw new Error('Telegram не ответил')
  if (!data.ok) {
    const description = data.description ?? ''
    const lower = description.toLowerCase()
    // канал не найден — это ошибка настройки, пусть будет видно
    if (lower.includes('chat not found')) throw new Error(description)
    // пользователь не открывал канал — он точно не подписан
    if (lower.includes('user not found') || lower.includes('member not found')) return false
    throw new Error(description || 'Не удалось проверить подписку')
  }

  const status = data.result.status ?? ''
  if (status === 'restricted') return data.result.is_member === true
  return MEMBER_STATUSES.has(status)
}
