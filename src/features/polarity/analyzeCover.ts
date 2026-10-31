import type { Polarity } from '@/data/types'
import { relativeLuminance, hexToHsl, hslToHex } from './accent'

type Palette = { mode: Polarity; accent: string }

const FALLBACK: Palette = { mode: 'paper', accent: '#8C5334' }
const cache = new Map<string, Palette>()

export async function analyzeCover(url: string): Promise<Palette> {
  const cached = cache.get(url)
  if (cached) return cached

  try {
    const result = await doAnalyze(url)
    cache.set(url, result)
    return result
  } catch {
    cache.set(url, FALLBACK)
    return FALLBACK
  }
}

async function doAnalyze(url: string): Promise<Palette> {
  const img = await loadImage(url)
  const SIZE = 16
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return FALLBACK

  ctx.drawImage(img, 0, 0, SIZE, SIZE)
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

  let totalL = 0
  let count = 0
  let sinH = 0, cosH = 0
  let totalS = 0, satCount = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0, g = data[i + 1] ?? 0, b = data[i + 2] ?? 0
    const lum = relativeLuminance({ r, g, b })
    totalL += lum
    count++

    const { h, s, l } = hexToHsl(`#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`)
    // пиксели с насыщенностью и не слишком тёмные/светлые
    if (l >= 0.10 && l <= 0.92 && s >= 0.18) {
      const rad = (h / 360) * 2 * Math.PI
      sinH += Math.sin(rad)
      cosH += Math.cos(rad)
      totalS += s
      satCount++
    }
  }

  if (count === 0) return FALLBACK

  const avgL = totalL / count
  const mode: Polarity = avgL >= 0.55 ? 'paper' : 'dark'

  if (satCount === 0) return { mode, accent: FALLBACK.accent }

  const avgHRad = Math.atan2(sinH / satCount, cosH / satCount)
  const avgH = ((avgHRad / (2 * Math.PI)) * 360 + 360) % 360
  const avgS = Math.min(0.60, Math.max(0.35, totalS / satCount))
  const accentL = Math.min(0.55, Math.max(0.38, avgL))
  const accent = hslToHex({ h: avgH, s: avgS, l: accentL })

  return { mode, accent }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
