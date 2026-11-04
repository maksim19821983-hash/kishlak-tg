/**
 * Локальная проверка подписи initData — не требует деплоя.
 * Запуск: node server/test-worker.mjs <bot_token> <init_data>
 */

import { createHmac } from 'node:crypto'

const [, , token, initData] = process.argv
if (!token || !initData) {
  console.log('нужно: node server/test-worker.mjs <bot_token> "<init_data>"')
  process.exit(1)
}

const params = new URLSearchParams(initData)
const hash = params.get('hash') ?? ''
params.delete('hash')
const dataCheckString = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n')
const secret = createHmac('sha256', 'WebAppData').update(token).digest()
const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex')

console.log('длина токена :', token.length, token.length === 46 ? '(норма)' : '(подозрительно)')
console.log('поля         :', [...params.keys()].join(', '))
console.log('ожидаемый хеш:', expected.slice(0, 12), '…')
console.log('пришедший хеш:', hash.slice(0, 12), '…')
console.log('совпадает    :', expected === hash ? 'да' : 'НЕТ')
