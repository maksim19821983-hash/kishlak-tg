# Кишлак — передача проекта новому ИИ

Читай этот файл первым. Здесь всё, чтобы понять проект и начать работать, не переспрашивая
историю. Если что-то противоречит — прав этот файл, но живые скрипты и `docs/MAP.md` важнее.

Дата последнего обновления: 14.11.2026.

---

## 1. Что это

Telegram Mini App — музыкальный плеер под артиста **Кишлак** (он же АПФС). Не «каталог музыки»,
а предмет: плеер выглядит как кассета, обложка задаёт цвет всего экрана, альбомы «проявляются»
по мере прослушивания.

- **Живёт здесь:** https://kishlak-tg.pages.dev
- **Канал-шлагбаум:** https://t.me/Kishlak_music_tgk (подписка проверяется сервером)
- **Кнопка в боте:** открывает мини-апп; приветствие показывается один раз (см. §8)

Каталог: **31 релиз, 118 треков**. Тексты (LRC) есть у 2 треков.

---

## 2. Стек и команды

React 19 + TypeScript (strict) + Vite + Tailwind + Zustand + Vitest. Node 20+, npm.
Хостинг — Cloudflare Pages, функции — в `functions/`, данные — D1.

```bash
npm install
npm run dev          # локально, http://localhost:5173
npx vitest run       # тесты (должно быть 109+ зелёных)
npx tsc --noEmit     # типы, обязательно перед коммитом
npm run build        # tsc + vite → dist/
```

**Деплой:**

```bash
npx wrangler login                                   # если протух логин (бывает часто)
npx wrangler pages deploy dist --project-name kishlak-tg
```

**Проверка, что деплой реально доехал** (обязательно, бывало что команда падала молча):

```bash
ls dist/assets/index-*.js                                   # локальный хеш
curl -s https://kishlak-tg.pages.dev/ | grep -o 'assets/index-[^"]*\.js'
```

Хеши должны совпадать. Если нет — деплой не применился, повтори.

---

## 3. Структура

```
src/
  app/            # App.tsx, telegram.ts, deepLink.ts, remoteSync.ts, analytics.ts, gate.ts
  audio/          # webEngine.ts (единственный <audio>), store.ts, mediaSession.ts
  features/
    player/       # PlayerTab, Cassette (кассета), VolumeHover
    catalog/      # CatalogScreen, ReleaseFrame
    favorites/    # FavoritesScreen, store.ts
    lyrics/       # parseLrc.ts, InsertScreen
    onboarding/   # Onboarding.tsx (приветствие)
    polarity/     # accent.ts, usePolarity.ts, analyzeCover.ts
    fan/          # профиль, статистика
    gate/         # экран подписки на канал
  data/           # types.ts, manifest.ts (парсер), CatalogRepo.ts
  ui/             # иконки, примитивы, Logo1111
  styles/         # tokens.css, index.css

functions/        # Cloudflare Pages Functions (продакшн-API)
  api/sync.ts     # синхронизация избранного/прогресса (D1 + KV-фолбэк)
  api/event.ts    # приём событий статистики
  api/stats.ts    # сводка, закрыта ключом ?key=STATS_KEY
  api/gate.ts     # проверка подписки на канал
  api/bot.ts      # приветствие бота, кнопки
  _lib/channel.ts # verifyInitData + isSubscribed

server/
  worker.mjs      # старый отдельный воркер синхронизации (в проде не используется)
  schema.sql      # таблицы sync_state и events
  bot-daily/      # воркер «трек дня» в канал, раз в сутки

tools/
  build_manifest.py      # content/releases/* → public/content/manifest.json
  gen_palette.py         # палитра из обложек + ручные переопределения
  palette_overrides.json # РУЧНЫЕ акценты релизов (важно, см. §5)
  ingest.py, lock_art.py # заливка релизов
  setup-d1.sh            # одноразовая настройка D1 + ключ статистики
  loadtest.mjs           # нагрузочные тесты

content/          # ИСХОДНИКИ контента, в git НЕ попадает (.gitignore)
  releases/<id>/release.json + tracks/*.mp3 + cover.jpg
  _source/        # сырые файлы от заказчика
public/content/   # собранное (manifest + audio + covers + lrc), тоже в git НЕ попадает
```

---

## 4. Как добавить трек в релиз

1. Положить файл в `content/_source/` и проверить формат:

```bash
file "файл.mp3"     # должно быть MPEG ADTS / mp3, НЕ "ISO Media ... DASH"
afinfo "файл.m4a"   # длительность (секунды) — если mp3, считается по кадрам
```

   **Опасность:** файл с расширением `.mp3` может быть фрагментированным MP4 (внутри боксы
   `moof`). Такой браузер играет криво: длительность «5 минут», после конца — тишина.
   Лечение: `afconvert -f m4af -d aac -b 192000 in.m4a out.m4a`, затем сохранять как `.m4a`.

2. Скопировать в `content/releases/<id>/tracks/NN-slug.mp3` (или `.m4a`).

3. Дописать трек в `content/releases/<id>/release.json`:

```json
{ "id": "<release-id>-15", "title": "Название", "duration": 157,
  "audio": "tracks/15-slug.m4a", "lrc": null }
```

4. Пересобрать манифест и выложить:

```bash
python3 tools/build_manifest.py    # обновляет public/content/manifest.json
npm run build && npx wrangler pages deploy dist --project-name kishlak-tg
```

Проверка: `curl -s https://kishlak-tg.pages.dev/content/manifest.json | grep -c '"id"'`.

---

## 5. Цвета и палитра (частая причина «неправильных» цветов)

- Цвет экрана берётся из обложки релиза (`src/features/polarity/`).
- Акцент можно задать **руками** в `tools/palette_overrides.json`, поле `accent`,
  плюс `secondary`, `mono`, `backdrop` (false = не показывать фото-фон, нужен чистый чёрный).
- После правки overrides: применить к `content/releases/<id>/release.json` и пересобрать манифест.
- **Ручные палитры помечаются `curated: true`** и не проходят через `boostAccent()`
  (он повышает насыщенность и превращал графит в синий/фиолетовый). Не убирай этот обход.
- Правила дизайна: только токены из `docs/design/system.md`, два шрифта (Unbounded +
  JetBrains Mono), одна полярность на экран, тени только у «предмета» (кассеты).
- **По умолчанию тема тёмная** (`index.html`, `usePolarity.ts`). Светлая запоминается при выборе.

---

## 6. Сервер и данные

- **D1** (бесплатно 100 000 записей/сутки): таблицы `sync_state` (избранное, прогресс) и
  `events` (статистика). Привязка в `wrangler.toml` → `binding = "DB"`.
- **KV** `STATE` — фолбэк, если D1 не привязана (но там лимит 1000 записей/сутки).
- Секреты Pages: `BOT_TOKEN` (токен бота), `STATS_KEY` (ключ для сводки).
- Сводка: `https://kishlak-tg.pages.dev/api/stats?key=STATS_KEY`
- Диагностика хранилища: `/api/sync?probe=1` → `{"storage":"D1"}`.
- Настройка с нуля: `bash tools/setup-d1.sh` (создаёт/находит базу, таблицы, ключ, деплой).
- Авторизация — только `initData` Телеграма (HMAC `WebAppData`). Синхронизация избранного —
  last-write-wins по `updatedAt`: удаление не откатывается сервером.

---

## 7. Что уже сделано (не ломать)

- Плеер: кассета, транспорт (шаффл, переключение, play, повтор, сердце, громкость на ПК
  с запоминанием уровня), прогресс, свайпы по кассете (влево/вправо — треки, вверх — вкладыш).
- Полноэкранный режим по кнопке-уголкам в шапке: список уезжает вниз, остаётся кассета и
  название трека (без строки альбома).
- Каталог: проявление обложек по прослушиванию, кадр релиза, поиск.
- Любимое: сердца в списке и в транспорте, удаление одним тапом, синхронизация между устройствами.
- Приветствие из 5 шагов, тёмная тема по умолчанию, шлагбаум подписки на канал.
- Бот: приветствие с карточкой (`public/bot/welcome.jpg` + генератор `design/bot/*.py`),
  «трек дня» в канал (`server/bot-daily`), кнопки «Открыть плеер».

**Удалено осознанно:** офлайн-режим и скачивание (лежат в ветке `feature/offline`),
кнопки «Поделиться» и «Поддержать» (звёзды недоступны в РФ), привязка браузера кодом.

---

## 8. Известные ограничения

1. **Аудио без Range.** Pages отдаёт файл целиком (`Range` → 200), поэтому перемотка
   возможна только после загрузки трека. Решение — перенос аудио в R2 (бесплатно до 10 ГБ).
2. **LRC у 2 треков из 118.** Остальные показывают подпись «скоро будет текст».
3. **Синхронизация избранного — LWW:** одновременная правка на двух устройствах теряет одну.
4. **Кэш Телеграма.** Документ отдаётся с `max-age=0, must-revalidate` (см. `public/_headers`),
   но старые устройства могут держать старый бандл до переоткрытия.
5. Аудио и `public/content/` не в git — на новой машине их нужно собрать из `content/`.

---

## 9. Правила работы (важно)

1. **Не переделывай то, о чём не просили.** Этот проект много раз просили «вернуть как было».
2. Перед правкой `tsc --noEmit` + `npx vitest run`; после — деплой и проверка хеша бандла.
3. Коммиты — по-русски, коротко, с префиксом (`feat:`, `fix:`, `chore:`, `docs:`).
4. Большие бинарники и папки `content/`, `public/content/` в git не добавлять.
5. Если задача неоднозначна — **спроси**, не угадывай: пользователь ценит честные вопросы
   больше, чем догадки.
6. Все тексты и подписи в интерфейсе — по-русски, строчными, моно-шрифтом для служебного.
7. Проект про одного артиста, но модель данных артист-агностична (`artistId`, `releaseId`).

---

## 10. Куда смотреть дальше

- `docs/MAP.md` — карта проекта и статусы.
- `docs/design/system.md` — токены, типографика, правила.
- `docs/design/backlog.md` — задачи, идеи (включая звук вставки кассеты и перенос в R2).
- `docs/posts/channel-month.md` — контент для канала на месяц.
- `docs/known-issues.md` — старые заметки о проблемах (часть уже закрыта, проверяй).

Первое, что стоит сделать новому ИИ: `npm install`, `npx vitest run`, `npx tsc --noEmit`,
прочитать `docs/MAP.md` и `docs/design/system.md`, затем спросить у владельца, какая задача
сейчас в приоритете.
