import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: { 900: '#070a1f', 800: '#0b0f2a', 700: '#141a45' },
        violet: { deep: '#2a1250' },
        gold: { DEFAULT: '#E6C068', soft: '#f0d594', dim: '#9c8247' },
        gain: { DEFAULT: '#34d399', dim: '#10b981' },
        loss: { DEFAULT: '#ff6b6b', dim: '#f0525a' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { glass: '20px' },
      boxShadow: { glass: '0 8px 32px rgba(0,0,0,0.35)' },
    },
  },
  plugins: [],
} satisfies Config;
