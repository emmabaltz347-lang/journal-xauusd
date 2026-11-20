/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Nom du repo GitHub : sert de chemin de base sur GitHub Pages
const base = process.env.VITE_BASE ?? '/journal-xauusd/';

// APP_VERSION permet aux copies de l'app (autres comptes) d'afficher la version d'origine
const version = (process.env.APP_VERSION ?? process.env.GITHUB_SHA ?? 'dev').slice(0, 7);

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    {
      // version.json : permet à l'app de savoir qu'une nouvelle version est en ligne
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
      },
    },
    VitePWA({
      // la nouvelle version prend la main immédiatement (skipWaiting) ; le rechargement est géré dans src/lib/pwa.ts
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Journal de trading XAUUSD',
        short_name: 'Journal Or',
        description: 'Journal de trading XAUUSD — statistiques en R',
        lang: 'fr',
        theme_color: '#0b0f2a',
        background_color: '#0b0f2a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['demo/**', 'version.json'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3_000_000,
        // Les appels à l'API GitHub ne sont jamais mis en cache
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], charts: ['recharts'], motion: ['framer-motion'] } },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
