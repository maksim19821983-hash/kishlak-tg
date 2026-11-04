/**
 * Синхронизация на своём домене (Cloudflare Pages Function), бесплатно.
 *
 * Хранилище: D1 (100 000 записей в сутки бесплатно) — этого хватает
 * на несколько сотен человек. Если D1 не привязана, работает KV (1000 записей).
 */

type D1Result<T> = { first: () => Promise<T | null>; run: () => Promise<unknown> }
type D1Stmt = { bind: (...values: unknown[]) => D1Result<{ payload: string } | { ok: number }> }
type D1Like = { prepare: (sql: string) => D1Stmt }
type KVLike = { get: (key: string) => Promise<string | null>; put: (key: string, value: string) => Promise<void> }

type Env = { DB?: D1Like; STATE?: KVLike; BOT_TOKEN: string }

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

async function readState(env: Env, userId: number): Promise<unknown> {
  if (env.DB !== undefined) {
    const row = await env.DB.prepare('SELECT payload FROM sync_state WHERE user_id = ?1')
      .bind(String(userId))
      .first()
    if (row === null || !('payload' in row)) return null
    return JSON.parse(row.payload)
  }
  if (env.STATE !== undefined) {
    const raw = await env.STATE.get(`state:${userId}`)
    return raw === null ? null : JSON.parse(raw)
  }
  throw new Error('нет хранилища: привяжите D1 (DB) или KV (STATE)')
}

async function writeState(env: Env, userId: number, payload: string): Promise<void> {
  if (env.DB !== undefined) {
    await env.DB.prepare(
      'INSERT INTO sync_state (user_id, payload, updated_at) VALUES (?1, ?2, ?3) ' +
        'ON CONFLICT(user_id) DO UPDATE SET payload = ?2, updated_at = ?3',
    )
      .bind(String(userId), payload, Date.now())
      .run()
    return
  }
  if (env.STATE !== undefined) {
    await env.STATE.put(`state:${userId}`, payload)
    return
  }
  throw new Error('нет хранилища: привяжите D1 (DB) или KV (STATE)')
}

const handle = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const url = new URL(request.url)
  if (url.searchParams.get('probe') === '1') {
    return json({
      storage: env.DB !== undefined ? 'D1' : env.STATE !== undefined ? 'KV' : 'нет',
      botToken: (env.BOT_TOKEN ?? '') === '' ? 'нет токена' : `есть (${(env.BOT_TOKEN ?? '').length} символов)`,
    })
  }

  if ((env.BOT_TOKEN ?? '') === '') return json({ error: 'нет секрета BOT_TOKEN' }, 503)

  const initData = request.headers.get('x-init-data') ?? ''
  const userId = await verifyInitData(initData, env.BOT_TOKEN)
  if (userId === null) return json({ error: 'bad signature' }, 401)

  if (request.method === 'GET') {
    return json({ state: await readState(env, userId) })
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => null)
    if (body === null || typeof body !== 'object') return json({ error: 'bad body' }, 400)
    const text = JSON.stringify(body)
    if (text.length > 100_000) return json({ error: 'too large' }, 413)
    await writeState(env, userId, text)
    return json({ ok: true, bytes: text.length })
  }

  return json({ error: 'method' }, 405)
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  try {
    return await handle(context)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}
