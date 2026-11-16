/** Lógica pura de los gestos de la galería (sin DOM, para poder testearla). */

/** Distancia (px) hacia abajo que cierra la foto a pantalla completa. */
export const DISMISS_DISTANCE = 120
/** Un tirón corto pero rápido también cierra. */
const FLICK_DISTANCE = 40
const FLICK_MS = 250
/** Movimiento mínimo antes de decidir si el gesto es horizontal o vertical. */
const AXIS_THRESHOLD = 8

/** Qué foto está a la vista según cuánto se deslizó el carrusel. */
export function indexFromScroll(scrollLeft: number, width: number, count: number): number {
  if (width <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / width)))
}

/** Decide el eje del arrastre una vez superado el umbral; antes, `null`. */
export function dragAxis(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return null
  return Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'
}

/** Al soltar un arrastre vertical: ¿cerramos? */
export function shouldDismiss(dy: number, elapsedMs: number): boolean {
  if (dy <= 0) return false
  return dy > DISMISS_DISTANCE || (dy > FLICK_DISTANCE && elapsedMs < FLICK_MS)
}
