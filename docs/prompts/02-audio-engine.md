# 02 — Аудио-движок и проверка фона

**Читай перед началом:** `CLAUDE.md` (раздел 4), `docs/design/system.md`.
**Результат:** аудио играет, фон проверен на живом телефоне, есть движок и очередь. Интерфейса плеера ещё нет.

## Шаг 0 — спайк (сделать первым, до всей остальной работы)

Страница `/spike` (роут, не трогая экраны):
- один `<audio>` с тестовым mp3 (взять из `public/`), `preload="metadata"`;
- кнопка «play», вывод `currentTime` моно-шрифтом;
- `navigator.mediaSession` с `metadata` (title, artist, artwork 512) и обработчиками `play/pause/nexttrack`;
- переключение метаданных кнопкой «следующий» (меняем title и картинку, чтобы было видно, что локскрин обновляется).

**Протокол проверки (выполняет человек, результат — в `docs/design/audio-findings.md`):**
1. Открыть `/spike` внутри Телеграма на iPhone, нажать play.
2. Свернуть Телеграм (свайп домой) — играет?
3. Заблокировать телефон — играет? Видно карточку на локскрине с обложкой и названием?
4. Переключить трек с локскрина — метаданные обновились?
5. Разблокировать, вернуться в Телеграм — позиция совпадает с реальной?
6. Повторить на Android.

Файл `audio-findings.md`: модель телефона, версия Telegram, iOS/Android, ответы по пунктам, вывод одной строкой: «фоновое воспроизведение работает через Media Session» / «не работает — нужен фолбэк».

## Шаг 1 — движок

`src/audio/engine.ts` — синглтон, живёт вне React.

```ts
type Status = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error'

interface PlayerState {
  status: Status
  track: Track | null
  queue: Track[]
  index: number
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  error: string | null
}
```

Требования:
- Один `HTMLAudioElement`, создаётся лениво, `preload="metadata"`, `playsInline`.
- API: `loadQueue(tracks, startIndex)`, `play()`, `pause()`, `toggle()`, `seek(sec)`, `next(reason)`, `prev()`, `setShuffle`, `setRepeat`, `setVolume`, `subscribe(fn)`, `getState()`, `dispose()`.
- Смена трека сохраняет статус: если играло — играет дальше; если стояло — остаётся на паузе и грузит метаданные.
- `ended` → `next()` с учётом `repeat`: `one` — тот же трек с нуля, `all` — по кругу, `off` — стоп на последнем.
- Шаффл: перемешивание очереди с сохранением текущего трека на месте; выключение шаффла возвращает исходный порядок (храним `order` и `originalOrder`).
- `timeupdate` — не чаще 4 раз в секунду в сторе (троттлинг), но `currentTime` в движке всегда точный.
- Ошибка загрузки → `status: 'error'`, `error` с человеческим текстом, не с URL.

`src/audio/queue.ts` — чистые функции: `shuffleOrder`, `nextIndex`, `prevIndex`, `clampIndex`. Покрыть тестами (repeat+shuffle — все комбинации).

`src/audio/mediaSession.ts`:
- `metadata` с `artwork` 512×512;
- `setPositionState` — раз в секунду, не чаще;
- обработчики `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`, `seekbackward`, `seekforward`, `stop`;
- всё в `try/catch` — в Телеграме API есть не всегда.

`src/audio/store.ts` — Zustand, подписан на `engine.subscribe`, экспортирует селекторы. React-компоненты не трогают `<audio>` напрямую никогда.

`src/audio/background.ts` — заглушка `requestBackgroundFallback(track): Promise<boolean>`, возвращает `false` и пишет в консоль «не реализовано». Нужна, чтобы интерфейс фолбэка появился позже без переделки.

## Ограничения

- Никаких плеер-библиотек (howler, tone, react-player).
- Никакого UI, кроме `/spike`.
- Нельзя вызывать `play()` без жеста пользователя.
- Не вешать больше одного `visibilitychange` на документ.

## Готово, когда

- [ ] Протокол спайка пройден, `docs/design/audio-findings.md` заполнен
- [ ] Фон и локскрин работают (или зафиксировано, что нет — тогда пишем в backlog «нужен фолбэк»)
- [ ] Переключение треков с локскрина меняет трек в приложении
- [ ] Тесты очереди и повтора зелёные
- [ ] 50 переключений подряд: нет утечек, консоль чистая, память не растёт
- [ ] `pnpm tsc --noEmit` чисто

## Отчёт

Результат спайка (это главное), что сделано, что не сделано, где риски.
