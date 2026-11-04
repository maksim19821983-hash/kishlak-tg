/**
 * После сборки пишет dist/precache.json:
 *   { build, files: [...] } — какие файлы оболочки класть в кэш.
 * build служит версией кэша: пока файлы не сохранены целиком, новая версия не активна.
 */

import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const list = []

function walk(dir, base = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    const rel = `${base}/${entry.name}`
    if (entry.isDirectory()) {
      if (rel.startsWith('/content')) continue
      if (rel.startsWith('/dev')) continue
      walk(full, rel)
      continue
    }
    if (rel.endsWith('.map')) continue
    list.push(rel)
  }
}

walk(DIST)

const build = `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`
writeFileSync(join(DIST, 'precache.json'), JSON.stringify({ build, files: list }, null, 2))
console.log(`precache: ${list.length} файлов, сборка ${build}`)
