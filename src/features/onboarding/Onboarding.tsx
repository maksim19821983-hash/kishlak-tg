import { useRef, useState } from 'react'
import { HapticFeedback } from '@/app/telegram'

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
    title: 'Это архив',
    lines: [
      '31 кассета, 116 песен — весь Кишлак в одном месте.',
      'Каждая кассета — релиз: со своим годом, номером и цветом пластика.',
    ],
  },
  {
    kicker: '02 · плеер',
    title: 'Один тап',
    lines: [
      'Нажми на кассету — музыка пойдёт.',
      'Свайп по кассете листает треки, низ — очередь, шаффл и повтор.',
    ],
  },
  {
    kicker: '03 · текст',
    title: 'Текст идёт за песней',
    lines: [
      'Перед первой строкой появляется счётчик 3 · 2 · 1.',
      'Свайп вверх по кассете открывает вкладыш с текстом и трек-листом.',
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
        <p className="font-mono uppercase text-dim" style={{ fontSize: 9.5, letterSpacing: '.2em' }}>
          Кишлак · АПФС
        </p>
      </div>

      <div
        ref={trackRef}
        className="flex-1 min-h-0 flex overflow-x-auto"
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
            style={{ width: '100%', scrollSnapAlign: 'center' }}
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
