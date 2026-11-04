/**
 * Приём событий статистики. Одна запись в D1 на событие.
 * Ничего личного: только хеш пользователя, имя события и идентификаторы трека.
 */

import { verifyInitData } from '../_lib/channel'

type Env = { DB?: D1Like; BOT_TOKEN: string; STATS_SALT?: string }

type D1Like = {
  prepare: (sql: string) => { bind: (...values: unknown[]) => { first: <T>() => Promise<T | null>; run: () => Promise<unknown> } }
}

type Body = { name?: string; trackId?: string; releaseId?: string; session?: string }

const ALLOWED = new Set(['open', 'play', 'favorite'])

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-init-data',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } })
}

async function hashUser(userId: number, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${userId}:${salt}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const handle = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'method' }, 405)
  if (env.DB === undefined) return json({ error: 'нет D1' }, 503)

  const initData = request.headers.get('x-init-data') ?? ''
  const userId = await verifyInitData(initData, env.BOT_TOKEN ?? '')
  if (userId === null) return json({ error: 'bad signature' }, 401)

  const body = (await request.json().catch(() => null)) as Body | null
  if (body === null || typeof body.name !== 'string' || !ALLOWED.has(body.name)) {
    return json({ error: 'bad body' }, 400)
  }

  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  const userHash = await hashUser(userId, env.STATS_SALT ?? 'kishlak')

  await env.DB.prepare(
    'INSERT INTO events (user_hash, name, track_id, release_id, day, ts, session) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)',
  )
    .bind(userHash, body.name, body.trackId ?? null, body.releaseId ?? null, day, Date.now(), body.session ?? null)
    .run()

  return json({ ok: true })
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  try {
    return await handle(context)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}
