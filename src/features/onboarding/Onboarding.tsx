import { useRef, useState } from 'react'
import { HapticFeedback } from '@/app/telegram'
import { Logo1111 } from '@/ui/Logo1111'

const KEY = 'kishlak:onboard:v1'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* приватный режим — просто покажем снова */
  }
}

type Slide = { kicker: string; title: string; lines: string[] }

const SLIDES: Slide[] = [
  {
    kicker: '01 · архив',
    title: 'Весь Кишлак',
    lines: [
      '31 кассета, 116 песен — всё в одном месте.',
      'Каждая кассета — релиз: свой год, номер и цвет пластика.',
    ],
  },
  {
    kicker: '02 · плеер',
    title: 'Один тап',
    lines: [
      'Нажми на кассету — музыка пойдёт.',
      'Свайп по кассете листает треки. Ниже — очередь, шаффл и повтор.',
      'Уголки в шапке разворачивают плеер на весь экран.',
    ],
  },
  {
    kicker: '03 · текст',
    title: 'Текст идёт за песней',
    lines: [
      'Свайп вверх по кассете открывает вкладыш: текст и трек-лист.',
      'Строки подсвечиваются сами, тап по строке — переход к моменту.',
      'Текст пока готов не для всех песен — там стоит пометка «скоро будет текст».',
    ],
  },
  {
    kicker: '04 · своё',
    title: 'Сердце и поиск',
    lines: [
      'Сердце добавляет песню в «Любимое» — вкладка рядом с плеером.',
      'В каталоге есть поиск по альбомам и трекам.',
      'Избранное и прослушивания синхронизируются между устройствами в Телеграме.',
    ],
  },
]

export function Onboarding({ onDone, onStart }: { onDone: () => void; onStart: () => void }) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const finish = (start: boolean): void => {
    markSeen()
    try {
      HapticFeedback.impactOccurred('light')
    } catch {
      /* вне телеграма */
    }
    if (start) onStart()
    onDone()
  }

  const next = (): void => {
    if (index >= SLIDES.length - 1) {
      finish(true)
      return
    }
    const nextIndex = index + 1
    setIndex(nextIndex)
    const el = trackRef.current
    if (el) el.scrollTo({ left: el.clientWidth * nextIndex, behavior: 'smooth' })
  }

  return (
    <div className="fixed inset-0 z-[55] bg-bg flex flex-col">
      <div className="px-screen" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 28px)' }}>
        <div className="flex items-center justify-between">
          <p className="font-mono uppercase text-dim" style={{ fontSize: 9.5, letterSpacing: '.2em' }}>
            Кишлак · АПФС
          </p>
          <button
            onClick={() => finish(false)}
            className="font-mono uppercase text-dim"
            style={{ fontSize: 9.5, letterSpacing: '.16em', minHeight: 32, paddingLeft: 8, paddingRight: 8 }}
          >
            пропустить
          </button>
        </div>
      </div>

      <div
        aria-hidden
        className="flex-1 min-h-0"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.18, pointerEvents: 'none' }}
      >
        <Logo1111 height={168} />
      </div>

      <div
        ref={trackRef}
        className="flex min-h-0 overflow-x-auto shrink-0"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
        onScroll={(e) => {
          const el = e.currentTarget
          const i = Math.round(el.scrollLeft / el.clientWidth)
          if (i !== index) setIndex(i)
        }}
      >
        {SLIDES.map((slide) => (
          <div
            key={slide.title}
            className="shrink-0 px-screen flex flex-col justify-center"
            style={{ width: '100%', scrollSnapAlign: 'center', minHeight: '42vh', paddingBottom: 8 }}
          >
            <p className="font-mono uppercase text-dim" style={{ fontSize: 10, letterSpacing: '.2em' }}>
              {slide.kicker}
            </p>
            <h2
              className="font-display uppercase text-ink"
              style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: '-.02em', marginTop: 10 }}
            >
              {slide.title}
            </h2>
            <div style={{ marginTop: 18 }}>
              {slide.lines.map((line) => (
                <p key={line} className="text-body text-dim" style={{ marginBottom: 10, lineHeight: 1.5 }}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-screen flex items-center justify-between" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 22px)' }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          {SLIDES.map((slide, i) => (
            <span
              key={slide.title}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? 'var(--accent)' : 'var(--line)',
                transition: 'width 240ms ease, background 240ms ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="font-display uppercase text-ink"
          style={{
            fontSize: 13,
            letterSpacing: '.04em',
            minHeight: 44,
            paddingLeft: 18,
            paddingRight: 18,
            border: '1px solid var(--ink)',
            borderRadius: 999,
          }}
        >
          {index >= SLIDES.length - 1 ? 'Начать слушать' : 'Дальше'}
        </button>
      </div>
    </div>
  )
}
