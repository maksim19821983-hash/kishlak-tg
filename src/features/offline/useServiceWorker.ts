import { useEffect, useState } from 'react'

export type SwStatus = 'none' | 'installing' | 'ready'

/** Готов ли офлайн-кэш: без этого приложение без сети не откроется. */
export function useServiceWorker(): SwStatus {
  const [status, setStatus] = useState<SwStatus>(() =>
    typeof navigator === 'undefined' || !('serviceWorker' in navigator) ? 'none' : 'installing',
  )

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let alive = true

    const update = (): void => {
      if (!alive) return
      setStatus(navigator.serviceWorker.controller !== null ? 'ready' : 'installing')
    }

    update()
    navigator.serviceWorker.ready.then(() => {
      if (!alive) return
      update()
    }).catch(() => {})

    navigator.serviceWorker.addEventListener('controllerchange', update)
    const timer = setInterval(update, 2000)
    return () => {
      alive = false
      clearInterval(timer)
      navigator.serviceWorker.removeEventListener('controllerchange', update)
    }
  }, [])

  return status
}
