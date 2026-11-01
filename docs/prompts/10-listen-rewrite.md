# Задача: переписать учёт прослушиваний с нуля

Читай `docs/spec/listen-accounting.md` — там модель и критерии приёмки. Здесь порядок работ.

## Правила

- Работать в отдельной ветке, не в main: `git checkout -b listen-rewrite`.
- Не пытаться починить текущую логику точечно. Файлы `src/features/fan/trackListen.ts` и `src/features/fan/state.ts` переписать целиком.
- Сначала тесты (список в спеке, 10 штук), потом код. Тесты должны падать до реализации и проходить после.
- После каждого шага — `npx tsc --noEmit && npx vitest run`.

## Шаг 1. Модель данных

`src/features/fan/state.ts`:

- `FanState` версии 3: только `tracks` (факты) и `sessions`.
- Убрать `releases` и `listenedTracks` полностью.
- Миграция из `kishlak:fan:v1`: факты переносим, `releases` игнорируем, ключ новый `kishlak:fan:v3`.
- Запись: throttle 10 с + принудительно на pause/pagehide/beforeunload/visibilitychange.

## Шаг 2. Чистые функции

`src/features/fan/derive.ts`:

```ts
isListened(fact): boolean
releaseProgress(releaseId, tracks, state): number       // 0..1
collectedReleases(releases, state): number              // сколько релизов прослушано целиком
listenedTracksCount(state): number
favoriteTracks(tracks, state): Track[]                  // прослушанные, свежие первыми
newTracks(tracks, state): Track[]                       // непрослушанные, в порядке каталога
```

Всё чистое, без React и без движка. На каждую функцию — тесты.

## Шаг 3. Сессия и завершение трека

`src/features/fan/trackListen.ts`:

- `LiveSession` объектом, а не модульными переменными.
- Новый трек → закрыть прошлую сессию, открыть новую.
- `finishTrack()` — единственная точка завершения, защита от повторного вызова, сброс флага только при загрузке трека.
- Вызывать из `ended`, из watchdog в RAF (`playing && currentTime >= duration - 0.4`), из `pause` у конца.
- Порог прослушивания 50% натурального времени **или** `completed`.

## Шаг 4. Движок

`src/audio/webEngine.ts`:

- Убрать дублирующие фолбэки, оставить один `finishTrack()`.
- Длительность всегда брать из `el.duration`, если конечна и больше нуля.
- После `next('ended')` запускать воспроизведение; при `NotAllowedError` — не считать это ошибкой, а держать статус `paused` и показывать кнопку продолжения (см. шаг 6).

## Шаг 5. UI на вычисляемых данных

- Удалить `getCachedProgress` и `_progressCache` полностью.
- `CatalogScreen`, `Sleeve`, `ProfileScreen`, `PlayerTab` берут прогресс из `derive.ts`.
- Одна подписка `subscribeFan()` вместо `subscribeProgress`.
- Обложки обновляются в момент записи фактов, без перезагрузки.

## Шаг 6. «Продолжить» на случай блокировки автоплея

Если `play()` отклонён (`NotAllowedError`), показывать в плеере компактную плашку «Нажми, чтобы продолжить» с кнопкой play. Это страховка от iOS-автоплея: пользователь всегда может продолжить одним тапом, даже если браузер блокирует программный запуск.

## Отчёт

- Что переписано, какие тесты добавлены, что удалено.
- Цифры приёмки из спеки: 1 трек из 4 → 25%, перезагрузка сохраняет, после конца трека играет следующий.
- Отдельно: не осталось ли где-то второго источника истины по прогрессу.
