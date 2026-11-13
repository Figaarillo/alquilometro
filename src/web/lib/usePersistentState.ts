import { useEffect, useState } from 'react'

/**
 * useState que se recuerda en este dispositivo (localStorage).
 * Si el navegador no deja guardar (modo privado), funciona igual pero sin recordar.
 */
export function usePersistentState<T>(key: string, initial: T, isValid: (v: unknown) => v is T = (v): v is T => v != null) {
  const storageKey = `alquilometro.${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw == null) return initial
      const parsed: unknown = JSON.parse(raw)
      return isValid(parsed) ? parsed : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      /* sin storage: no se recuerda, pero no se rompe */
    }
  }, [storageKey, value])

  return [value, setValue] as const
}
