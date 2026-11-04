#!/usr/bin/env bash
# Одноразовая настройка D1 для синхронизации (бесплатно: 100 000 записей в сутки).
# Запускать из терминала, нужен `npx wrangler login`.
set -euo pipefail
cd "$(dirname "$0")/.."

echo '── 1/4 создаю базу kishlak-sync'
npx wrangler d1 create kishlak-sync 2>&1 | tee /tmp/d1-create.log || true

ID=$(grep -oE '"database_id"[[:space:]]*:[[:space:]]*"[^"]+"' /tmp/d1-create.log | head -1 | sed -E 's/.*"([0-9a-f-]{36})".*/\1/')
if [ -z "${ID:-}" ]; then
  echo 'не нашла database_id: скорее всего база уже существует или нет логина'
  echo 'посмотри /tmp/d1-create.log, либо выполни: npx wrangler d1 list'
  exit 1
fi
echo "── database_id: $ID"

python3 - "$ID" <<'PY'
import re, sys
from pathlib import Path
db_id = sys.argv[1]
p = Path('wrangler.toml')
s = p.read_text(encoding='utf-8')
s = s.replace('# [[d1_databases]]', '[[d1_databases]]')
s = s.replace('# binding = "DB"', 'binding = "DB"')
s = s.replace('# database_name = "kishlak-sync"', 'database_name = "kishlak-sync"')
s = re.sub(r'database_id = "[^"]*"', f'database_id = "{db_id}"', s)
p.write_text(s, encoding='utf-8')
print('wrangler.toml обновлён')
PY

echo '── 2/5 создаю таблицы'
npx wrangler d1 execute kishlak-sync --file server/schema.sql --remote

echo '── 3/5 ключ для сводки статистики'
if ! npx wrangler pages secret list --project-name kishlak-tg 2>/dev/null | grep -q STATS_KEY; then
  KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
  echo "$KEY" | npx wrangler pages secret put STATS_KEY --project-name kishlak-tg
  echo "ключ статистики: $KEY"
  echo "сводка: https://kishlak-tg.pages.dev/api/stats?key=$KEY"
else
  echo 'ключ уже задан'
fi

echo '── 4/5 сборка'
npm run build

echo '── 5/5 деплой'
npx wrangler pages deploy dist --project-name kishlak-tg

echo 'готово: проверь https://kishlak-tg.pages.dev/api/sync?probe=1 — должно быть storage: D1'
