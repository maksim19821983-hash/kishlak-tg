/**
 * Вебхук бота: /start отвечает карточкой и кнопкой «Открыть плеер».
 *
 * Секрет вебхука — sha256 от BOT_TOKEN (hex), поэтому отдельный секрет не нужен:
 * Telegram присылает его в заголовке X-Telegram-Bot-Api-Secret-Token.
 * BOT_TOKEN уже лежит в переменных Pages (им проверяется initData в /api/sync).
 */

type Env = { BOT_TOKEN: string }

const APP_URL = 'https://kishlak-tg.pages.dev'
const WELCOME_IMAGE = `${APP_URL}/bot/welcome.jpg`

const WELCOME_TEXT = [
  '<b>Весь Кишлак в одном месте.</b>',
  '31 кассета · 116 песен · тексты',
  '',
  'Слушай — и листай вкладыш.',
].join('\n')

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

type Update = {
  message?: {
    text?: string
    chat?: { id?: number }
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
  const message = update?.message
  const text = typeof message?.text === 'string' ? message.text : ''
  const chatId = message?.chat?.id

  if (chatId === undefined || !text.startsWith('/start')) return json({ ok: true })

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: WELCOME_IMAGE,
      caption: WELCOME_TEXT,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Открыть плеер', web_app: { url: APP_URL } }]],
      },
    }),
  }).catch(() => null)

  // в ответ Telegram отдаём только факт, без токена и тела ошибки
  if (response === null || !response.ok) {
    console.error('sendPhoto failed', response?.status ?? 'network')
    return json({ ok: false }, 200)
  }
  return json({ ok: true })
}
