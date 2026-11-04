import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { initTelegram } from '@/app/telegram'
import '@/app/polarity'
import '@/styles/index.css'

initTelegram()

// офлайн-оболочка: приложение открывается и без сети
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// если React не смог стартовать, показываем причину вместо белого экрана
function showFatal(message: string): void {
  const host = document.getElementById('root')
  if (!host) return
  host.innerHTML = ''
  const box = document.createElement('pre')
  box.style.cssText = 'padding:20px;font:12px/1.5 monospace;color:#C0392B;white-space:pre-wrap;word-break:break-word'
  box.textContent = `Приложение упало\n\n${message}`
  host.appendChild(box)
}

window.addEventListener('error', (event) => {
  showFatal(`${event.message}\n${event.filename}:${event.lineno}:${event.colno}`)
})
window.addEventListener('unhandledrejection', (event) => {
  showFatal(String(event.reason))
})

const root = document.getElementById('root')
if (!root) throw new Error('#root не найден в index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
