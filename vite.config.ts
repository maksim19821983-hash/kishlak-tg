import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  define: {
    // метка сборки: по ней видно, какая версия реально запущена
    __BUILD_ID__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  build: {
    // Safari 15+ (iOS 15) — базовая цель для PWA
    target: ['safari15', 'chrome100', 'firefox100'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Туннель (localtunnel / cloudflared) ходит с чужим Host — без этого Vite отдаёт 403.
  server: { host: true, allowedHosts: true },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
