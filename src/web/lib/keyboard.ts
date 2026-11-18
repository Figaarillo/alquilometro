import { useEffect, useState } from 'react'

/** Menos que esto es la barra de Safari escondiéndose, no un teclado. */
const MIN_KEYBOARD = 80

/**
 * Cuánto de la parte de abajo de la ventana tapa el teclado.
 * iOS (y Android Chrome por defecto) no achican el layout viewport al abrir el
 * teclado, solo el visual viewport: `position: fixed; bottom` queda debajo.
 */
export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number {
  const covered = innerHeight - vvHeight - vvOffsetTop
  return covered >= MIN_KEYBOARD ? Math.round(covered) : 0
}

/** Altura del teclado en px mientras `active`; 0 si no hay teclado o no hay soporte. */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) {
      setInset(0)
      return
    }
    const update = () => setInset(keyboardInset(window.innerHeight, vv.height, vv.offsetTop))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [active])

  return inset
}
