import { describe, it, expect } from 'vitest'
import { parseHex, toHex, hexToHsl, hslToHex, relativeLuminance, contrastRatio, accentText } from './accent'

describe('parseHex / toHex', () => {
  it('roundtrip', () => {
    expect(toHex(parseHex('#64A4B4'))).toBe('#64a4b4')
  })
  it('чёрный', () => {
    const { r, g, b } = parseHex('#000000')
    expect(r).toBe(0); expect(g).toBe(0); expect(b).toBe(0)
  })
  it('белый', () => {
    const { r, g, b } = parseHex('#FFFFFF')
    expect(r).toBe(255); expect(g).toBe(255); expect(b).toBe(255)
  })
})

describe('hexToHsl / hslToHex', () => {
  it('roundtrip', () => {
    const hex = '#64a4b4'
    expect(hslToHex(hexToHsl(hex))).toBe(hex)
  })
  it('серый даёт s=0', () => {
    expect(hexToHsl('#808080').s).toBeCloseTo(0, 2)
  })
})

describe('relativeLuminance', () => {
  it('белый = 1', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 3)
  })
  it('чёрный = 0', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 3)
  })
  it('бумага ≈ 0.803', () => {
    expect(relativeLuminance(parseHex('#EDE7DC'))).toBeCloseTo(0.803, 2)
  })
})

describe('contrastRatio', () => {
  it('белый/чёрный = 21', () => {
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 0)
  })
  it('одинаковые = 1', () => {
    const c = parseHex('#64A4B4')
    expect(contrastRatio(c, c)).toBeCloseTo(1, 3)
  })
})

describe('accentText', () => {
  it('#64A4B4 на бумаге даёт контраст ≥ 4.5', () => {
    const result = accentText('#64A4B4', 'paper')
    const contrast = contrastRatio(parseHex(result), parseHex('#EDE7DC'))
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })
  it('#64A4B4 на темноте даёт контраст ≥ 4.5', () => {
    const result = accentText('#64A4B4', 'dark')
    const contrast = contrastRatio(parseHex(result), parseHex('#0B0B0C'))
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })
  it('чёрный акцент не ломает функцию', () => {
    expect(() => accentText('#000000', 'paper')).not.toThrow()
    expect(() => accentText('#000000', 'dark')).not.toThrow()
  })
  it('белый акцент не ломает функцию', () => {
    expect(() => accentText('#FFFFFF', 'paper')).not.toThrow()
    expect(() => accentText('#FFFFFF', 'dark')).not.toThrow()
  })
  it('медь #8C5334 на бумаге даёт контраст ≥ 4.5', () => {
    const result = accentText('#8C5334', 'paper')
    const contrast = contrastRatio(parseHex(result), parseHex('#EDE7DC'))
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })
  it('результат на бумаге темнее исходного', () => {
    const original = hexToHsl('#64A4B4').l
    const result = hexToHsl(accentText('#64A4B4', 'paper')).l
    expect(result).toBeLessThan(original)
  })
  it('результат на темноте светлее исходного', () => {
    const original = hexToHsl('#64A4B4').l
    const result = hexToHsl(accentText('#64A4B4', 'dark')).l
    expect(result).toBeGreaterThan(original)
  })
})
