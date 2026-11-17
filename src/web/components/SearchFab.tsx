import { Search, X } from 'lucide-react'
import { useRef, useState } from 'react'

/**
 * Lupa flotante abajo a la derecha: al tocarla se estira hacia la izquierda y
 * se vuelve un campo de búsqueda. La X borra la búsqueda y la vuelve a cerrar.
 */
export function SearchFab({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(value !== '')
  const input = useRef<HTMLInputElement>(null)

  const openIt = () => {
    setOpen(true)
    // El foco va dentro del mismo toque: si no, iOS no abre el teclado.
    input.current?.focus()
  }
  const close = () => {
    onChange('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className={`search-fab ${open ? 'open' : ''}`} role="search">
      <input
        ref={input}
        type="search"
        enterKeyHint="search"
        value={value}
        placeholder={placeholder}
        aria-label="Buscar"
        tabIndex={open ? 0 : -1}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
          if (e.key === 'Enter') input.current?.blur()
        }}
        // Si lo deja vacío y toca afuera, se vuelve a cerrar solo.
        onBlur={() => value === '' && setOpen(false)}
      />
      <button
        type="button"
        className="search-fab-btn"
        aria-label={open ? 'Cerrar búsqueda' : 'Buscar'}
        // Sin esto el blur del input cierra la búsqueda antes del click.
        onPointerDown={(e) => e.preventDefault()}
        onClick={open ? close : openIt}
      >
        {open ? <X size={20} /> : <Search size={22} />}
      </button>
    </div>
  )
}
