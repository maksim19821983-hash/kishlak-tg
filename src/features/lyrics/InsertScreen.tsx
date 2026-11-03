import { useEffect, useRef, useState } from 'react'
import type { Lyrics } from './parseLrc'
import { getActiveLineIndex } from './parseLrc'
import type { Track, Release } from '@/data/types'
import { HapticFeedback } from '@/app/telegram'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

type Props = {
  lyrics: Lyrics
  currentTime: number
  queue: Track[]
  release: Release | null
  onSeek: (t: number) => void
  onClose: () => void
}

export function InsertScreen({ lyrics, currentTime, queue, release, onSeek, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    // mount → animate open
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartY.current
    touchStartY.current = null
    const end = e.changedTouches[0]?.clientY
    if (start !== null && end !== undefined && end - start > 80) handleClose()
  }

  // Только строки с текстом (без секций) для подсветки активной
  const textLines = lyrics.lines.filter((l) => !l.isSection)
  const activeIdx = getActiveLineIndex(textLines, currentTime)

  return (
    <div
      className="fixed inset-0 z-50 bg-bg overflow-hidden"
      style={{ perspective: '800px' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="h-full flex flex-col"
        style={{
          transformOrigin: 'bottom center',
          transform: `rotateX(${visible ? 0 : -80}deg)`,
          opacity: visible ? 1 : 0,
          transition: 'transform var(--dur-lyric), opacity var(--dur-lyric)',
        }}
      >
        {/* шапка */}
        <div
          className="flex items-center justify-between px-screen shrink-0"
          style={{ height: 40, marginTop: 'env(safe-area-inset-top)' }}
        >
          <h2 className="font-mono text-mono-label uppercase text-ink tracking-widest">
            Текст песни
          </h2>
          <button
            onClick={handleClose}
            className="font-mono text-mono-label uppercase text-dim min-h-[44px] pl-4"
            aria-label="Сложить вкладыш"
          >
            СЛОЖИТЬ
          </button>
        </div>

        <div className="h-px bg-line shrink-0 mx-screen" />

        {/* скролл */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-screen py-4">

          {/* строки лирики */}
          <div className="mb-6">
            {lyrics.lines.map((line, i) => {
              if (line.isBlank) return <div key={i} style={{ height: 34 }} />

              if (line.isSection) {
                return (
                  <p
                    key={i}
                    className="font-mono text-mono-label text-dim uppercase"
                    style={{ letterSpacing: '0.16em', marginTop: 24, marginBottom: 4 }}
                  >
                    {line.text}
                  </p>
                )
              }

              // Определяем индекс этой строки в textLines
              const textIdx = textLines.indexOf(line)
              const isActive = textIdx === activeIdx

              return (
                <button
                  key={i}
                  onClick={() => {
                    onSeek(line.time)
                    try { HapticFeedback.impactOccurred('light') } catch {}
                  }}
                  className="block w-full text-left whitespace-pre-wrap break-words font-mono text-lyric"
                  style={{
                    lineHeight: '34px',
                    // один шрифт у всех строк — иначе смена кегля «прыгает»
                    color: isActive ? 'var(--accent-text)' : 'var(--dim)',
                    fontWeight: isActive ? 600 : 400,
                    opacity: isActive ? 1 : 0.62,
                    transform: isActive ? 'translateX(4px) scale(1.015)' : 'translateX(0) scale(1)',
                    transformOrigin: 'left center',
                    transition:
                      'color 420ms cubic-bezier(.22,.8,.28,1), opacity 420ms cubic-bezier(.22,.8,.28,1), transform 420ms cubic-bezier(.22,.8,.28,1)',
                  }}
                >
                  {line.text}
                </button>
              )
            })}
          </div>

          <div className="h-px bg-line mb-4" />

          {/* трек-лист */}
          <div className="mb-6">
            {queue.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-line last:border-0">
                <span
                  className="font-mono text-dim tabular-nums shrink-0"
                  style={{ fontSize: 9.5, lineHeight: '14px', letterSpacing: '0.06em', minWidth: 20 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-body-strong flex-1 truncate">{t.title}</span>
                <span className="font-mono text-mono-num text-dim tabular-nums shrink-0">
                  {fmt(t.duration)}
                </span>
              </div>
            ))}
          </div>

          {/* выходные данные */}
          {release && (
            <p
              className="font-mono text-dim"
              style={{ fontSize: 9.5, lineHeight: '16px', letterSpacing: '0.08em' }}
            >
              КИШЛАК · {release.title.toUpperCase()} · {release.year}
              {' / '}
              ЗАПИСАНО В ПОДВАЛЕ · {release.tracks.length} ТРЕКОВ
              {' / '}
              ТИРАЖ 0341 / 1000
            </p>
          )}

          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </div>
      </div>
    </div>
  )
}
