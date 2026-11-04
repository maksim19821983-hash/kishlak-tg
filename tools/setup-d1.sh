#!/usr/bin/env bash
# Одноразовая настройка D1: синхронизация (100 000 записей/сутки) и статистика.
# Запускать из терминала, нужен `npx wrangler login`.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME=kishlak-sync

echo "── 1/5 ищу или создаю базу $DB_NAME"
ID="${DB_ID:-}"

if [ -z "$ID" ]; then
  npx wrangler d1 create "$DB_NAME" 2>&1 | tee /tmp/d1-create.log >/dev/null || true
  ID=$(grep -oE '"database_id"[[:space:]]*:[[:space:]]*"[^"]+"' /tmp/d1-create.log | head -1 | sed -E 's/.*"([0-9a-f-]{36})".*/\1/') || true
fi

if [ -z "${ID:-}" ]; then
  echo '   база уже есть — беру её id из списка'
  npx wrangler d1 list --json > /tmp/d1-list.json 2>/dev/null || true
  ID=$(python3 - "$DB_NAME" <<'PY'
import json, sys
name = sys.argv[1]
try:
    data = json.load(open('/tmp/d1-list.json'))
except Exception:
    sys.exit(0)
for item in data if isinstance(data, list) else data.get('result', []):
    if item.get('name') == name:
        print(item.get('uuid') or item.get('id') or '')
        break
PY
)
fi

if [ -z "${ID:-}" ]; then
  echo '   не нашла id. Открой дашборд Cloudflare → D1 → kishlak-sync и запусти:'
  echo "   DB_ID=<id базы> bash tools/setup-d1.sh"
  exit 1
fi
echo "   database_id: $ID"

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
print('   wrangler.toml обновлён')
PY

echo '── 2/5 создаю таблицы'
npx wrangler d1 execute "$DB_NAME" --file server/schema.sql --remote -y

echo '── 3/5 ключ для сводки статистики'
if npx wrangler pages secret list --project-name kishlak-tg 2>/dev/null | grep -q STATS_KEY; then
  echo '   ключ уже задан (посмотреть: dashboard → Pages → kishlak-tg → Settings → Variables)'
else
  KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
  printf '%s' "$KEY" | npx wrangler pages secret put STATS_KEY --project-name kishlak-tg
  echo "   КЛЮЧ: $KEY"
  echo "   сводка: https://kishlak-tg.pages.dev/api/stats?key=$KEY"
fi

echo '── 4/5 сборка'
npm run build

echo '── 5/5 деплой'
npx wrangler pages deploy dist --project-name kishlak-tg

echo
echo 'готово. проверь:'
echo '  https://kishlak-tg.pages.dev/api/sync?probe=1   → storage: D1'
echo '  https://kishlak-tg.pages.dev/api/stats?key=…   → сводка'
