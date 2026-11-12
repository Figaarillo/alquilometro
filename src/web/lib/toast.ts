import { useSyncExternalStore } from 'react'

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  text: string
}

let toasts: Toast[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string, kind: Toast['kind'] = 'success', ms = 3200) {
  const id = ++seq
  toasts = [...toasts, { id, kind, text }]
  emit()
  setTimeout(() => dismiss(id), ms)
}
toast.error = (text: string) => toast(text, 'error', 6000)
toast.info = (text: string) => toast(text, 'info')

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts,
  )
}
