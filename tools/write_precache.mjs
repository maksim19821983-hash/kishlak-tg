/**
 * После сборки пишет dist/precache.json — список файлов оболочки,
 * которые service worker положит в кэш при установке. Аудио не входит.
 */

import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const list = []

function walk(dir, base = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    const rel = `${base}/${entry.name}`
    if (entry.isDirectory()) {
      // контент не предзагружаем: аудио сотни мегабайт, обложки грузятся по ходу
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
writeFileSync(join(DIST, 'precache.json'), JSON.stringify(list, null, 2))
console.log(`precache: ${list.length} файлов`)
