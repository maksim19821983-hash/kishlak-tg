import { useState } from 'react'
import { accentText, contrastRatio, parseHex, hexToHsl } from '@/features/polarity/accent'
import { analyzeCover } from '@/features/polarity/analyzeCover'

type Palette = { mode: 'paper' | 'dark'; accent: string }
type CoverInfo = { url: string; label: string; palette: Palette | null }

const COVERS = [
  { url: '/dev/covers/vdps.jpg',     label: 'ВДПС' },
  { url: '/dev/covers/shiz2.jpg',    label: 'ШИЗ 2' },
  { url: '/dev/covers/boleyu.jpg',   label: 'Болею' },
  { url: '/dev/covers/apnoe.jpg',    label: 'Апноэ' },
  { url: '/dev/covers/stigmata.jpg', label: 'Стигмата' },
  { url: '/dev/covers/lava.jpg',     label: 'Лава' },
]

function applyToDOM(mode: 'paper' | 'dark', accent: string, aText: string): void {
  const el = document.documentElement
  el.dataset.polarity = mode
  el.style.setProperty('--accent', accent)
  el.style.setProperty('--accent-text', aText)
}

export function PolarityPage() {
  const [covers, setCovers] = useState<CoverInfo[]>(
    COVERS.map((c) => ({ ...c, palette: null })),
  )
  const [active, setActive] = useState<number | null>(null)

  const analyze = async (idx: number, url: string) => {
    const palette = await analyzeCover(url)
    setCovers((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, palette } : c)),
    )
    setActive(idx)
    applyToDOM(palette.mode, palette.accent, accentText(palette.accent, palette.mode))
  }

  const activeCover = active !== null ? covers[active] : null
  const p = activeCover?.palette ?? null

  return (
    <div className="p-6 font-mono">
      <p className="font-display text-h1 uppercase mb-6">Полярность</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {covers.map((cover, idx) => (
          <button
            key={cover.url}
            onClick={() => void analyze(idx, cover.url)}
            className={`relative overflow-hidden rounded-sleeve aspect-square border-2 min-h-[44px] ${
              active === idx ? 'border-[var(--accent)]' : 'border-transparent'
            }`}
          >
            <img
              src={cover.url}
              alt={cover.label}
              className="w-full h-full object-cover"
            />
            {cover.palette && (
              <span className="absolute bottom-0 left-0 right-0 bg-[rgba(0,0,0,.6)] text-[#F1EDE6] font-mono text-mono-label uppercase px-1 py-0.5 text-center">
                {cover.palette.mode}
              </span>
            )}
          </button>
        ))}
      </div>

      {p && activeCover ? (
        <div className="border border-line p-4 font-mono text-mono-num space-y-2">
          <p className="text-mono-label uppercase text-dim mb-3">{activeCover.label}</p>
          <Row label="режим" value={p.mode} />
          <Row label="accent" value={p.accent}>
            <Swatch color={p.accent} />
          </Row>
          <Row label="accent-text" value={accentText(p.accent, p.mode)}>
            <Swatch color={accentText(p.accent, p.mode)} />
          </Row>
          <Row
            label="контраст"
            value={contrastRatio(
              parseHex(accentText(p.accent, p.mode)),
              parseHex(p.mode === 'paper' ? '#EDE7DC' : '#0B0B0C'),
            ).toFixed(2) + ':1'}
          />
          <Row label="hsl accent" value={fmtHsl(hexToHsl(p.accent))} />
        </div>
      ) : (
        <p className="text-mono-label uppercase text-dim">нажми на обложку</p>
      )}
    </div>
  )
}

function Row({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-dim w-28 shrink-0">{label}</span>
      <span className="tabular-nums">{value}</span>
      {children}
    </div>
  )
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-sm border border-line"
      style={{ background: color }}
    />
  )
}

function fmtHsl({ h, s, l }: { h: number; s: number; l: number }): string {
  return `${Math.round(h)}° ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}
