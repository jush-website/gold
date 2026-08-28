import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: '我的記帳本',
        short_name: '記帳本',
        description: '您的專屬黃金與記帳管理工具',
        lang: 'zh-TW',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f9fafb',
        theme_color: '#f9fafb',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // /api/* 交給網路，不可被 SPA fallback 攔截
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // 金價：優先打網路，離線或逾時時回落到上次結果
            urlPattern: ({ url }) => url.pathname === '/api/gold',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gold-price',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        // Firestore / Auth 走自己的離線機制，不要讓 SW 介入
        navigationPreload: false,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // rolldown-vite 只接受函式形式的 manualChunks。
        // 目的是讓不常變動的第三方程式碼有自己的檔名雜湊，
        // 改版時使用者不必重新下載整包 660KB。
        // 註：firestore 與 @firebase 共用模組會被 rolldown 併成同一塊，
        //     這是相依關係決定的，不是設定沒生效。
        manualChunks(id) {
          if (id.includes('node_modules/@firebase/auth')) return 'firebase-auth'
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase')) return 'firebase-firestore'
          if (id.includes('node_modules/lucide-react')) return 'icons'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor'
        },
      },
    },
  },
})
