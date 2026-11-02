import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Тест-страж: аудиоэлемент обязан попадать в документ.
 *
 * WKWebView (Телеграм) связывает Media Session с Now Playing только для элементов,
 * которые реально есть в DOM. Если элемент отвязан, система подменяет ⏮⏭ на ±10.
 * Проверено на устройстве 02.11: с appenChild кнопки появились, без него — перемотка.
 *
 * jsdom в проекте нет, поэтому проверяем исходник — правило важнее конкретной строки.
 */
describe('аудиоэлемент', () => {
  it('createAudioElement добавляет элемент в документ', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(here, 'webEngine.ts'), 'utf8')
    const fn = source.slice(
      source.indexOf('function createAudioElement'),
      source.indexOf('let instance'),
    )
    expect(fn).toContain('document.body.appendChild')
    expect(fn).toContain("setAttribute('playsinline'")
  })
})
