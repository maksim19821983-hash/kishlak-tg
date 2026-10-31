# 01 — Каркас проекта

**Читай перед началом:** `CLAUDE.md`, `docs/design/system.md`.
**Результат:** пустое, но полностью готовое основание. Никакого плеера, никакой верстки экранов.

## Задача

1. Инициализировать проект: Vite + React 19 + TypeScript (strict) + Tailwind CSS 3.4 + Vitest. Пакетный менеджер — pnpm.
2. Настроить алиас `@/` → `src/`, `tsconfig` со `strict`, `noUncheckedIndexedAccess`.
3. Шрифты **самохостингом**, без Google Fonts CDN: `@fontsource/unbounded` (400, 600, 700, 800), `@fontsource/jetbrains-mono` (400, 500).
4. `src/styles/tokens.css` — CSS-переменные ровно из `docs/design/system.md`, раздел «Цвет» + типографика + отступы + скругления + длительности. Ничего не додумывать.
5. `tailwind.config.ts` — расширить тему токенами: `colors` (`void`, `surface`, `raised`, `press`, `line`, `ink`, `ink-dim`, `ink-mute`, `accent`), `fontFamily` (`display` → Unbounded, `mono` → JetBrains Mono), `borderRadius` (12/16/24/full), `transitionDuration` (120/200/420).
6. `src/app/App.tsx` — шелл: `100dvh`, `background: var(--bg-void)`, `padding-bottom: calc(64px + 56px + env(safe-area-inset-bottom))`, `padding-top: env(safe-area-inset-top)`.
7. `src/ui/Grain.tsx` — фиксированный оверлей шума 3% (`feTurbulence`), `pointer-events: none`, `z-index: 50`.
8. `src/app/telegram.ts` — инициализация SDK: `ready()`, `expand()`, `disableVerticalSwipes()`, `setHeaderColor('#0B0B0C')`, `setBackgroundColor('#0B0B0C')`. Все вызовы — через `safeTelegram()`, который не падает вне Телеграма.
9. Примитивы в `src/ui/`: `Button`, `IconButton`, `Pill`, `Cover`, `Skeleton`, `EmptyState`, `SectionHeader`. Без бизнес-логики, без хуков на данные.
10. `src/data/` — моки: один артист, 3 релиза, 10 треков, 2 LRC-строки в формате `[mm:ss.xx]`, 2 набора палитры. Типы: `Artist`, `Release`, `Track`, `Palette`.
11. Заглушки экранов-роутов: `home`, `artist`, `release`, `favorites`, `search` — просто `<div>экран</div>`, чтобы проверить каркас.
12. `src/app/App.tsx` временно показывает: имя артиста из мока, зерно, одну `Button` и `Skeleton` — чтобы глазами проверить токены.

## Ограничения

- Никаких UI-китов, никаких иконочных библиотек. Иконки — инлайновые SVG 24×24, `stroke-width: 1.5`, цвет `currentColor`.
- Никаких `any`, `!` и `@ts-ignore`.
- Никаких теней и градиентных кнопок.
- Не подключать роутер сложнее `react-router-dom` (v6, `BrowserRouter` не нужен — используем `MemoryRouter` + `initData` позже).

## Готово, когда

- [ ] `pnpm build` и `pnpm tsc --noEmit` — чисто
- [ ] `pnpm dev` открывается: чёрный экран, зерно видно, шрифт Unbounded применился к заголовку
- [ ] В `tokens.css` нет ни одного цвета, которого нет в `system.md`
- [ ] `telegram.ts` не падает при открытии в обычном браузере
- [ ] Моки типизированы, лежат в `src/data/`, экраны их читают
- [ ] `git commit -m "phase 0: scaffold + tokens"`

## Отчёт

Что сделано, какие пакеты добавлены и почему, что осталось, где сомнения.
