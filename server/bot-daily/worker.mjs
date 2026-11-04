/**
 * «Трек дня» в канале «Аф».
 *
 * Каждый день в 10:00 МСК берёт манифест каталога, выбирает трек по номеру дня
 * (116 треков — 116 дней без повторов) и публикует обложку с кнопками
 * «Слушать» и «Вся кассета». Обе открывают мини-приложение на нужном месте.
 *
 * Ручной запуск: GET /run?key=<CRON_KEY> — чтобы проверить или запостить сейчас.
 */

const API = 'https://api.telegram.org'

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c))
}

async function loadTracks(env) {
  const response = await fetch(`${env.APP_URL}/content/manifest.json`, { cf: { cacheTtl: 600 } })
  if (!response.ok) throw new Error(`манифест: ${response.status}`)
  const data = await response.json()
  const tracks = []
  for (const release of data.releases ?? []) {
    for (const track of release.tracks ?? []) {
      tracks.push({ ...track, releaseTitle: release.title, year: release.year })
    }
  }
  return tracks
}

async function postDay(env) {
  const tracks = await loadTracks(env)
  if (tracks.length === 0) throw new Error('каталог пуст')

  const day = Math.floor(Date.now() / 86_400_000)
  const track = tracks[day % tracks.length]

  const caption = [
    '<b>Трек дня</b>',
    `<b>${escapeHtml(track.title)}</b>`,
    `${escapeHtml(track.releaseTitle)} · ${track.year}`,
  ].join('\n')

  const response = await fetch(`${API}/bot${env.BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.CHANNEL_ID,
      photo: `${env.APP_URL}${track.cover}`,
      caption,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Слушать', web_app: { url: `${env.APP_URL}/?track=${encodeURIComponent(track.id)}` } },
          { text: 'Вся кассета', web_app: { url: `${env.APP_URL}/?release=${encodeURIComponent(track.releaseId)}` } },
        ]],
      },
    }),
  })

  const data = await response.json().catch(() => null)
  if (!data || data.ok !== true) {
    throw new Error(`sendPhoto: ${data?.description ?? `HTTP ${response.status}`}`)
  }
  return { track: track.id, title: track.title, message_id: data.result.message_id }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(postDay(env).catch((e) => console.error('daily failed:', e.message)))
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/run') {
      const key = url.searchParams.get('key') ?? ''
      if (key === '' || key !== env.CRON_KEY) return new Response('forbidden', { status: 403 })
      try {
        return Response.json(await postDay(env))
      } catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
      }
    }
    if (url.pathname === '/debug') {
      if (url.searchParams.get('key') !== env.CRON_KEY) return new Response('forbidden', { status: 403 })
      const me = await fetch(`${API}/bot${env.BOT_TOKEN}/getMe`).then((r) => r.json()).catch(() => null)
      return Response.json({
        tokenLength: (env.BOT_TOKEN ?? '').length,
        keyLength: (env.CRON_KEY ?? '').length,
        getMe: me?.ok === true ? me.result.username : me?.description ?? 'no answer',
      })
    }
    return new Response('kishlak daily')
  },
}
