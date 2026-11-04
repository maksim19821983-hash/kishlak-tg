/**
 * Вебхук бота «Аф»: /start открывает плеер только подписчикам канала.
 *
 * Секрет вебхука — sha256 от BOT_TOKEN (hex), отдельный секрет не нужен:
 * Telegram присылает его в заголовке X-Telegram-Bot-Api-Secret-Token.
 * BOT_TOKEN уже лежит в переменных Pages (им проверяется initData в /api/sync).
 */

import { CHANNEL_URL, isSubscribed } from '../_lib/channel'

type Env = { BOT_TOKEN: string }

const APP_URL = 'https://kishlak-tg.pages.dev'
const WELCOME_IMAGE = `${APP_URL}/bot/welcome.jpg`

const WELCOME_TEXT = [
  '<b>Весь Кишлак в одном месте</b>',
  '31 кассета · 116 песен',
].join('\n')

const GATE_TEXT = [
  '<b>Сначала подписка.</b>',
  'Плеер открывается для подписчиков канала «Аф».',
].join('\n')

const CHECK_ERROR_TEXT = 'Не получилось проверить подписку. Попробуй ещё раз.'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function api(token: string, method: string, body: unknown): Promise<boolean> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null)
  if (response === null || !response.ok) {
    console.error(method, 'failed', response?.status ?? 'network')
    return false
  }
  return true
}

const GATE_KEYBOARD = {
  inline_keyboard: [
    [{ text: 'Подписаться', url: CHANNEL_URL }],
    [{ text: 'Я подписался', callback_data: 'gate:check' }],
  ],
}

function sendWelcome(token: string, chatId: number): Promise<boolean> {
  return api(token, 'sendPhoto', {
    chat_id: chatId,
    photo: WELCOME_IMAGE,
    caption: WELCOME_TEXT,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Открыть плеер', web_app: { url: APP_URL } }]],
    },
  })
}

function sendGate(token: string, chatId: number, text = GATE_TEXT): Promise<boolean> {
  return api(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: GATE_KEYBOARD,
  })
}

type Update = {
  message?: {
    text?: string
    chat?: { id?: number }
    from?: { id?: number }
  }
  callback_query?: {
    id: string
    data?: string
    from?: { id?: number }
    message?: { chat?: { id?: number }; message_id?: number }
  }
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context
  if (request.method !== 'POST') return new Response('ok')

  const token = env.BOT_TOKEN ?? ''
  if (token === '') return json({ error: 'нет секрета BOT_TOKEN' }, 503)

  const expected = await sha256Hex(token)
  const got = request.headers.get('x-telegram-bot-api-secret-token') ?? ''
  if (got !== expected) return json({ error: 'forbidden' }, 403)

  const update = (await request.json().catch(() => null)) as Update | null
  if (update === null) return json({ ok: true })

  // ── /start: пускаем только подписчиков ────────────────────────────────
  const message = update.message
  if (message?.chat?.id !== undefined && message.from?.id !== undefined) {
    const text = typeof message.text === 'string' ? message.text : ''
    if (!text.startsWith('/start')) return json({ ok: true })

    try {
      const subscribed = await isSubscribed(token, message.from.id)
      if (subscribed) await sendWelcome(token, message.chat.id)
      else await sendGate(token, message.chat.id)
    } catch {
      await sendGate(token, message.chat.id, CHECK_ERROR_TEXT)
    }
    return json({ ok: true })
  }

  // ── «Я подписался»: перепроверяем ──────────────────────────────────────
  const callback = update.callback_query
  if (callback !== undefined) {
    const chatId = callback.message?.chat?.id
    const userId = callback.from?.id
    const messageId = callback.message?.message_id

    if (callback.data !== 'gate:check' || chatId === undefined || userId === undefined) {
      await api(token, 'answerCallbackQuery', { callback_query_id: callback.id })
      return json({ ok: true })
    }

    try {
      const subscribed = await isSubscribed(token, userId)
      if (!subscribed) {
        await api(token, 'answerCallbackQuery', {
          callback_query_id: callback.id,
          text: 'Подписки пока нет. Подпишись и нажми ещё раз.',
          show_alert: true,
        })
        return json({ ok: true })
      }

      await api(token, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'Готово' })
      if (messageId !== undefined) {
        await api(token, 'editMessageReplyMarkup', {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        })
      }
      await sendWelcome(token, chatId)
    } catch {
      await api(token, 'answerCallbackQuery', {
        callback_query_id: callback.id,
        text: 'Не удалось проверить подписку. Попробуй ещё раз.',
        show_alert: true,
      })
    }
    return json({ ok: true })
  }

  return json({ ok: true })
}
