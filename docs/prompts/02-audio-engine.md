# 02 — Аудио и проверка фона

**Читать:** `CLAUDE.md`, раздел 4 и «Архитектурные границы».
**Результат:** работающее аудио за интерфейсом `AudioPort`, проверенный фон на живом телефоне.

## Шаг 0 — спайк (сделать первым)

Роут `/spike`:
- `<audio>` с тестовым mp3, кнопка play, вывод `currentTime`;
- `navigator.mediaSession` с `metadata` (title, artist, artwork 512) и обработчиками `play/pause/nexttrack`;
- кнопка «следующий» меняет метаданные — видно, обновляется ли локскрин.

**Протокол (выполняет человек, результат в `docs/design/audio-findings.md`):**
1. Открыть в Телеграме на iPhone, play.
2. Свернуть Телеграм — играет?
3. Заблокировать телефон — играет? Есть карточка с обложкой?
4. Переключить трек с локскрина — метаданные обновились?
5. Вернуться в приложение — позиция совпадает?
6. Повторить на Android.

Файл: модель, версия Telegram, ответы по пунктам, вывод одной строкой.

## Шаг 1 — порт

`src/audio/port.ts`:

```ts
export type PlaybackState = {
  status: 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error'
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

export interface AudioPort {
  load(tracks: Track[], startIndex: number): void
  play(): void
  pause(): void
  toggle(): void
  seek(sec: number): void
  next(reason?: 'ended' | 'user'): void
  prev(): void
  setShuffle(on: boolean): void
  setRepeat(mode: PlaybackState['repeat']): void
  setVolume(v: number): void
  subscribe(fn: (s: PlaybackState) => void): () => void
  getState(): PlaybackState
  dispose(): void
}
```

`src/audio/webEngine.ts` — реализация на одном `HTMLAudioElement`:
- `preload="metadata"`, синглтон, живёт вне React;
- смена трека сохраняет статус (играло — продолжает; стояло — грузит метаданные);
- `ended` → `next()` с учётом `repeat`: `one` — тот же с нуля, `all` — по кругу, `off` — стоп;
- шаффл перемешивает очередь, сохраняя текущий трек на месте; выключение возвращает исходный порядок;
- `timeupdate` троттлится до 4 раз в секунду для стора, в движке позиция точная;
- ошибка загрузки → `status: 'error'` и человеческий текст.

`src/audio/queue.ts` — чистые функции `shuffleOrder`, `nextIndex`, `prevIndex` + тесты (repeat × shuffle).

`src/audio/mediaSession.ts` — `metadata`, `setPositionState` не чаще раза в секунду, обработчики `play/pause/previoustrack/nexttrack/seekto/seekbackward/seekforward`, всё в `try/catch`.

`src/audio/store.ts` — Zustand-стор поверх `AudioPort`; компоненты не трогают `<audio>` никогда.

`src/audio/background.ts` — заглушка `requestBackgroundFallback(track): Promise<boolean>`, возвращает `false`. Нужна, чтобы фолбэк появился позже без переделки.

## Ограничения

- Никаких плеер-библиотек.
- Никакого UI, кроме `/spike`.
- `play()` только по жесту пользователя.
- Один `visibilitychange` на документ.

## Готово, когда

- [ ] Протокол спайка пройден, `audio-findings.md` заполнен
- [ ] Фон и локскрин работают (или зафиксировано, что нет)
- [ ] Переключение с локскрина меняет трек в приложении
- [ ] Тесты очереди зелёные
- [ ] 50 переключений: без утечек, консоль чистая
- [ ] `npx tsc --noEmit` чисто

## Отчёт

Главное — результат спайка. Потом что сделано, что нет, где риски.
