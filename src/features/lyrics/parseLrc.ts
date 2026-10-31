export interface LyricLine {
  time: number
  text: string
  isSection?: boolean
  words?: { time: number; text: string }[]
  isBlank: boolean
}

export interface Lyrics {
  meta: Record<string, string>
  lines: LyricLine[]
}

const META_KEYS = new Set(['ti', 'ar', 'al', 'by', 'offset', 're', 've', 'length'])

function parseTs(s: string): number | null {
  const m = /^(\d+):(\d{2})[.:](\d{1,3})$/.exec(s.trim())
  if (!m) return null
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10) + parseInt(m[3]!.padEnd(3, '0'), 10) / 1000
}

function parseWords(text: string): { time: number; text: string }[] | undefined {
  if (!text.includes('<')) return undefined
  const words: { time: number; text: string }[] = []
  const re = /<(\d+:\d{2}[.:]\d{1,3})>(.*?)(?=<|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const t = parseTs(m[1]!)
    const w = m[2]!.trim()
    if (t !== null && w) words.push({ time: t, text: w })
  }
  return words.length > 0 ? words : undefined
}

function stripWordMarkers(text: string): string {
  return text.replace(/<\d+:\d{2}[.:]\d{1,3}>/g, '').trim()
}

export function parseLrc(src: string): Lyrics {
  const raw = src.replace(/^﻿/, '')
  const meta: Record<string, string> = {}
  let offsetMs = 0
  const bucket = new Map<number, LyricLine>()
  const order: LyricLine[] = []

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const times: number[] = []
    let rest = line
    let isMeta = false

    while (rest.startsWith('[')) {
      const close = rest.indexOf(']')
      if (close < 0) break
      const tag = rest.slice(1, close)
      rest = rest.slice(close + 1)

      const t = parseTs(tag)
      if (t !== null) { times.push(t); continue }

      const sep = tag.indexOf(':')
      if (sep > 0) {
        const key = tag.slice(0, sep).trim().toLowerCase()
        const val = tag.slice(sep + 1).trim()
        if (META_KEYS.has(key)) {
          if (key === 'offset') offsetMs = parseInt(val, 10) || 0
          else meta[key] = val
          isMeta = true
          break
        }
      }

      // Unknown bracket after timestamps — reconstruct as text
      if (times.length > 0) {
        rest = `[${tag}]${rest}`
        break
      }
    }

    if (isMeta || times.length === 0) continue

    const rawText = rest.trim()
    const isSection = /^\[.+\]$/.test(rawText)
    const isBlank = rawText === '' || rawText === '♪'
    const words = !isBlank && !isSection ? parseWords(rawText) : undefined
    const displayText = isSection
      ? rawText.slice(1, -1)
      : words
        ? stripWordMarkers(rawText)
        : rawText

    for (const rawT of times) {
      const t = Math.max(0, rawT + offsetMs / 1000)
      const key = Math.round(t * 1000)

      if (bucket.has(key)) {
        const existing = bucket.get(key)!
        if (!isBlank && displayText) {
          existing.text = existing.text ? `${existing.text} · ${displayText}` : displayText
        }
      } else {
        const entry: LyricLine = { time: t, text: displayText, isBlank }
        if (isSection) entry.isSection = true
        if (words) entry.words = words
        bucket.set(key, entry)
        order.push(entry)
      }
    }
  }

  order.sort((a, b) => a.time - b.time)
  return { meta, lines: order }
}

/** Бинарный поиск последней строки с time <= t + 0.12 */
export function getActiveLineIndex(lines: LyricLine[], t: number): number {
  if (lines.length === 0) return -1
  const target = t + 0.12
  let lo = 0, hi = lines.length - 1, result = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid]!.time <= target) { result = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return result
}
