# 01 — Каркас

**Читать:** `CLAUDE.md`, `docs/design/system.md`.
**Результат:** пустой, но правильный каркас: токены, полярность, шрифты, роуты, моки. Никакого UI продукта.

## Задача

1. Vite + React 19 + TypeScript (strict) + Tailwind CSS 3.4 + Vitest. Пакетный менеджер — npm (pnpm на машине нет). Алиас `@/` → `src/`, `noUncheckedIndexedAccess: true`.
2. Шрифты самохостингом: скопируй `design/assets/unbounded.ttf` и `jbmono-*.ttf` в `src/assets/fonts/`, подключи через `@font-face` в `styles/fonts.css`. Никаких Google Fonts.
3. `src/styles/tokens.css` — ровно токены из `system.md`, п. 2–6:
   - две полярности: `.paper { --bg; --surface; --ink; --dim; --line }` и `.dark { … }`;
   - `--accent` (линии, прогресс) и `--accent-text` (текст, контраст ≥ 4.5:1), значения по умолчанию `#8C5334`;
   - типографика (`--font-display`, `--font-mono`, размеры из таблицы);
   - шкала отступов, радиусы 10/12/16/24/999, длительности 120/200/420/600/300.
4. `tailwind.config.ts` — расширить тему этими токенами, `fontFamily` (`display`, `mono`), `borderRadius`, `transitionDuration`. Больше ничего в конфиг не добавлять.
5. `src/app/polarity.ts` — Zustand-стор полярности: `mode: 'paper' | 'dark'`, `setMode()`, ставит `data-polarity` на `<html>`. Дефолт — `paper`.
6. `src/app/App.tsx` — шелл: `100dvh`, поля 24 px, `padding-bottom: env(safe-area-inset-bottom)`, `background: var(--bg)`, `color: var(--ink)`.
7. `src/ui/Grain.tsx` — фиксированный оверлей шума 5%, `pointer-events: none`; `multiply` на бумаге, `overlay` на черноте (два класса).
8. `src/app/routes.tsx` — роуты-заглушки: `catalog`, `release/:id`, `player`, `insert`, `profile`, `search`. Каждый — `<div>экран</div>`.
9. `src/app/telegram.ts` — единственное место с `window.Telegram`: `ready()`, `expand()`, `disableVerticalSwipes()`, `setHeaderColor`, `setBackgroundColor`, хелпер `safeTelegram()`. Все вызовы в `try/catch`, вне Телеграма не падает.
10. `src/data/` — типы и загрузка каталога **из готового манифеста**, а не из моков:
    - типы `Artist`, `Release`, `Track` (с `artistId` и `releaseId`);
    - `manifest.json` уже сгенерирован в `public/content/manifest.json` (`tools/build_manifest.py`): там артист, один релиз «ВДПС», 9 треков, у двух есть `lrc`, обложки и аудио лежат в `public/content/…`;
    - `CatalogRepo.load()` — `fetch('/content/manifest.json')`, валидация формы, кэш в памяти; если файла нет — понятная ошибка, а не пустой экран;
    - `FanRepo` — заглушка прогресса (пока возвращает 0).
11. `src/audio/port.ts` — интерфейс `AudioPort` (`load`, `play`, `pause`, `seek`, `subscribe`, `getState`), реализация пока пустая заглушка.

## Ограничения

- Никаких UI-китов, иконочных паков, теней и градиентных кнопок.
- Никаких `any`, `@ts-ignore`, `!`.
- Ни одного импорта `window.Telegram` вне `telegram.ts`.
- Ни одного `fetch` вне репозиториев.

## Готово, когда

- [ ] `npm run build` и `npx tsc --noEmit` чисто
- [ ] В браузере: бумажный экран, зерно видно, шрифты применились (Unbounded в заголовке, моно в подписи)
- [ ] `document.documentElement.dataset.polarity` меняется, цвета меняются вместе с ним
- [ ] В токенах нет ни одного значения, которого нет в `system.md`
- [ ] Роуты открываются, каталог читается из `/content/manifest.json` через `CatalogRepo`, в списке 9 треков «ВДПС»
- [ ] `git commit -m "phase 0: scaffold + tokens"`

## Отчёт

Что сделано, какие пакеты добавлены, что осталось, где сомнения.
