import { useEffect, useState } from 'react'
import { getState, setState, scheduleSave } from './state'
import { maybeUpdateTitle, formatSince, type FanStats } from './title'
import { computeStats, getCachedProgress } from './trackListen'
import { CatalogRepo } from '@/data/CatalogRepo'
import type { Release } from '@/data/types'
import { NowPlayingBar } from '@/ui/NowPlayingBar'
import { IconTheme } from '@/ui/icons'
import { toggleTheme } from '@/features/polarity/usePolarity'
import { haptic } from '@/app/telegram'

function fmtMinutes(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  if (mins >= 600) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h} Ч ${m} МИН`
  }
  return mins.toLocaleString('ru')
}

function fmtNum(n: number): string {
  return n.toLocaleString('ru')
}

function fmtDate(ts: number): string {
  return new Date(ts)
    .toLocaleDateString('ru', { day: 'numeric', month: 'short' })
    .toUpperCase()
    .replace('.', '')
}

type Props = { onClose?: () => void; asTab?: boolean; onOpenPlayer?: () => void }

export function ProfileScreen({ onClose, asTab, onOpenPlayer }: Props) {
  const [stats, setStats] = useState<FanStats | null>(null)
  const [topRelease, setTopRelease] = useState<Release | null>(null)

  useEffect(() => {
    CatalogRepo.load().then((cat) => {
      const totalCatalogTracks = cat.releases.reduce((a, r) => a + r.tracks.length, 0)
      const totalCatalogReleases = cat.releases.length
      const trackCount: Record<string, number> = {}
      for (const r of cat.releases) trackCount[r.id] = r.tracks.length

      const s = computeStats(trackCount, totalCatalogTracks, totalCatalogReleases)
      setStats(s)

      const state = getState()
      const patch = maybeUpdateTitle(state, s)
      if (patch.title !== undefined || patch.titleComputedAt !== undefined) {
        setState({ ...state, ...patch })
        scheduleSave(true)
      }

      const fanState = getState()
      const sorted = [...cat.releases].sort((a, b) =>
        (fanState.releases[b.id]?.listenedTracks ?? 0) - (fanState.releases[a.id]?.listenedTracks ?? 0)
      )
      setTopRelease(sorted[0] ?? null)
    }).catch(() => {})
  }, [])

  const fanState = getState()
  const title = fanState.title
  const since = title ? formatSince(title.since) : null
  const totalMinutes = stats ? Math.floor(stats.totalSeconds / 60) : 0
  const topReleaseProgress = topRelease ? getCachedProgress(topRelease.id) : 0
  const topReleaseListened = topRelease ? (fanState.releases[topRelease.id]?.listenedTracks ?? 0) : 0
  const hasData = !!title || (!!stats && stats.listenedTracks >= 10)

  const recentSessions = [...fanState.sessions]
    .sort((a, b) => b.at - a.at)
    .slice(0, 3)
    .filter((s) => s.trackTitle)

  return (
    <div
      className={asTab ? 'flex flex-col min-h-full' : 'fixed inset-0 z-50 bg-bg flex flex-col overflow-hidden'}
      style={asTab
        ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 0 }
        : { paddingBottom: 'env(safe-area-inset-bottom)' }
      }
    >
      {/* шапка */}
      <div
        className="flex items-center justify-between px-screen shrink-0"
        style={{ height: 40 }}
      >
        {!asTab && onClose ? (
          <button
            onClick={onClose}
            className="font-mono text-mono-label uppercase text-dim min-h-[44px] pr-4"
            aria-label="Назад"
          >
            ↓
          </button>
        ) : (
          <span className="font-mono text-mono-label uppercase text-ink">КИШЛАК</span>
        )}
        <span className="font-mono text-mono-label uppercase text-ink">ПРОФИЛЬ</span>
        <div className="flex items-center gap-0">
          {since
            ? <span className="font-mono text-mono-num text-dim">{since}</span>
            : null
          }
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

      {/* пустое состояние */}
      {!hasData && (
        <div className="flex-1 flex items-center justify-center px-screen">
          <p className="font-mono text-mono-label uppercase text-dim text-center">
            Слушай — и здесь появится твой профиль
          </p>
        </div>
      )}

      {/* основной контент */}
      {hasData && (
        <div className="flex-1 overflow-y-auto overscroll-contain px-screen py-4">
          {asTab && onOpenPlayer && <NowPlayingBar onOpen={onOpenPlayer} />}

          {/* титул */}
          <div className="mb-4">
            <h1 className="font-display text-display-l uppercase text-ink">
              {title?.id ?? 'СЛУШАТЕЛЬ'}
            </h1>
            {topRelease && stats && stats.topReleaseTimeShare > 0 ? (
              <p className="font-mono text-mono-label uppercase text-dim mt-1">
                {topRelease.title.toUpperCase()} — {Math.round(stats.topReleaseTimeShare * 100)}%{' '}
                ТВОЕГО ВРЕМЕНИ
              </p>
            ) : (
              <p className="font-mono text-mono-label uppercase text-dim mt-1">
                ПРОСЛУШАЙ ЕЩЁ
              </p>
            )}
          </div>

          {/* характеристика */}
          {stats && stats.totalSeconds >= 600 && (
            <div className="mb-4">
              <p className="font-mono text-dim" style={{ fontSize: 11, lineHeight: '18px' }}>
                {[
                  topRelease
                    ? `${topRelease.title.toUpperCase()} — ${Math.round(stats.topReleaseTimeShare * 100)}% ТВОЕГО ВРЕМЕНИ`
                    : null,
                  stats.nightShare >= 0.3 && totalMinutes >= 30
                    ? `${Math.round(stats.nightShare * totalMinutes)} МИН НОЧЬЮ`
                    : null,
                  stats.maxTrackPlays >= 3
                    ? `ПОВТОРОВ: ${fmtNum(stats.maxTrackPlays)}`
                    : null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}

          {/* три цифры */}
          {stats && (
            <div
              className="flex mb-4"
              style={{ border: '1px solid var(--line)', borderRadius: 6 }}
            >
              {[
                { label: 'ТРЕКОВ', value: fmtNum(stats.listenedTracks) },
                { label: totalMinutes >= 600 ? 'ВРЕМЯ' : 'МИНУТ', value: fmtMinutes(stats.totalSeconds) },
                { label: 'ПОВТОРОВ', value: fmtNum(stats.maxTrackPlays) },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-center py-3"
                  style={{ borderRight: i < 2 ? '1px solid var(--line)' : undefined }}
                >
                  <span
                    className="font-mono tabular-nums text-ink"
                    style={{ fontSize: 20, lineHeight: 1, fontWeight: 600 }}
                  >
                    {item.value}
                  </span>
                  <span className="font-mono text-mono-label uppercase text-dim mt-1">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* топ-релиз */}
          {topRelease && topReleaseListened > 0 && (
            <div className="mb-4">
              <p className="font-mono text-mono-label uppercase text-dim mb-2">ТОП-РЕЛИЗ</p>
              <div className="flex items-center gap-3">
                <img
                  src={topRelease.coverSmall}
                  alt={topRelease.title}
                  className="rounded-sleeve object-cover shrink-0"
                  style={{ width: 64, height: 64 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-body-strong text-ink truncate">{topRelease.title}</p>
                  <p className="font-mono text-mono-num text-dim mt-0.5">
                    ТОП-РЕЛИЗ · {Math.round((stats?.topReleaseTimeShare ?? 0) * 100)}% · {topReleaseListened}
                  </p>
                  <div className="mt-2 h-0.5 w-full" style={{ background: 'var(--line)' }}>
                    <div
                      className="h-full"
                      style={{ width: `${topReleaseProgress * 100}%`, background: 'var(--accent)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* последнее */}
          {recentSessions.length > 0 && (
            <div className="mb-4">
              <p className="font-mono text-mono-label uppercase text-dim mb-2">ПОСЛЕДНЕЕ</p>
              {recentSessions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 border-b border-line last:border-0"
                >
                  <span className="font-display text-body-strong text-ink truncate flex-1 mr-2">
                    {s.trackTitle}
                  </span>
                  <span className="font-mono text-mono-num text-dim shrink-0">
                    {fmtDate(s.at)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* заглушка шаринга */}
          <button
            className="w-full font-mono text-mono-label uppercase border border-line py-3 text-dim"
            style={{ borderRadius: 6 }}
            disabled
            aria-label="Поделиться карточкой — скоро"
          >
            ПОДЕЛИТЬСЯ КАРТОЧКОЙ · СКОРО
          </button>

          <div style={{ height: 32 }} />
        </div>
      )}
    </div>
  )
}
