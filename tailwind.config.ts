import type { Config } from 'tailwindcss';

// Les couleurs viennent de variables CSS (réglables dans l'app, voir src/lib/theme.ts)
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: { 900: v('--c-bg-from'), 800: v('--c-bg-mid'), 700: v('--c-bg-to') },
        gold: { DEFAULT: v('--c-accent'), light: v('--c-accent-light'), dark: v('--c-accent-dark') },
        onaccent: v('--c-on-accent'),
        title: v('--c-title'),
        gain: { DEFAULT: v('--c-gain') },
        loss: { DEFAULT: v('--c-loss') },
      },
      // « text-white » (et ses variantes /50…) suit la couleur des textes choisie dans les Réglages ;
      // les fonds et bordures blancs (effet verre) ne changent pas.
      textColor: {
        white: v('--c-text'),
      },
      fontFamily: {
        sans: ['var(--font-text)'],
        mono: ['var(--font-num)'],
      },
      borderRadius: { glass: '20px' },
      boxShadow: { glass: '0 8px 32px rgba(0,0,0,0.35)' },
    },
  },
  plugins: [],
} satisfies Config;
