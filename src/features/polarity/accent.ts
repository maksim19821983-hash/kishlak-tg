// Чистые функции цвета. Без React, без DOM.

export type RGB = { r: number; g: number; b: number }
export type HSL = { h: number; s: number; l: number }
import type { Polarity } from '@/data/types'

// ─── Конвертация ──────────────────────────────────────────────────────────────

export function parseHex(hex: string): RGB {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function toHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

export function hexToHsl(hex: string): HSL {
  const { r, g, b } = parseHex(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: h * 360, s, l }
}

export function hslToHex({ h, s, l }: HSL): string {
  const hn = h / 360
  function hue2rgb(p: number, q: number, t: number): number {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return toHex({
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  })
}

// ─── Яркость и контраст ──────────────────────────────────────────────────────

function linearize(c: number): number {
  const n = c / 255
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
}

export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b)
  const lighter = Math.max(la, lb), darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

// ─── Акцентный цвет для текста ────────────────────────────────────────────────

const PAPER_BG = parseHex('#EDE7DC')
const DARK_BG  = parseHex('#0B0B0C')

const FALLBACK: Record<Polarity, string> = {
  paper: '#131211',
  dark:  '#F1EDE6',
}

export function accentText(accentHex: string, mode: Polarity): string {
  const bg = mode === 'paper' ? PAPER_BG : DARK_BG
  const hsl = hexToHsl(accentHex)
  const step = mode === 'paper' ? -0.01 : 0.01
  let l = hsl.l

  for (let i = 0; i < 100; i++) {
    l = Math.max(0, Math.min(1, l + step))
    const candidate = hslToHex({ ...hsl, l })
    if (contrastRatio(parseHex(candidate), bg) >= 4.5) return candidate
  }

  return FALLBACK[mode]
}

/** Смешивает цвет обложки с базой темы: 0 — только база, 1 — только цвет. */
export function mixHex(hex: string, base: string, amount: number): string {
  const parse = (h: string): [number, number, number] => {
    const c = h.replace('#', '')
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
  }
  const [r1, g1, b1] = parse(hex)
  const [r2, g2, b2] = parse(base)
  const to = (a: number, b: number): number => Math.round(a * amount + b * (1 - amount))
  return `rgb(${to(r1, r2)}, ${to(g1, g2)}, ${to(b1, b2)})`
}

export const PAPER_BG_HEX = '#EDE7DC'
export const DARK_BG_HEX = '#0B0B0C'
