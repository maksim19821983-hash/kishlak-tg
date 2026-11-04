/**
 * Сводка статистики. Закрыта ключом: /api/stats?key=...
 * Секрет STATS_KEY задаётся в настройках Pages.
 */

type D1Like = {
  prepare: (sql: string) => { bind: (...values: unknown[]) => { all: <T>() => Promise<{ results: T[] }>; first: <T>() => Promise<T | null> } }
}

type Env = { DB?: D1Like; STATS_KEY?: string }

type Row = Record<string, number | string | null>

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json' } })
}

const handle = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context
  if (env.DB === undefined) return json({ error: 'нет D1: запусти tools/setup-d1.sh' }, 503)

  const key = new URL(request.url).searchParams.get('key') ?? ''
  const expected = env.STATS_KEY ?? ''
  if (expected === '' || key !== expected) return json({ error: 'нужен ключ' }, 401)

  const db = env.DB
  const all = async (sql: string, ...values: unknown[]): Promise<Row[]> => (await db.prepare(sql).bind(...values).all<Row>()).results
  const one = async (sql: string, ...values: unknown[]): Promise<Row | null> => db.prepare(sql).bind(...values).first<Row>()

  const today = new Date().toISOString().slice(0, 10)

  const [totals, users, todayRow, retention, daily, tracks, perUser] = await Promise.all([
    all(`SELECT name, COUNT(*) AS n FROM events GROUP BY name`),
    one(`SELECT COUNT(DISTINCT user_hash) AS users FROM events`),
    one(`SELECT COUNT(DISTINCT user_hash) AS users, COUNT(*) AS events FROM events WHERE day = ?1`, today),
    one(`SELECT COUNT(*) AS returning FROM (SELECT user_hash FROM events WHERE name = 'open' GROUP BY user_hash HAVING COUNT(DISTINCT day) > 1)`),
    all(`SELECT day, COUNT(DISTINCT user_hash) AS users, COUNT(*) AS events FROM events GROUP BY day ORDER BY day DESC LIMIT 14`),
    all(`SELECT track_id, COUNT(*) AS plays FROM events WHERE name = 'play' AND track_id IS NOT NULL GROUP BY track_id ORDER BY plays DESC LIMIT 10`),
    one(`SELECT ROUND(AVG(plays), 2) AS avg FROM (SELECT COUNT(*) AS plays FROM events WHERE name = 'play' GROUP BY user_hash)`),
  ])

  return json({
    сегодня: today,
    всего: {
      пользователей: users?.users ?? 0,
      возвращаются: retention?.returning ?? 0,
      треков_за_визит: perUser?.avg ?? 0,
    },
    сегодня_метрики: { пользователей: todayRow?.users ?? 0, событий: todayRow?.events ?? 0 },
    по_событиям: totals,
    последние_дни: daily,
    топ_треков: tracks,
  })
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  try {
    return await handle(context)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}
