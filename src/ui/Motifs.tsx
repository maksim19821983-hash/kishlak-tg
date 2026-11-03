/** Знаки релизов: маленькие рисованные символы, печатаются на кассете и в кадре релиза. */

export type MotifName =
  | 'heart' | 'frog' | 'door' | 'ribbon' | 'skull' | 'star' | 'moon'
  | 'cassette' | 'flower' | 'cat' | 'bolt' | 'key' | 'glass'

const PATHS: Record<MotifName, React.ReactNode> = {
  heart: <path d="M12 20c-4.5-3-7-5.6-7-8.4C5 8.9 6.9 7 9.3 7c1.2 0 2.2.5 2.7 1.3C12.5 7.5 13.5 7 14.7 7 17.1 7 19 8.9 19 11.6c0 2.8-2.5 5.4-7 8.4Z" />,
  frog: <>
    <path d="M4.5 15c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6-3.4 5.5-7.5 5.5S4.5 18.6 4.5 15Z" />
    <circle cx="8.6" cy="7.6" r="2.6" />
    <circle cx="15.4" cy="7.6" r="2.6" />
  </>,
  door: <>
    <path d="M6 21V4h12v17" />
    <path d="M9 21h6" />
    <circle cx="14.5" cy="12.5" r=".9" />
  </>,
  ribbon: <>
    <path d="M12 3c2.6 3 4.5 5.6 4.5 8.4 0 3.4-2 5.6-4.5 5.6s-4.5-2.2-4.5-5.6C7.5 8.6 9.4 6 12 3Z" />
    <path d="M9 17l-2.5 4M15 17l2.5 4" />
  </>,
  skull: <>
    <path d="M12 3.5c4 0 7 2.8 7 6.5 0 2.4-1 3.6-2 4.6v2.9H7v-2.9c-1-1-2-2.2-2-4.6 0-3.7 3-6.5 7-6.5Z" />
    <circle cx="9.2" cy="10" r="1.5" />
    <circle cx="14.8" cy="10" r="1.5" />
    <path d="M10.5 17.5v3M13.5 17.5v3" />
  </>,
  star: <path d="M12 2.8l2.7 6 6.5.6-4.9 4.3 1.4 6.4L12 16.8l-5.7 3.3 1.4-6.4L2.8 9.4l6.5-.6z" />,
  moon: <path d="M15.5 3.2a8.7 8.7 0 1 0 5.3 13.6A9.4 9.4 0 0 1 15.5 3.2Z" />,
  cassette: <>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="8" cy="12" r="2.6" />
    <circle cx="16" cy="12" r="2.6" />
    <path d="M8 6l1.5 3h5L16 6" />
  </>,
  flower: <>
    <circle cx="12" cy="9" r="3.2" />
    <circle cx="12" cy="3.6" r="2.2" />
    <circle cx="12" cy="14.4" r="2.2" />
    <circle cx="6.6" cy="9" r="2.2" />
    <circle cx="17.4" cy="9" r="2.2" />
    <path d="M12 16.5V21" />
  </>,
  cat: <>
    <path d="M5 10.5C5 7 8 5 12 5s7 2 7 5.5S16 17 12 17s-7-3-7-6.5Z" />
    <path d="M7 6.5L5.5 3l3.2 1.6M17 6.5L18.5 3l-3.2 1.6" />
    <circle cx="9.7" cy="10.5" r=".9" />
    <circle cx="14.3" cy="10.5" r=".9" />
    <path d="M11 13h2M4 12h3M4 14.5h3M20 12h-3M20 14.5h-3" />
  </>,
  bolt: <path d="M13.5 2L6 13h4.5L9.5 22 18 10.5h-5z" />,
  key: <>
    <circle cx="8" cy="8" r="4" />
    <path d="M11 11l9 9M17 17l2-2M14.5 14.5l2-2" />
  </>,
  glass: <>
    <path d="M6 4h12l-2 7H8L6 4Z" />
    <path d="M12 11v8M8.5 21h7" />
  </>,
}

export function Motif({ name, size = 16, color = 'currentColor' }: { name?: string; size?: number; color?: string }) {
  const key = (name ?? '') as MotifName
  const node = PATHS[key] ?? PATHS.cassette
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      {node}
    </svg>
  )
}
