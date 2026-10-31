import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        dim: 'var(--dim)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        'accent-text': 'var(--accent-text)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'display-frame': ['var(--text-display-frame)', { lineHeight: '52px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-l': ['var(--text-display-l)', { lineHeight: '38px', letterSpacing: '-0.025em', fontWeight: '800' }],
        h1: ['var(--text-h1)', { lineHeight: '34px', letterSpacing: '-0.025em', fontWeight: '800' }],
        h2: ['var(--text-h2)', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '700' }],
        body: ['var(--text-body)', { lineHeight: '21px', fontWeight: '400' }],
        'body-strong': ['var(--text-body-strong)', { lineHeight: '18px', fontWeight: '600' }],
        'mono-label': ['var(--text-mono-label)', { lineHeight: '14px', letterSpacing: '0.16em', fontWeight: '500' }],
        'mono-num': ['var(--text-mono-num)', { lineHeight: '16px', letterSpacing: '0.03em', fontWeight: '500' }],
        lyric: ['var(--text-lyric)', { lineHeight: '34px', fontWeight: '400' }],
        'lyric-active': ['var(--text-lyric-active)', { lineHeight: '34px', fontWeight: '600' }],
      },
      spacing: {
        screen: 'var(--screen-pad)',
      },
      borderRadius: {
        cassette: 'var(--radius-cassette)',
        sleeve: 'var(--radius-sleeve)',
        plate: 'var(--radius-plate)',
        sheet: 'var(--radius-sheet)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        cassette: 'var(--shadow-cassette)',
      },
      transitionDuration: {
        micro: 'var(--dur-micro)',
        ui: 'var(--dur-ui)',
        theme: 'var(--dur-theme)',
        tape: 'var(--dur-tape)',
        lyric: 'var(--dur-lyric)',
      },
    },
  },
  plugins: [],
} satisfies Config
