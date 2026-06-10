/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path configurable pour déployer à la racine ('/') ou sous un
// sous-chemin (ex: '/champindex/' sur GitHub Pages).
const base = process.env.DEPLOY_BASE || '/'

export default defineConfig({
  base,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'ChampIndex — Foraging France',
        short_name: 'ChampIndex',
        description: 'Prédiction de cueillette de champignons, plantes et baies sauvages en France.',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#1a2215',
        theme_color: '#1a2215',
        orientation: 'portrait',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍄</text></svg>',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
        categories: ['lifestyle', 'weather'],
        lang: 'fr',
      },
      workbox: {
        // Precache tous les assets Vite (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,svg,ico,woff,woff2}'],
        // Runtime caching pour les APIs et tuiles
        runtimeCaching: [
          {
            // Tuiles OpenStreetMap — cache first, max 500 tuiles, 30 jours
            urlPattern: /^https:\/\/.*(tile\.openstreetmap|basemaps\.cartocdn)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Open-Meteo weather API — stale while revalidate, 1h
            urlPattern: /^https:\/\/.*open-meteo\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 heure
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Open-Elevation — cache first, 30 jours (le terrain ne change pas)
            urlPattern: /^https:\/\/.*open-elevation\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'elevation-api',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // IGN Geopf (altimétrie + WFS) — cache first, 7 jours
            urlPattern: /^https:\/\/data\.geopf\.fr/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ign-api',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Nominatim geocoding — cache first, 7 jours
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'nominatim-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Leaflet CSS from unpkg
            urlPattern: /^https:\/\/unpkg\.com\/leaflet/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-cdn',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  css: {
    transformer: 'postcss',
  },
})
