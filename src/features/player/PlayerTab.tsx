import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'
import type { Release, Track } from '@/data/types'
import { Cassette } from './Cassette'
import { IconShuffle, IconRepeat, IconMore } from '@/ui/icons'
import { HeartButton } from '@/ui/HeartButton'
import { TrackMenu } from '@/ui/TrackMenu'
import { useFavorites } from '@/features/favorites/store'
import { haptic } from '@/app/telegram'
import { parseLrc, getActiveLineIndex } from '@/features/lyrics/parseLrc'
import type { Lyrics } from '@/features/lyrics/parseLrc'
import { InsertScreen } from '@/features/lyrics/InsertScreen'
import { getWebEngine } from '@/audio/webEngine'
import { IconPrev, IconNext, IconPlay, IconPause, IconTheme, IconHeart, IconVolume, IconVolumeOff, IconExpand, IconCollapse } from '@/ui/icons'
import { getState } from '@/features/fan/state'
import { isListened } from '@/features/fan/derive'
import { toggleTheme, useCurrentPolarity } from '@/features/polarity/usePolarity'

/** Компактная громкость в шапке: только там, где есть мышь. */
function HeaderVolume() {
  const volume = useAudioStore((s) => s.volume)
  const setVolume = useAudioStore((s) => s.setVolume)
  const last = useRef(0.8)
  const muted = volume === 0

  return (
    <div className="flex items-center shrink-0" style={{ gap: 6, marginRight: 8 }}>
      <button
        onClick={() => {
          if (muted) setVolume(last.current > 0 ? last.current : 0.8)
          else {
            last.current = volume
            setVolume(0)
          }
          haptic('light')
        }}
        aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', color: muted ? 'var(--accent-text)' : 'var(--dim)' }}
      >
        {muted ? <IconVolumeOff size={17} /> : <IconVolume size={17} />}
      </button>

      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={(e) => setVolume(Number(e.target.value) / 100)}
        aria-label="Громкость"
        style={{ width: 68, height: 3, accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
    </div>
  )
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtRemaining(cur: number, dur: number): string {
  const rem = Math.max(0, dur - cur)
  return `-${fmt(rem)}`
}

type FlatTrack = { track: Track; release: Release; indexInRelease: number }

function buildFlat(releases: Release[]): FlatTrack[] {
  const result: FlatTrack[] = []
  for (const release of releases) {
    for (let i = 0; i < release.tracks.length; i++) {
      result.push({ track: release.tracks[i]!, release, indexInRelease: i })
    }
  }
  return result
}

type PlayerTabProps = { onOpenRelease?: (releaseId: string) => void; onOpenDebug?: () => void }

export function PlayerTab({ onOpenRelease, onOpenDebug }: PlayerTabProps) {
  const track       = useAudioStore((s) => s.track)
  const queue       = useAudioStore((s) => s.queue)
  const index       = useAudioStore((s) => s.index)
  const status      = useAudioStore((s) => s.status)
  const errorText   = useAudioStore((s) => s.error)
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration    = useAudioStore((s) => s.duration)
  const playing     = status === 'playing'

  const toggle  = useAudioStore((s) => s.toggle)
  const nextFn  = useAudioStore((s) => s.next)
  const prevFn  = useAudioStore((s) => s.prev)
  const seek    = useAudioStore((s) => s.seek)

  const [release, setRelease] = useState<Release | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)
  const draggingRef = useRef(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const suppressTapRef = useRef(false)
  const touchStartRef = useRef<{ t: number; x: number; y: number } | null>(null)
  const shuffle = useAudioStore((st) => st.shuffle)
  const repeat = useAudioStore((st) => st.repeat)
  const setShuffle = useAudioStore((st) => st.setShuffle)
  const setRepeat = useAudioStore((st) => st.setRepeat)
  const [insertOpen, setInsertOpen] = useState(false)
  const [lyrics, setLyrics] = useState<Lyrics | null>(null)
  const polarity = useCurrentPolarity()
  const [flatTracks, setFlatTracks] = useState<FlatTrack[]>([])
  const [menuTrackId, setMenuTrackId] = useState<string | null>(null)
  const [hoverCapable] = useState(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  const [listAnimating, setListAnimating] = useState(false)
  const [listOpen, setListOpen] = useState(() => {
    try {
      return localStorage.getItem('kishlak:player:list') !== '0'
    } catch {
      return true
    }
  })
  // кроссфейд строки в превью: сначала гасим старую, потом ставим новую
  const [shownLyric, setShownLyric] = useState('')
  const [lyricFading, setLyricFading] = useState(false)
  const favoriteTracks = useFavorites((st) => st.tracks)
  const toggleFavorite = useFavorites((st) => st.toggleTrack)
  const playNext = useAudioStore((st) => st.playNext)

  const cassetteTouchStartY = useRef<number | null>(null)
  const playingRowRef = useRef<HTMLDivElement>(null)

  // начальная загрузка: первый непрослушанный трек всего каталога
  useEffect(() => {
    CatalogRepo.load().then((cat) => {
      const flat = buildFlat(cat.releases)
      setFlatTracks(flat)
      const allTracks = flat.map((f) => f.track)

      const engine = getWebEngine()
      if (engine.getState().track) return

      const fanState = getState()
      let startIdx = 0
      for (let i = 0; i < flat.length; i++) {
        const stat = fanState.tracks[flat[i]!.track.id]
        if (!stat || !isListened(stat)) { startIdx = i; break }
      }
      engine.load(allTracks, startIdx)
    }).catch(() => {})
  }, [])

  // релиз текущего трека
  useEffect(() => {
    if (!track) return
    CatalogRepo.load().then((cat) => {
      setRelease(cat.releases.find((r) => r.id === track.releaseId) ?? null)
    }).catch(() => {})
  }, [track?.releaseId])

  // LRC текущего трека
  useEffect(() => {
    setLyrics(null)
    if (!track?.lrc) return
    let cancelled = false
    fetch(track.lrc)
      .then((r) => r.text())
      .then((text) => { if (!cancelled) setLyrics(parseLrc(text)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [track?.lrc])

  // скролл к играющей строке
  useEffect(() => {
    playingRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [index])

  const progress = duration > 0 ? currentTime / duration : 0
  const textLines = lyrics ? lyrics.lines.filter((l) => !l.isSection) : []
  const activeIdx = lyrics ? getActiveLineIndex(textLines, currentTime) : -1
  const prevLine = activeIdx > 0 ? textLines[activeIdx - 1] ?? null : null
  // до первой строки активной нет: показываем пустоту, а не первую строку заранее
  const activeLine = activeIdx >= 0 ? textLines[activeIdx] ?? null : null
  const nonBlank = textLines.filter((l) => !l.isBlank)
  // до первой строки показываем её приглушённо в средней полосе — как «сейчас начнётся»
  const upcomingLine = activeIdx < 0 ? (nonBlank[0] ?? null) : null
  const secondsToLyrics = upcomingLine && upcomingLine.time > currentTime
    ? Math.ceil(upcomingLine.time - currentTime)
    : 0
  // до первой строки: отсчёт только за 3 секунды, раньше ничего не показываем
  const showCountdown = secondsToLyrics > 0 && secondsToLyrics <= 3
  const nextLine = activeIdx < 0
    ? null
    : (activeIdx < textLines.length - 1 ? textLines[activeIdx + 1] ?? null : null)
  const hasLyrics = lyrics !== null && textLines.length > 0

  // плавная замена строки в превью
  useEffect(() => {
    const target = activeLine?.text ?? (showCountdown ? upcomingLine?.text ?? '' : '')
    if (target === shownLyric) return
    setLyricFading(true)
    const id = setTimeout(() => {
      setShownLyric(target)
      setLyricFading(false)
    }, 200)
    return () => clearTimeout(id)
  }, [activeLine?.text, showCountdown, upcomingLine?.text, shownLyric])

  // тап по кассете: только короткое касание без смещения
  const handleTap = () => {
    if (suppressTapRef.current) { suppressTapRef.current = false; return }
    haptic('medium')
    toggle()
  }

  // ── ползунок: pointer events, зона касания 44 px ───────────────────────────
  const timeAtClientX = (clientX: number): number => {
    const el = sliderRef.current
    if (!el || duration <= 0) return 0
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * duration
  }

  const handleSliderDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    setDragging(true)
    setDragTime(timeAtClientX(e.clientX))
    haptic('light')
  }

  const handleSliderMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    setDragTime(timeAtClientX(e.clientX))
  }

  const handleSliderUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const target = timeAtClientX(e.clientX)
    seek(target)
    setDragTime(target)
    setDragging(false)
    haptic('light')
  }

  const handleCassetteTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    cassetteTouchStartY.current = t?.clientY ?? null
    touchStartRef.current = t ? { t: Date.now(), x: t.clientX, y: t.clientY } : null
  }

  const handleCassetteTouchEnd = (e: React.TouchEvent) => {
    const start = cassetteTouchStartY.current
    cassetteTouchStartY.current = null
    const end = e.changedTouches[0]
    const info = touchStartRef.current
    touchStartRef.current = null
    if (!end) return

    // горизонтальный свайп — переключение трека
    if (info !== null) {
      const dx = end.clientX - info.x
      const dy = end.clientY - info.y
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressTapRef.current = true
        if (dx < 0) nextFn('user')
        else prevFn()
        haptic('light')
        return
      }
    }

    // свайп вверх — открыть вкладыш
    if (start !== null && start - end.clientY > 60 && hasLyrics) {
      suppressTapRef.current = true
      setInsertOpen(true)
      return
    }
    // долгое касание или смещение — это не тап, клик подавляем
    if (info) {
      const dt = Date.now() - info.t
      const dist = Math.hypot(end.clientX - info.x, end.clientY - info.y)
      if (dt >= 300 || dist >= 8) suppressTapRef.current = true
    }
  }

  const handleTrackTap = (globalIdx: number) => {
    const engine = getWebEngine()
    engine.load(flatTracks.map((f) => f.track), globalIdx)
    engine.play()
    haptic('light')
  }

  const globalIndex = track ? flatTracks.findIndex((ft) => ft.track.id === track.id) : -1
  const totalCount = flatTracks.length

  return (
    <div
      className="flex flex-col bg-[var(--scene)] overflow-hidden"
      style={{ height: '100%', paddingTop: 'calc(env(safe-area-inset-top) + var(--tg-safe-top, 0px))' }}
    >
      {/* шапка */}
      <div
        className="flex items-center justify-between px-screen shrink-0"
        style={{ height: 40 }}
      >
        <span
          className="font-mono text-mono-label uppercase text-ink"
          onPointerDown={() => {
            // долгое нажатие на «КИШЛАК» — диагностика (только в отладочной сборке)
            if (!onOpenDebug) return
            const timer = setTimeout(() => onOpenDebug(), 700)
            const clear = (): void => { clearTimeout(timer); window.removeEventListener('pointerup', clear) }
            window.addEventListener('pointerup', clear, { once: true })
          }}
        >
          КИШЛАК
        </span>
        <div className="flex items-center gap-1">
          {hoverCapable && <HeaderVolume />}
          <span className="font-mono text-mono-num tabular-nums text-dim">
            {track && totalCount > 0 ? `${String(globalIndex + 1).padStart(2, '0')} / ${String(totalCount).padStart(2, '0')}` : '—'}
          </span>
          <button
            onClick={() => {
              const next = !listOpen
              setListAnimating(true)
              setListOpen(next)
              try { localStorage.setItem('kishlak:player:list', next ? '1' : '0') } catch {}
              window.setTimeout(() => setListAnimating(false), 280)
              haptic('light')
            }}
            className="flex items-center justify-center text-dim"
            style={{ width: 40, height: 44 }}
            aria-label={listOpen ? 'Развернуть плеер на весь экран' : 'Показать список треков'}
          >
            {listOpen ? <IconExpand size={18} /> : <IconCollapse size={18} />}
          </button>
          <button
            onClick={() => { toggleTheme(); haptic('light') }}
            className="flex items-center justify-center text-dim"
            style={{ width: 44, height: 44 }}
            aria-label="Переключить тему"
          >
            <IconTheme size={18} />
          </button>
        </div>
      </div>

      <div
        className="flex flex-col min-h-0"
        style={{
          flexGrow: listOpen ? 0 : 1,
          flexShrink: 0,
          flexBasis: 'auto',
          transition: 'flex-grow 260ms cubic-bezier(.3,.7,.3,1)',
          justifyContent: listOpen ? 'flex-start' : 'space-between',
          paddingTop: listOpen ? 0 : 16,
          paddingBottom: listOpen ? 0 : 'calc(env(safe-area-inset-bottom) + 16px)',
        }}
      >
      {/* кассета */}
      <div
        className="px-screen shrink-0 mt-2"
        style={{ touchAction: 'none' }}
        onTouchStart={handleCassetteTouchStart}
        onTouchEnd={handleCassetteTouchEnd}
        onTouchCancel={() => { cassetteTouchStartY.current = null; touchStartRef.current = null }}
      >
        <Cassette
          side="A"
          onTap={handleTap}
          trackTitle={track?.title}
          releaseTitle={release?.title}
          releaseYear={release?.year}
          motif={release?.motif}
          motifColor={release?.palette.secondary}
          polarity={polarity}
        />
      </div>

      {!listOpen && (
        <div
          className="px-screen"
          style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}
        >
          <p
            className="font-display uppercase text-ink"
            style={{ fontSize: 30, lineHeight: 1.05, letterSpacing: '-.02em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {track?.title ?? '—'}
          </p>
        </div>
      )}

      {/* превью текста; если текста нет — предупреждаем, что он появится */}
      {track !== null && !hasLyrics && (
        <div className="px-screen mt-2 shrink-0">
          <p
            className="font-mono uppercase text-dim"
            style={{ fontSize: 10, letterSpacing: '.14em', height: 22, lineHeight: '22px', opacity: 0.7 }}
          >
            скоро будет текст
          </p>
        </div>
      )}

      {hasLyrics && (
        <div className="px-screen mt-2 shrink-0">
          <button onClick={() => setInsertOpen(true)} className="w-full text-left" aria-label="Открыть текст">
            {/* верхняя полоса: обратный отсчёт или предыдущая строка */}
            <p
              className="font-mono line-clamp-1"
              style={{
                height: showCountdown || (prevLine && !prevLine.isBlank) ? 22 : 0,
                lineHeight: '22px',
                overflow: 'hidden',
                fontSize: showCountdown ? 16 : undefined,
                letterSpacing: showCountdown ? '.10em' : undefined,
                fontWeight: showCountdown ? 700 : undefined,
                color: showCountdown ? 'var(--accent-text)' : 'var(--dim)',
                opacity: showCountdown ? 0.95 : prevLine && !prevLine.isBlank ? 0.8 : 0,
                transition: 'height 260ms ease, opacity 320ms ease',
              }}
            >
              {showCountdown
                ? secondsToLyrics
                : (prevLine && !prevLine.isBlank ? prevLine.text : '·')}
            </p>

            {/* активная строка или точки «текст скоро» */}
            <p
              className="font-mono text-lyric-active line-clamp-1"
              style={{
                height: 24,
                lineHeight: '24px',
                color: activeLine ? 'var(--accent-text)' : 'var(--dim)',
                opacity: activeLine && !activeLine.isBlank ? 1 : upcomingLine ? 0.55 : 0.45,
                transition: 'color 420ms ease, opacity 420ms ease',
              }}
            >
              {showCountdown || activeLine ? (
                <span
                  style={{
                    opacity: lyricFading ? 0 : 1,
                    transition: 'opacity 200ms ease',
                  }}
                >
                  {shownLyric || '·'}
                </span>
              ) : upcomingLine ? (
                <span className="inline-flex items-center" style={{ gap: 7 }} aria-label="текст скоро">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="lyric-dot" style={{ animationDelay: `${i * 140}ms` }} />
                  ))}
                </span>
              ) : '·'}
            </p>

            {/* следующая строка */}
            <p
              className="font-mono text-lyric text-dim line-clamp-1"
              style={{
                height: nextLine && !nextLine.isBlank ? 20 : 0,
                lineHeight: '20px',
                overflow: 'hidden',
                opacity: nextLine && !nextLine.isBlank ? 0.7 : 0,
                transition: 'height 260ms ease, opacity 320ms ease',
              }}
            >
              {nextLine && !nextLine.isBlank ? nextLine.text : '·'}
            </p>
          </button>
        </div>
      )}

      {/* прогресс */}
      <div className="px-screen mt-2 shrink-0">
        {dragging && (
          <div className="flex justify-center">
            <span className="font-mono text-mono-num tabular-nums text-ink bg-surface px-2 py-0.5 rounded">
              {fmt(dragTime)}
            </span>
          </div>
        )}
        <div
          ref={sliderRef}
          className="relative select-none"
          style={{ height: 44, touchAction: 'none' }}
          onPointerDown={handleSliderDown}
          onPointerMove={handleSliderMove}
          onPointerUp={handleSliderUp}
          onPointerCancel={handleSliderUp}
          role="slider"
          tabIndex={0}
          aria-label="Прогресс трека"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
        >
          <div
            className="absolute left-0 right-0 rounded-full"
            style={{ height: 3, top: '50%', transform: 'translateY(-50%)', background: 'var(--line)' }}
          />
          <div
            className="absolute left-0 rounded-full"
            style={{
              height: 3,
              top: '50%',
              transform: 'translateY(-50%)',
              width: `${Math.max(0, Math.min(1, dragging ? (duration > 0 ? dragTime / duration : 0) : progress)) * 100}%`,
              background: 'var(--accent)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: dragging ? 20 : 12,
              height: dragging ? 20 : 12,
              left: `clamp(0px, calc(${Math.max(0, Math.min(1, dragging ? (duration > 0 ? dragTime / duration : 0) : progress)) * 100}% - ${dragging ? 10 : 6}px), calc(100% - ${dragging ? 20 : 12}px))`,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--accent)',
              transition: 'width .12s ease, height .12s ease',
            }}
          />
        </div>
        <div className="flex justify-between" style={{ marginTop: -6 }}>
          <span className="font-mono text-mono-num tabular-nums text-dim">{fmt(currentTime)}</span>
          <span className="font-mono text-mono-num tabular-nums text-dim">{fmtRemaining(currentTime, duration)}</span>
        </div>
      </div>

      {/* транспорт: шаффл · назад · play · вперёд · повтор · любимое (+громкость на десктопе) */}
      <div className="px-screen py-2 flex items-center justify-between shrink-0">
        <button
          onClick={() => { setShuffle(!shuffle); haptic('light') }}
          className="relative flex items-center justify-center"
          style={{ width: 36, height: 44, color: shuffle ? 'var(--accent-text)' : 'var(--dim)' }}
          aria-label={shuffle ? 'Выключить перемешивание' : 'Перемешать'}
          aria-pressed={shuffle}
        >
          <IconShuffle size={20} />
          {shuffle && (
            <span className="absolute rounded-full" style={{ bottom: 2, width: 4, height: 4, background: 'var(--accent)' }} />
          )}
        </button>

        <button
          onClick={() => { prevFn(); haptic('light') }}
          className="flex items-center justify-center"
          style={{ width: 48, height: 52, color: 'var(--ink)' }}
          aria-label="Предыдущий трек"
        >
          <IconPrev size={26} />
        </button>

        <button
          onClick={handleTap}
          className="rounded-full flex items-center justify-center text-bg press"
          style={{ width: 52, height: 52, background: 'var(--ink)', marginInline: 6 }}
          aria-label={playing ? 'Пауза' : 'Воспроизвести'}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>

        <button
          onClick={() => { nextFn('user'); haptic('light') }}
          className="flex items-center justify-center"
          style={{ width: 48, height: 52, color: 'var(--ink)' }}
          aria-label="Следующий трек"
        >
          <IconNext size={26} />
        </button>

        <button
          onClick={() => {
            const order: Array<typeof repeat> = ['off', 'all', 'one']
            const nextMode = order[(order.indexOf(repeat) + 1) % order.length] ?? 'off'
            setRepeat(nextMode)
            haptic('light')
          }}
          className="relative flex items-center justify-center"
          style={{ width: 36, height: 44, color: repeat !== 'off' ? 'var(--accent-text)' : 'var(--dim)' }}
          aria-label={`Повтор: ${repeat}`}
        >
          <IconRepeat size={20} />
          {repeat !== 'off' && (
            <span className="absolute rounded-full" style={{ bottom: 2, width: 4, height: 4, background: 'var(--accent)' }} />
          )}
          {repeat === 'one' && (
            <span className="absolute font-mono" style={{ top: 4, right: 4, fontSize: 8, color: 'var(--accent-text)' }}>1</span>
          )}
        </button>

        <button
          onClick={() => {
            if (!track) return
            toggleFavorite(track.id)
            haptic('light')
          }}
          disabled={!track}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 44,
            color: track !== null && favoriteTracks.includes(track.id) ? 'var(--like)' : 'var(--dim)',
            opacity: track !== null ? 1 : 0.4,
          }}
          aria-label={track !== null && favoriteTracks.includes(track.id) ? 'Убрать из любимого' : 'В любимое'}
          aria-pressed={track !== null && favoriteTracks.includes(track.id)}
        >
          <IconHeart size={21} filled={track !== null && favoriteTracks.includes(track.id)} />
        </button>
      </div>

      {/* список треков */}
      </div>

      <div
        className="overflow-hidden overscroll-contain"
        style={{
          contain: 'layout paint',
          flexGrow: listOpen ? 1 : 0,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: 0,
          opacity: listOpen ? 1 : 0,
          transition:
            'flex-grow 260ms cubic-bezier(.3,.7,.3,1)',
          pointerEvents: listOpen ? 'auto' : 'none',
        }}
      >
      <div
        className="h-full overflow-y-auto overscroll-contain"
        style={{
          contentVisibility: listAnimating ? 'hidden' : 'visible',
          background: 'var(--panel)',
          borderTop: '1px solid var(--line)',
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          marginTop: 4,
          boxShadow: '0 -10px 24px rgba(0,0,0,.06)',
          transform: listOpen ? 'none' : 'translateY(48px)',
          transition: 'transform 260ms cubic-bezier(.3,.7,.3,1)',
        }}
      >
        <div className="px-screen py-2 border-t border-line">
          <p className="font-mono text-mono-label uppercase text-dim">
            ВСЕ ТРЕКИ · {totalCount}
          </p>
        </div>
        {flatTracks.map((ft, globalIdx) => {
          const isPlaying = track?.id === ft.track.id
          return (
            <div
              key={ft.track.id}
              ref={isPlaying ? playingRowRef : undefined}
              onClick={() => handleTrackTap(globalIdx)}
              className="flex items-center gap-3 px-screen py-2 border-b border-line last:border-0 active:bg-surface"
              style={{ minHeight: 44, cursor: 'pointer' }}
            >
              <span
                className="font-mono text-mono-num tabular-nums shrink-0 w-6"
                style={{ color: isPlaying ? 'var(--accent)' : 'var(--dim)' }}
              >
                {String(globalIdx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="font-display text-body-strong line-clamp-1"
                  style={{ color: isPlaying ? 'var(--accent-text)' : 'var(--ink)' }}
                  title={ft.track.title}
                >
                  {ft.track.title}
                </p>
                <p className="font-mono text-mono-label uppercase text-dim line-clamp-1">
                  {ft.release.title}
                </p>
              </div>
              <span className="font-mono text-mono-num tabular-nums text-dim shrink-0">
                {fmt(ft.track.duration)}
              </span>
              <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex' }}>
                <HeartButton
                  active={favoriteTracks.includes(ft.track.id)}
                  onToggle={() => { toggleFavorite(ft.track.id); haptic('light') }}
                  size={18}
                  label={favoriteTracks.includes(ft.track.id) ? 'Убрать из любимого' : 'В любимое'}
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuTrackId(ft.track.id); haptic('light') }}
                className="flex items-center justify-center text-dim shrink-0 -mr-2"
                style={{ width: 44, height: 44 }}
                aria-label={`Действия: ${ft.track.title}`}
              >
                <IconMore size={18} />
              </button>
            </div>
          )
        })}
        {/* отступ под TabBar */}
        <div style={{ height: 8 }} />
      </div>
      </div>


      {errorText !== null && errorText !== '' && (
        <div className="px-screen" style={{ marginTop: 6 }}>
          <p className="font-mono text-dim" style={{ fontSize: 10, letterSpacing: '.06em' }}>
            {errorText}
          </p>
        </div>
      )}

      {insertOpen && lyrics && (
        <InsertScreen
          lyrics={lyrics}
          currentTime={currentTime}
          queue={queue}
          release={release}
          onSeek={seek}
          onClose={() => setInsertOpen(false)}
        />
      )}

      {(() => {
        const menuTrack = menuTrackId ? flatTracks.find((f) => f.track.id === menuTrackId)?.track ?? null : null
        const inFavorites = menuTrack ? favoriteTracks.includes(menuTrack.id) : false
        return (
          <TrackMenu
            open={menuTrack !== null}
            title={menuTrack?.title ?? ''}
            onClose={() => setMenuTrackId(null)}
            actions={menuTrack ? [
              {
                label: inFavorites ? 'Убрать из любимого' : 'В любимое',
                onSelect: () => { toggleFavorite(menuTrack.id); haptic('light') },
                accent: inFavorites,
              },
              {
                label: 'Играть следующим',
                onSelect: () => { playNext(menuTrack); haptic('light') },
              },
              {
                label: 'Перейти к альбому',
                onSelect: () => { onOpenRelease?.(menuTrack.releaseId) },
              },
            ] : []}
          />
        )
      })()}
    </div>
  )
}
