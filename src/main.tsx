import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { initTelegram } from '@/app/telegram'
import '@/app/polarity'
import '@/styles/index.css'

initTelegram()

const root = document.getElementById('root')
if (!root) throw new Error('#root не найден в index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
