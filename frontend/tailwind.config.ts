import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // FieldCompliance semantic palette
        // Ink/foreground
        ink: {
          DEFAULT: '#111827',
          soft: '#374151',
          muted: '#6B7280',
          subtle: '#9CA3AF',
        },
        // Off-white background — cool dust, not warm cream
        canvas: {
          DEFAULT: '#F7F8FA',
          card: '#FFFFFF',
          raised: '#FCFCFD',
        },
        // Borders
        hairline: '#E5E7EB',
        divider: '#D1D5DB',
        // Semantic (compliance status)
        overdue: {
          DEFAULT: '#B91C1C',
          bg: '#FEE2E2',
        },
        warn: {
          DEFAULT: '#B45309',
          bg: '#FEF3C7',
        },
        ok: {
          DEFAULT: '#047857',
          bg: '#D1FAE5',
        },
        info: {
          DEFAULT: '#1D4ED8',
          bg: '#DBEAFE',
        },
        // Interactive
        accent: {
          DEFAULT: '#0F172A',
          hover: '#1E293B',
        },
      },
      borderRadius: {
        DEFAULT: '6px',
        card: '10px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
