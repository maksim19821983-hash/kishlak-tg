import { useEffect, useState } from 'react'
import { useTelegramStatus } from '@/app/telegram'
import { useAudioStore } from '@/audio/store'
import { CatalogRepo } from '@/data/CatalogRepo'
import { getWebEngine } from '@/audio/webEngine'
import { getSessionDiag, subscribeFan } from '@/features/fan/trackListen'
import { getState } from '@/features/fan/state'
import { isListened, releaseProgress } from '@/features/fan/derive'

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function fmtN(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : String(n)
}

type MsMode = 'tracks' | 'withSeek' | 'all' | 'none'

const MS_ACTIONS = [
  'play', 'pause', 'previoustrack', 'nexttrack',
  'seekto', 'seekbackward', 'seekforward',
] as const

// ── диагностическая строка ──────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 py-0.5 border-b border-line">
      <span className="text-dim text-mono-label uppercase shrink-0">{label}</span>
      <span className="text-ink text-mono-num tabular-nums text-right truncate">{String(value)}</span>
    </div>
  )
}

type DiagSnapshot = {
  status: string
  trackId: string
  trackTitle: string
  elDuration: number
  elCurrentTime: number
  readyState: number
  paused: boolean
  elEnded: boolean
  errorCode: number | null
  errorMsg: string | null
  cPlay: number; cPause: number; cEnded: number; cMeta: number; cError: number
  cNextEnded: number; cNextUser: number
  cPlayRejected: number
  sessionNaturalMax: number
  sessionSeconds: number
  listens: number
  queueLen: number
  index: number
  pos: number
  repeat: string
}

function snapshot(): DiagSnapshot {
  const eng = getWebEngine()
  const st = eng.getState()
  const d = eng.getDiag()
  const c = eng.diagCounters
  const { sessionNaturalMax, sessionSeconds } = getSessionDiag()
  const fanState = getState()
  const listens = st.track ? (isListened(fanState.tracks[st.track.id] ?? { maxPosition: 0, duration: 0, seconds: 0, plays: 0, lastAt: 0, completed: false }) ? 1 : 0) : 0
  return {
    status: st.status,
    trackId: st.track?.id ?? '—',
    trackTitle: st.track?.title ?? '—',
    elDuration: d.elDuration,
    elCurrentTime: d.elCurrentTime,
    readyState: d.readyState,
    paused: d.paused,
    elEnded: d.elEnded,
    errorCode: d.errorCode,
    errorMsg: d.errorMsg,
    cPlay: c.play, cPause: c.pause, cEnded: c.ended, cMeta: c.loadedmetadata, cError: c.error,
    cNextEnded: c.nextEnded, cNextUser: c.nextUser,
    cPlayRejected: c.playRejected,
    sessionNaturalMax,
    sessionSeconds,
    listens,
    queueLen: d.queueLen,
    index: d.index,
    pos: d.pos,
    repeat: st.repeat,
  }
}

export function SpikePage() {
  const tgStatus = useTelegramStatus()
  const status    = useAudioStore((s) => s.status)
  const track     = useAudioStore((s) => s.track)
  const currentTime = useAudioStore((s) => s.currentTime)
  const duration  = useAudioStore((s) => s.duration)
  const toggle    = useAudioStore((s) => s.toggle)
  const next      = useAudioStore((s) => s.next)
  const seek      = useAudioStore((s) => s.seek)
  const load      = useAudioStore((s) => s.load)

  const playing = status === 'playing'
  const [loadError, setLoadError] = useState<string | null>(null)
  const [catalogState, setCatalogState] = useState('…')
  const [msMode, setMsMode] = useState<MsMode>('tracks')
  const [msLog, setMsLog] = useState<string[]>([])
  const prev = useAudioStore((s) => s.prev)

  const [diag, setDiag] = useState<DiagSnapshot>(snapshot)
  const [journal, setJournal] = useState<string[]>([])

  // журнал переходов: видно, что происходит после конца трека
  useEffect(() => {
    const eng = getWebEngine()
    const stamp = (): string => {
      const t = new Date()
      return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
    }
    const push = (line: string): void =>
      setJournal((prevLog) => [`${stamp()} ${line}`, ...prevLog].slice(0, 16))

    let prevTrackId: string | null = null
    let prevPos: number | null = null
    let prevStatus: string | null = null

    const unsub = eng.subscribe((st) => {
      const id = st.track?.id ?? null
      if (prevTrackId !== null && id !== prevTrackId) push(`трек → ${st.track?.title ?? '—'}`)
      const d = eng.getDiag()
      if (prevPos !== null && d.pos !== prevPos) push(`pos ${prevPos} → ${d.pos}`)
      if (prevStatus !== null && st.status !== prevStatus) push(`status ${prevStatus} → ${st.status}`)
      prevTrackId = id
      prevPos = d.pos
      prevStatus = st.status
    })
    const unsubEnded = eng.subscribeEnded((t) => push(`ENDED «${t.title}»`))
    const unsubProgress = subscribeFan(() => {
      const state = getState()
      const allTracks = getWebEngine().getState().queue
      const releaseIds = [...new Set(allTracks.map((t) => t.releaseId))]
      const parts = releaseIds.map((id) => `${id}: ${Math.round(releaseProgress(id, allTracks, state) * 100)}%`)
      if (parts.length > 0) push(`прогресс ${parts.join(', ')}`)
    })
    push('журнал запущен')
    return () => { unsub(); unsubEnded(); unsubProgress() }
  }, [])

  // живая диагностика 4 раза/сек
  useEffect(() => {
    const id = setInterval(() => setDiag(snapshot()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      setMsLog(['mediaSession недоступен'])
      return
    }
    const ms = navigator.mediaSession
    const log: string[] = []

    for (const action of MS_ACTIONS) {
      try { ms.setActionHandler(action, null) } catch { /* не поддерживается */ }
    }

    const reg = (action: MediaSessionAction, handler: MediaSessionActionHandler): void => {
      try {
        ms.setActionHandler(action, handler)
        log.push(`${action}: ok`)
      } catch (err) {
        log.push(`${action}: ERROR ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (msMode !== 'none') {
      reg('play', () => toggle())
      reg('pause', () => toggle())
      reg('previoustrack', () => prev())
      reg('nexttrack', () => next())
    }
    if (msMode === 'withSeek' || msMode === 'all') {
      reg('seekto', (d) => { if (typeof d.seekTime === 'number') seek(d.seekTime) })
    }
    if (msMode === 'all') {
      reg('seekbackward', (d) => seek(Math.max(0, currentTime - (d.seekOffset ?? 10))))
      reg('seekforward', (d) => seek(currentTime + (d.seekOffset ?? 10)))
    }

    setMsLog(log)
  }, [msMode, toggle, prev, next, seek, currentTime])

  useEffect(() => {
    CatalogRepo.load()
      .then((catalog) => {
        const tracks = catalog.releases.flatMap((r) => r.tracks)
        setCatalogState(`ok: ${tracks.length} треков`)
        if (tracks.length === 0) setLoadError('в манифесте нет треков')
        load(tracks, 0)
      })
      .catch((err: unknown) => {
        setCatalogState('ошибка')
        setLoadError(err instanceof Error ? err.message : String(err))
      })
  }, [load])

  return (
    <div className="p-4 font-mono">
      <p className="font-display text-h1 uppercase mb-4">Спайк</p>

      <span
        className={`inline-block px-2 py-1 text-mono-label uppercase mb-4 ${
          tgStatus === 'ready'
            ? 'bg-[var(--accent)] text-[var(--bg-base)]'
            : 'border border-line text-dim'
        }`}
      >
        {tgStatus === 'ready' ? 'tg: ok' : tgStatus === 'loading' ? 'tg: …' : 'tg: браузер'}
      </span>

      <p className="mb-2 text-mono-num text-dim">каталог: {catalogState}</p>
      {loadError !== null && (
        <p className="mb-4 text-mono-num text-[var(--accent-text)]">ошибка: {loadError}</p>
      )}

      {/* ── ДИАГНОСТИКА ──────────────────────────────────────────── */}
      <div className="mt-2 mb-4">
        <p className="text-mono-label uppercase text-dim mb-1">состояние движка</p>
        <Row label="status"   value={diag.status} />
        <Row label="track.id" value={diag.trackId} />
        <Row label="title"    value={diag.trackTitle} />

        <p className="text-mono-label uppercase text-dim mt-3 mb-1">el.*</p>
        <Row label="el.duration"    value={fmtN(diag.elDuration)} />
        <Row label="el.currentTime" value={fmtN(diag.elCurrentTime)} />
        <Row label="el.readyState"  value={diag.readyState} />
        <Row label="el.paused"      value={String(diag.paused)} />
        <Row label="el.ended"       value={String(diag.elEnded)} />
        {diag.errorCode !== null && (
          <Row label="el.error" value={`${diag.errorCode}: ${diag.errorMsg ?? ''}`} />
        )}

        <p className="text-mono-label uppercase text-dim mt-3 mb-1">события (кол-во)</p>
        <Row label="play"          value={diag.cPlay} />
        <Row label="pause"         value={diag.cPause} />
        <Row label="ended"         value={diag.cEnded} />
        <Row label="loadedmetadata" value={diag.cMeta} />
        <Row label="error"         value={diag.cError} />
        <Row label="next(ended)"   value={diag.cNextEnded} />
        <Row label="next(user)"    value={diag.cNextUser} />
        <Row label="play rejected" value={diag.cPlayRejected} />

        <p className="text-mono-label uppercase text-dim mt-3 mb-1">фан-сессия</p>
        <Row label="sessionNaturalMax" value={fmtN(diag.sessionNaturalMax)} />
        <Row label="sessionSeconds"    value={fmtN(diag.sessionSeconds)} />
        <Row label="listens (трек)"    value={diag.listens} />

        <p className="text-mono-label uppercase text-dim mt-3 mb-1">очередь</p>
        <Row label="queue.length" value={diag.queueLen} />
        <Row label="index"        value={diag.index} />
        <Row label="pos"          value={diag.pos} />
        <Row label="repeat"       value={diag.repeat} />

        <p className="text-mono-label uppercase text-dim mt-3 mb-1">журнал</p>
        <ul className="text-mono-num">
          {journal.length === 0 && <li className="text-dim">пока пусто</li>}
          {journal.map((line) => (
            <li key={line} className="text-dim">{line}</li>
          ))}
        </ul>
      </div>

      <div className="mb-2">
        <p className="text-mono-label uppercase text-dim">сейчас</p>
        <p className="font-display text-body-strong truncate">{track?.title ?? '—'}</p>
        <p className="text-mono-label uppercase text-dim mt-1">{status}</p>
      </div>

      <p className="text-mono-num tabular-nums mb-4">
        {fmt(currentTime)} / {duration > 0 ? fmt(duration) : '--:--'}
      </p>

      <input
        type="range"
        min={0}
        max={duration > 0 ? duration : 0}
        step={0.5}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
        className="w-full mb-6 min-h-[44px]"
        style={{ accentColor: 'var(--accent)' }}
      />

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-mono-label uppercase text-dim mb-2">media session</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(['tracks', 'withSeek', 'all', 'none'] as MsMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setMsMode(mode)}
              className={`font-mono text-mono-label uppercase border px-3 py-2 min-h-[44px] ${
                msMode === mode ? 'border-ink text-ink' : 'border-line text-dim'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <ul className="text-mono-num">
          {msLog.map((line) => (
            <li key={line} className="text-dim">{line}</li>
          ))}
        </ul>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={() => toggle()}
          className="font-mono text-mono-label uppercase border border-line px-4 py-2 min-h-[44px]"
        >
          {playing ? 'pause' : 'play'}
        </button>
        <button
          onClick={() => next('user')}
          className="font-mono text-mono-label uppercase border border-line px-4 py-2 min-h-[44px]"
        >
          следующий
        </button>
      </div>
    </div>
  )
}
