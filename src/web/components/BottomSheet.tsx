import { useEffect, type ReactNode } from 'react'

/**
 * Bottom sheet mobile (mismo patrón que GreenBin): backdrop con blur y panel que sube desde abajo.
 * Siempre montado para que la animación de entrada/salida funcione con una clase.
 */
export function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`sheet ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-clip">
        <div className="sheet-panel" role="dialog" aria-modal="true">
          <div className="sheet-handle" />
          {children}
        </div>
      </div>
    </div>
  )
}
