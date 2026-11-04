/**
 * Проверка подписки для мини-приложения.
 * Авторизация — initData Телеграма; id пользователя берём из подписи,
 * а не из тела запроса, поэтому подделать нельзя.
 */

import { isSubscribed, verifyInitData } from '../_lib/channel'

type Env = { BOT_TOKEN: string }

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context
  if (request.method !== 'POST') return json({ error: 'method' }, 405)

  const token = env.BOT_TOKEN ?? ''
  if (token === '') return json({ error: 'нет секрета BOT_TOKEN' }, 503)

  const initData = request.headers.get('x-init-data') ?? ''
  const userId = await verifyInitData(initData, token)
  if (userId === null) return json({ error: 'bad signature' }, 401)

  try {
    const subscribed = await isSubscribed(token, userId)
    return json({ subscribed })
  } catch (e) {
    // текст ошибки не содержит токена: это описание от Telegram
    return json({ error: e instanceof Error ? e.message : 'check failed' }, 502)
  }
}
