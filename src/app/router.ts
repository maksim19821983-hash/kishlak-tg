import { useSyncExternalStore } from 'react'

// Минимальный роутер на History API: пакет не согласован, а шесть экранов его не требуют.

export type Route =
  | { name: 'catalog' }
  | { name: 'release'; id: string }
  | { name: 'player' }
  | { name: 'insert' }
  | { name: 'profile' }
  | { name: 'search' }
  | { name: 'spike' }
  | { name: 'polarity' }

export function parse(pathname: string): Route | null {
  const parts = pathname.split('/').filter(Boolean)
  const [head, id, ...rest] = parts
  if (rest.length > 0) return null
  if (head === undefined || head === 'catalog') return id === undefined ? { name: 'catalog' } : null
  if (head === 'release') return id === undefined ? null : { name: 'release', id: decodeURIComponent(id) }
  if (id !== undefined) return null
  if (head === 'player' || head === 'insert' || head === 'profile' || head === 'search') return { name: head }
  if (head === 'spike') return { name: 'spike' }
  if (head === 'polarity' && import.meta.env.DEV) return { name: 'polarity' }
  return null
}

export function href(route: Route): string {
  if (route.name === 'release') return `/release/${encodeURIComponent(route.id)}`
  return `/${route.name}`
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

window.addEventListener('popstate', notify)

export function navigate(route: Route): void {
  window.history.pushState(null, '', href(route))
  notify()
}

export function back(): void {
  window.history.back()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}
