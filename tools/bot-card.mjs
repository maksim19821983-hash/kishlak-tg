/**
 * Карточка бота: имя, описания, аватар, меню-кнопка, команды и вебхук.
 *
 * Токен берётся из .env.local (BOT_TOKEN=...), в репозиторий не попадает.
 *
 *   node tools/bot-card.mjs --check      показать, что сейчас на боте
 *   node tools/bot-card.mjs              применить карточку
 *   node tools/bot-card.mjs --webhook    ещё и включить /start
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))

const APP_URL = 'https://kishlak-tg.pages.dev'
const API = 'https://api.telegram.org'

const NAME = 'Кишлак — плеер'
const SHORT = 'Плеер-кассета: 31 кассета, 116 песен, тексты. Один тап — и играет.'
const DESCRIPTION = [
  'Кишлак — весь архив в одном месте: 31 кассета, 116 песен, тексты и вкладыши.',
  'Кассета крутит катушки, лента наматывается, текст идёт за песней.',
  'Нажми «Открыть плеер» — музыка начнётся в один тап.',
].join('\n\n')
const MENU = { type: 'web_app', text: 'Открыть плеер', web_app: { url: APP_URL } }
const COMMANDS = [{ command: 'start', description: 'открыть плеер' }]

function loadEnv() {
  const p = resolve(root, '.env.local')
  if (!existsSync(p)) return {}
  const out = {}
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

const env = loadEnv()
const token = process.env.BOT_TOKEN ?? env.BOT_TOKEN ?? ''
if (!token) {
  console.error('Нет BOT_TOKEN: положи его в .env.local строкой BOT_TOKEN=...')
  process.exit(1)
}

const call = async (method, body) => {
  const r = await fetch(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: body instanceof FormData ? undefined : { 'content-type': 'application/json' },
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
  const data = await r.json().catch(() => null)
  if (!data || data.ok !== true) {
    const reason = data?.description ?? `HTTP ${r.status}`
    throw new Error(`${method}: ${reason}`)
  }
  return data.result
}

const bytes = (p) => new Uint8Array(readFileSync(resolve(root, p)))

async function check() {
  const me = await call('getMe', {})
  const webhook = await call('getWebhookInfo', {})
  console.log(`бот: @${me.username} (${me.first_name})`)
  console.log(`имя: ${me.first_name}`)
  console.log(`вебхук: ${webhook.url || 'не задан'}`)
}

async function apply() {
  const me = await call('getMe', {})
  await call('setMyName', { name: NAME })
  await call('setMyShortDescription', { short_description: SHORT })
  await call('setMyDescription', { description: DESCRIPTION })
  await call('setMyCommands', { commands: COMMANDS })
  await call('setChatMenuButton', { menu_button: MENU })

  // аватар: static-фото только .JPG и только новой загрузкой
  const photo = new FormData()
  photo.append('photo', JSON.stringify({ type: 'static', photo: 'attach://avatar' }))
  photo.append('avatar', new Blob([bytes('design/bot/avatar-512.jpg')], { type: 'image/jpeg' }), 'avatar.jpg')
  await call('setMyProfilePhoto', photo)

  console.log(`готово: @${me.username} — «${NAME}»`)
  console.log(`меню: ${MENU.text} → ${APP_URL}`)
}

async function webhook() {
  const secret = [...new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
  )].map((b) => b.toString(16).padStart(2, '0')).join('')

  const url = `${APP_URL}/api/bot`
  await call('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  })
  const info = await call('getWebhookInfo', {})
  console.log(`вебхук: ${info.url}`)
  console.log(`ошибок: ${info.last_error_message ?? 'нет'}`)
}

try {
  if (args.has('--check')) {
    await check()
  } else {
    await apply()
    if (args.has('--webhook')) await webhook()
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
}
