import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
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
