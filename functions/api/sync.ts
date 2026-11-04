/**
 * Синхронизация на том же домене, что и сайт (Cloudflare Pages Function).
 * Тот же путь /api/sync, никакого CORS: запрос идёт на собственный адрес.
 * Требует привязку KV как STATE и секрет BOT_TOKEN в настройках Pages.
 */

type Env = { STATE: KVNamespace; BOT_TOKEN: string }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-init-data',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sign(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
  const raw = typeof key === 'string' ? new TextEncoder().encode(key) : new Uint8Array(key)
  const cryptoKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
}

/** Проверка подписи initData токеном бота. */
async function verifyInitData(initData: string, botToken: string): Promise<number | null> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (hash === null) return null
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')

  const secret = await sign('WebAppData', botToken)
  const signature = toHex(await sign(secret, dataCheckString))
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

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  try {
    return await handle(context)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

const handle = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // проверка настроек без подписи: открывается в браузере, показывает чего не хватает
  const url = new URL(request.url)
  if (url.searchParams.get('probe') === '1') {
    return json({
      kv: env.STATE === undefined ? 'нет привязки STATE' : 'ок',
      botToken: (env.BOT_TOKEN ?? '') === '' ? 'нет токена' : `есть (${(env.BOT_TOKEN ?? '').length} символов)`,
    })
  }

  if (env.STATE === undefined) return json({ error: 'KV не привязано к проекту' }, 503)
  if ((env.BOT_TOKEN ?? '') === '') return json({ error: 'нет секрета BOT_TOKEN' }, 503)

  const initData = request.headers.get('x-init-data') ?? ''
  const userId = await verifyInitData(initData, env.BOT_TOKEN ?? '')
  if (userId === null) return json({ error: 'bad signature' }, 401)

  const key = `state:${userId}`

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
}
