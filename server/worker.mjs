/**
 * Синхронизация состояния плеера между устройствами.
 * Хранит JSON в KV по id пользователя Телеграма.
 * Авторизация — подпись initData, ключ = токен бота (никогда не уходит в клиент).
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-init-data',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}

async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)))
}

function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Проверяет подпись initData и возвращает id пользователя. */
async function verifyInitData(initData, botToken) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')

  const secret = await hmac('WebAppData', botToken)
  const signature = toHex(await hmac(secret, dataCheckString))
  if (signature !== hash) return null

  const user = params.get('user')
  if (!user) return null
  try {
    return JSON.parse(user).id ?? null
  } catch {
    return null
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

    const initData = request.headers.get('x-init-data') ?? ''
    const userId = await verifyInitData(initData, env.BOT_TOKEN)
    if (userId === null) return json({ error: 'bad signature' }, 401)

    const key = `state:${userId}`
    const url = new URL(request.url)

    if (request.method === 'GET') {
      const raw = await env.STATE.get(key)
      return json({ state: raw === null ? null : JSON.parse(raw) })
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (body === null || typeof body !== 'object') return json({ error: 'bad body' }, 400)
      const text = JSON.stringify(body)
      if (text.length > 100_000) return json({ error: 'too large' }, 413)
      await env.STATE.put(key, text)
      return json({ ok: true, bytes: text.length })
    }

    return json({ error: 'method' }, 405)
  },
}
