import { useRef, useState } from 'react'
import { HapticFeedback } from '@/app/telegram'

const KEY = 'kishlak:onboard:v2'

/** Принудительный показ приветствия: `?onboard=1` или `startapp=onboard`. */
export function onboardingForced(): boolean {
  try {
    const query = new URLSearchParams(window.location.search).get('onboard')
    if (query === '1' || query === 'true') return true
    const start = window.Telegram?.WebApp?.initDataUnsafe?.start_param
    return start === 'onboard'
  } catch {
    return false
  }
}

export function hasSeenOnboarding(): boolean {
  if (onboardingForced()) return false
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
    kicker: '03 · проявление',
    title: 'Альбомы открываются',
    lines: [
      'В каталоге обложки сначала приглушены.',
      'Слушаешь песни — обложка заливается цветом снизу вверх.',
      'Соберёшь весь альбом — на конверте появится штамп ✓.',
    ],
  },
  {
    kicker: '04 · своё',
    title: 'Сердце и поиск',
    lines: [
      'Сердце в плеере или у трека добавляет песню в «Любимое».',
      'Там же можно убрать её одним тапом, если разонравилась.',
      'В каталоге есть поиск по альбомам и трекам.',
    ],
  },
  {
    kicker: '05 · текст',
    title: 'Текст идёт за песней',
    lines: [
      'Свайп вверх по кассете открывает вкладыш: текст и трек-лист.',
      'Строки подсвечиваются сами, тап по строке — переход к моменту.',
      'Текст пока готов не для всех песен — там стоит пометка «скоро будет текст».',
    ],
  },
]

/** Живая миниатюра: обложка заливается цветом по мере прослушивания. */
function RevealDemo() {
  const cover = '/content/covers/02-06-2022-400.jpg'
  return (
    <div className="flex items-end" style={{ gap: 10, marginTop: 18 }}>
      {[0.18, 0.55, 1].map((p) => (
        <div key={p} style={{ position: 'relative', width: 58, height: 58, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <img
            src={cover}
            alt=""
            aria-hidden
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.3)' }}
          />
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${(1 - p) * 100}% 0 0 0)` }}>
            <img
              src={cover}
              alt=""
              aria-hidden
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `saturate(${0.3 + 0.7 * p})` }}
            />
          </div>
          {p === 1 && (
            <div
              style={{
                position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: 4,
                background: 'var(--accent)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontSize: 10,
              }}
            >
              ✓
            </div>
          )}
        </div>
      ))}
      <span className="font-mono text-dim" style={{ fontSize: 9, letterSpacing: '.14em', marginLeft: 4 }}>
        0 → 100%
      </span>
    </div>
  )
}

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
    <div className="fixed inset-0 z-[55] bg-bg flex flex-col" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
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
            style={{ width: '100%', scrollSnapAlign: 'center', minHeight: '100%', paddingBottom: 8 }}
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
            {slide.kicker.startsWith('03') && <RevealDemo />}
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
