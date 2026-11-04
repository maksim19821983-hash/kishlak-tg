/**
 * Нагрузочный тест: имитирует одновременных пользователей приложения.
 *
 *   node tools/loadtest.mjs --users 300 --mode app|catalog|audio|sync|all
 *
 * Ничего не пишет на сервер (sync-запросы без подписи получают 401),
 * поэтому тест безопасен для живого окружения.
 */

const BASE = process.env.LOADTEST_BASE ?? 'https://kishlak-tg.pages.dev'
const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback
}
const USERS = Number(arg('users', '300'))
const MODE = arg('mode', 'all')
const TIMEOUT = Number(arg('timeout', '30000'))

const stats = { times: [], errors: new Map(), bytes: 0, requests: 0 }

function record(ms, ok, error) {
  stats.requests += 1
  stats.times.push(ms)
  if (!ok) stats.errors.set(error ?? 'error', (stats.errors.get(error ?? 'error') ?? 0) + 1)
}

function pct(list, p) {
  if (list.length === 0) return 0
  const sorted = [...list].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

async function timed(label, fn) {
  const started = performance.now()
  try {
    await fn()
    record(performance.now() - started, true)
  } catch (e) {
    record(performance.now() - started, false, `${label}: ${e?.name ?? e}`)
  }
}

/** Забирает первые maxBytes файла и обрывает соединение — как начало воспроизведения. */
async function fetchHead(url, maxBytes) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (response.body === null) {
      const buf = await response.arrayBuffer()
      stats.bytes += buf.byteLength
      return
    }
    const reader = response.body.getReader()
    let got = 0
    while (got < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      got += value.byteLength
      stats.bytes += value.byteLength
    }
    await reader.cancel()
  } finally {
    clearTimeout(timer)
  }
}

async function download(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buf = await response.arrayBuffer()
    stats.bytes += buf.byteLength
  } finally {
    clearTimeout(timer)
  }
}

async function syncRequest() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const response = await fetch(`${BASE}/api/sync`, {
      signal: controller.signal,
      headers: { 'x-init-data': 'user=%7B%22id%22%3A1%7D&hash=deadbeef' },
    })
    // 401 — ожидаемый ответ: подпись неверна, но функция и хранилище задействованы
    if (response.status !== 401 && !response.ok) throw new Error(`HTTP ${response.status}`)
    await response.arrayBuffer()
  } finally {
    clearTimeout(timer)
  }
}

async function loadManifest() {
  const response = await fetch(`${BASE}/content/manifest.json`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const json = await response.json()
  stats.bytes += JSON.stringify(json).length
  return json
}

function reset() {
  stats.times = []
  stats.errors = new Map()
  stats.bytes = 0
  stats.requests = 0
}

function report(name, wallMs) {
  const ok = stats.requests - [...stats.errors.values()].reduce((a, b) => a + b, 0)
  console.log(`\n── ${name}: ${USERS} одновременно`)
  console.log(`   запросов: ${stats.requests} · успешно: ${ok} · ошибок: ${stats.requests - ok}`)
  console.log(`   время: p50 ${Math.round(pct(stats.times, 50))} мс · p95 ${Math.round(pct(stats.times, 95))} мс · max ${Math.round(Math.max(0, ...stats.times))} мс`)
  console.log(`   стенка: ${(wallMs / 1000).toFixed(1)} с · трафик: ${(stats.bytes / 1048576).toFixed(1)} МБ`)
  if (stats.errors.size > 0) console.log(`   ошибки: ${JSON.stringify([...stats.errors])}`)
  return { ok, failed: stats.requests - ok }
}

const results = []
const pool = async (count, fn) => {
  const workers = Array.from({ length: count }, (_, i) => fn(i))
  return Promise.all(workers)
}

if (MODE === 'app' || MODE === 'all') {
  reset()
  let t0 = performance.now()
  await pool(USERS, async () => {
    await timed('html', () => download(`${BASE}/`))
    await timed('bundle', async () => {
      const html = await (await fetch(`${BASE}/`)).text()
      const m = html.match(/assets\/index-[^"]+\.js/)
      if (m) await download(`${BASE}/${m[0]}`)
    })
  })
  results.push(report('Загрузка приложения (HTML + бандл)', performance.now() - t0))
}

if (MODE === 'catalog' || MODE === 'all') {
  reset()
  const manifest = await loadManifest()
  const covers = manifest.releases.map((r) => r.cover).filter(Boolean)
  const t0 = performance.now()
  await pool(USERS, async (i) => {
    await timed('manifest', () => loadManifest())
    const cover = covers[i % covers.length]
    await timed('cover', () => fetchHead(`${BASE}${cover}`, 64 * 1024))
  })
  results.push(report('Каталог и обложки', performance.now() - t0))
}

if (MODE === 'audio' || MODE === 'all') {
  reset()
  const manifest = await loadManifest()
  const tracks = manifest.releases.flatMap((r) => r.tracks).map((t) => t.audio).filter(Boolean)
  const t0 = performance.now()
  await pool(USERS, async (i) => {
    const track = tracks[i % tracks.length]
    // начало воспроизведения: первые 512 КБ
    await timed('audio-head', () => fetchHead(`${BASE}${track}`, 512 * 1024))
  })
  results.push(report('Прослушивание: первые 512 КБ трека', performance.now() - t0))
}

if (MODE === 'sync' || MODE === 'all') {
  reset()
  const t0 = performance.now()
  await pool(USERS, async () => {
    await timed('sync', () => syncRequest())
  })
  results.push(report('Синхронизация /api/sync', performance.now() - t0))
}

const failed = results.reduce((sum, r) => sum + r.failed, 0)
console.log(`\nИТОГ: ошибок ${failed}${failed === 0 ? ' — все запросы прошли' : ''}`)
