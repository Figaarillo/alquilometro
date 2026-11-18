import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Hueco en el header donde cada pantalla puede poner sus acciones (ej. compartir en Ranking).
 * La pantalla sigue siendo dueña de su estado; solo "teletransporta" el botón con un portal.
 */
const SlotContext = createContext<{ el: HTMLElement | null; setEl: (el: HTMLElement | null) => void }>({
  el: null,
  setEl: () => {},
})

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  return <SlotContext.Provider value={{ el, setEl }}>{children}</SlotContext.Provider>
}

/** Dónde se dibujan las acciones: va dentro del header. */
export function HeaderSlotTarget() {
  const { setEl } = useContext(SlotContext)
  return <div className="header-slot" ref={setEl} />
}

/** Lo que una pantalla quiere mostrar en el header mientras está montada. */
export function HeaderActions({ children }: { children: ReactNode }) {
  const { el } = useContext(SlotContext)
  return el ? createPortal(children, el) : null
}
