import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0b1c36',
          mid: '#152847',
          light: '#1e3760',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c97a',
          pale: '#f5e9c8',
        },
        cream: {
          DEFAULT: '#faf7f0',
          dark: '#f0ebe0',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto-sans)', 'Noto Sans KR', 'sans-serif'],
        serif: ['var(--font-noto-serif)', 'Noto Serif KR', 'serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#1a1a2e',
            a: { color: '#c9a84c' },
            strong: { color: '#0b1c36' },
            code: {
              color: '#c9a84c',
              backgroundColor: 'rgba(201,168,76,0.1)',
              borderRadius: '3px',
              padding: '0.1em 0.3em',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
