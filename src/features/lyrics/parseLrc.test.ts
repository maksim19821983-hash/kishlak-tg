import { describe, it, expect } from 'vitest'
import { parseLrc, getActiveLineIndex } from './parseLrc'

// ── fixtures ────────────────────────────────────────────────────────────────

const SIMPLE = `[00:01.00]First line
[00:05.00]Second line
[00:10.00]Third line`

const SECTIONS = `[00:02.17][Куплет]
[00:14.47]Хэй, хэй
[01:01.80][Припев]
[01:02.53]Мама, не плачь`

const MULTI_STAMP = `[00:12.00][00:45.10]Refrain`

const WITH_OFFSET = `[offset:1000]
[00:01.00]Shifted`

const NEG_OFFSET = `[offset:-500]
[00:01.00]Shifted back`

const WORD_LEVEL = `[00:01.00]<00:01.10>Слово <00:01.50>слово <00:02.00>три`

const BOM = `﻿[00:01.00]BOM line`

const CRLF = `[00:01.00]Line one\r\n[00:02.00]Line two`

const META = `[ti:Песня]
[ar:Артист]
[al:Альбом]
[00:01.00]Line`

const BLANK_BEAT = `[00:01.00]Before
[00:03.00]♪
[00:05.00]After`

const DUPLICATE_STAMP = `[00:05.00]First
[00:05.00]Second`

const GARBAGE = `no brackets here
still no brackets
[00:01.00]Valid`

const EMPTY = ``

// ── parseLrc ─────────────────────────────────────────────────────────────────

describe('parseLrc', () => {
  it('parses normal timestamps', () => {
    const { lines } = parseLrc(SIMPLE)
    expect(lines).toHaveLength(3)
    expect(lines[0]!.time).toBeCloseTo(1.0)
    expect(lines[0]!.text).toBe('First line')
    expect(lines[0]!.isBlank).toBe(false)
  })

  it('sorts lines by time', () => {
    const src = `[00:10.00]Late\n[00:01.00]Early`
    const { lines } = parseLrc(src)
    expect(lines[0]!.text).toBe('Early')
    expect(lines[1]!.text).toBe('Late')
  })

  it('parses section markers as isSection', () => {
    const { lines } = parseLrc(SECTIONS)
    expect(lines[0]!.isSection).toBe(true)
    expect(lines[0]!.text).toBe('Куплет')
    expect(lines[1]!.isSection).toBeFalsy()
    expect(lines[2]!.isSection).toBe(true)
    expect(lines[2]!.text).toBe('Припев')
  })

  it('expands multi-timestamp lines', () => {
    const { lines } = parseLrc(MULTI_STAMP)
    expect(lines).toHaveLength(2)
    expect(lines[0]!.text).toBe('Refrain')
    expect(lines[1]!.text).toBe('Refrain')
    expect(lines[0]!.time).toBeCloseTo(12.0)
    expect(lines[1]!.time).toBeCloseTo(45.1)
  })

  it('applies positive offset', () => {
    const { lines } = parseLrc(WITH_OFFSET)
    // [00:01.00] + 1000ms = 2.0s
    expect(lines[0]!.time).toBeCloseTo(2.0)
  })

  it('applies negative offset', () => {
    const { lines } = parseLrc(NEG_OFFSET)
    // [00:01.00] - 500ms = 0.5s
    expect(lines[0]!.time).toBeCloseTo(0.5)
  })

  it('offset does not go below 0', () => {
    const src = `[offset:-5000]\n[00:01.00]Line`
    const { lines } = parseLrc(src)
    expect(lines[0]!.time).toBeGreaterThanOrEqual(0)
  })

  it('parses word-level timestamps', () => {
    const { lines } = parseLrc(WORD_LEVEL)
    expect(lines[0]!.words).toHaveLength(3)
    expect(lines[0]!.words![0]!.text).toBe('Слово')
    expect(lines[0]!.words![0]!.time).toBeCloseTo(1.1)
    expect(lines[0]!.text).toBe('Слово слово три')
  })

  it('strips BOM', () => {
    const { lines } = parseLrc(BOM)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.text).toBe('BOM line')
  })

  it('handles CRLF line endings', () => {
    const { lines } = parseLrc(CRLF)
    expect(lines).toHaveLength(2)
  })

  it('parses meta tags', () => {
    const { meta, lines } = parseLrc(META)
    expect(meta['ti']).toBe('Песня')
    expect(meta['ar']).toBe('Артист')
    expect(meta['al']).toBe('Альбом')
    expect(lines).toHaveLength(1)
  })

  it('keeps blank beat lines (♪)', () => {
    const { lines } = parseLrc(BLANK_BEAT)
    expect(lines).toHaveLength(3)
    expect(lines[1]!.isBlank).toBe(true)
    expect(lines[1]!.text).toBe('♪')
  })

  it('merges duplicate timestamps with ·', () => {
    const { lines } = parseLrc(DUPLICATE_STAMP)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.text).toBe('First · Second')
  })

  it('ignores lines without timestamps', () => {
    const { lines } = parseLrc(GARBAGE)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.text).toBe('Valid')
  })

  it('returns empty lines for empty input', () => {
    const { lines, meta } = parseLrc(EMPTY)
    expect(lines).toHaveLength(0)
    expect(meta).toEqual({})
  })

  it('parses mm:ss:xx format (colon separator)', () => {
    const src = `[00:01:50]Colon format`
    const { lines } = parseLrc(src)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.time).toBeCloseTo(1.5)
  })

  it('handles section after timestamp on same line like real files', () => {
    const src = `[01:49.77][Аутро]\n[01:55.07]О-о-о`
    const { lines } = parseLrc(src)
    expect(lines[0]!.isSection).toBe(true)
    expect(lines[0]!.text).toBe('Аутро')
    expect(lines[1]!.isSection).toBeFalsy()
  })
})

// ── getActiveLineIndex ────────────────────────────────────────────────────────

describe('getActiveLineIndex', () => {
  const lines = [
    { time: 1.0, text: 'a', isBlank: false },
    { time: 5.0, text: 'b', isBlank: false },
    { time: 10.0, text: 'c', isBlank: false },
  ]

  it('returns -1 for empty array', () => {
    expect(getActiveLineIndex([], 5)).toBe(-1)
  })

  it('returns -1 when before first line', () => {
    expect(getActiveLineIndex(lines, 0)).toBe(-1)
  })

  it('returns 0 at exactly first line time', () => {
    expect(getActiveLineIndex(lines, 1.0)).toBe(0)
  })

  it('returns 0 when between first and second', () => {
    expect(getActiveLineIndex(lines, 3.0)).toBe(0)
  })

  it('returns last index when past last line', () => {
    expect(getActiveLineIndex(lines, 99)).toBe(2)
  })

  it('accounts for 0.12s lookahead', () => {
    // at t=4.89 → target=5.01 → line at 5.0 is included
    expect(getActiveLineIndex(lines, 4.89)).toBe(1)
    // at t=4.87 → target=4.99 → line at 5.0 not yet included
    expect(getActiveLineIndex(lines, 4.87)).toBe(0)
  })

  it('returns correct index at last line', () => {
    expect(getActiveLineIndex(lines, 10.0)).toBe(2)
  })

  it('handles single-element array', () => {
    const single = [{ time: 3.0, text: 'x', isBlank: false }]
    expect(getActiveLineIndex(single, 2.0)).toBe(-1)
    expect(getActiveLineIndex(single, 3.0)).toBe(0)
    expect(getActiveLineIndex(single, 99.0)).toBe(0)
  })
})
