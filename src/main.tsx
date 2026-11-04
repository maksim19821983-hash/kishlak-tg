import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { initTelegram } from '@/app/telegram'
import '@/app/polarity'
import '@/styles/index.css'

initTelegram()

// офлайн-режим отключён: снимаем service worker и чистим его кэши один раз
if ('serviceWorker' in navigator) {
  void (async () => {
    try {
      const key = 'kishlak:sw-cleanup:v1'
      if (localStorage.getItem(key) === '1') return
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.unregister()))
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.filter((n) => n.startsWith('kishlak-')).map((n) => caches.delete(n)))
      }
      localStorage.setItem(key, '1')
    } catch {
      /* ничего страшного */
    }
  })()
}

const root = document.getElementById('root')
if (!root) throw new Error('#root не найден в index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
