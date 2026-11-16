import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { dragAxis, indexFromScroll, shouldDismiss } from '../lib/gestures'

export type Photo = { id: string; url: string }

/** Acciones extra del visor (portada, borrar…). `close(last)` cierra quedando en la foto `last`. */
export type PhotoActions = (index: number, close: (last: number) => void) => ReactNode

/** Más de esto y los puntitos ya no entran: queda solo el contador. */
const MAX_DOTS = 15

/** Lleva un contenedor con scroll-snap horizontal a la foto `i`. */
function scrollToSlide(el: HTMLElement | null, i: number, smooth = true) {
  if (!el) return
  el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'instant' })
}

/**
 * Carrusel de fotos: se desliza con el dedo (scroll-snap nativo) y al tocar
 * una foto se abre a pantalla completa. Con mouse aparecen flechas al pasar por encima.
 */
export function PhotoCarousel({
  photos,
  coverTag = false,
  footer,
  actions,
}: {
  photos: Photo[]
  coverTag?: boolean
  footer?: ReactNode
  actions?: PhotoActions
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState<number | null>(null)

  // Si se borra la última foto, que el índice no quede apuntando a la nada.
  const current = Math.min(index, Math.max(0, photos.length - 1))
  const go = (i: number) => scrollToSlide(trackRef.current, (i + photos.length) % photos.length)

  return (
    <>
      <div className="carousel">
        <div
          className="carousel-track"
          ref={trackRef}
          onScroll={(e) => setIndex(indexFromScroll(e.currentTarget.scrollLeft, e.currentTarget.clientWidth, photos.length))}
        >
          {photos.map((p, i) => (
            <button key={p.id} className="carousel-slide" onClick={() => setOpen(i)} aria-label={`Ver foto ${i + 1} en grande`}>
              <img src={p.url} alt="" loading={i < 2 ? 'eager' : 'lazy'} draggable={false} />
            </button>
          ))}
        </div>
        {coverTag && current === 0 && <span className="cover-tag">Portada</span>}
        <span className="carousel-count">
          {current + 1} / {photos.length}
        </span>
        {photos.length > 1 && (
          <>
            <button className="carousel-nav prev" onClick={() => go(current - 1)} aria-label="Foto anterior">
              <ChevronLeft size={22} />
            </button>
            <button className="carousel-nav next" onClick={() => go(current + 1)} aria-label="Foto siguiente">
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>
      {(footer || (photos.length > 1 && photos.length <= MAX_DOTS)) && (
        <div className="photos-foot">
          {photos.length > 1 && photos.length <= MAX_DOTS ? (
            <div className="dots" aria-hidden>
              {photos.map((p, i) => (
                <span key={p.id} className={i === current ? 'dot on' : 'dot'} />
              ))}
            </div>
          ) : (
            <span />
          )}
          {footer}
        </div>
      )}
      {open != null && (
        <Lightbox
          photos={photos}
          start={open}
          actions={actions}
          onClose={(last) => {
            setOpen(null)
            // Al volver, el carrusel queda en la foto que estabas mirando.
            scrollToSlide(trackRef.current, last, false)
          }}
        />
      )}
    </>
  )
}

/**
 * Foto a pantalla completa: deslizar a los costados cambia de foto (scroll-snap),
 * deslizar hacia abajo la cierra. Con mouse/teclado quedan las flechas.
 */
function Lightbox({
  photos,
  start,
  actions,
  onClose,
}: {
  photos: Photo[]
  start: number
  actions?: PhotoActions
  onClose: (last: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(start)
  const [dragY, setDragY] = useState(0)
  const gesture = useRef<{ x: number; y: number; t: number; axis: 'x' | 'y' | null } | null>(null)

  const safeIndex = Math.min(index, photos.length - 1)
  const close = () => onClose(safeIndex)
  const go = (i: number) => scrollToSlide(trackRef.current, (i + photos.length) % photos.length)

  // Abre directo en la foto tocada, sin animación.
  useLayoutEffect(() => scrollToSlide(trackRef.current, start, false), [start])

  // Teclado (se re-suscribe en cada render para leer el índice actual).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') go(safeIndex + 1)
      if (e.key === 'ArrowLeft') go(safeIndex - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Que la página de fondo no se mueva mientras está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  if (safeIndex < 0) return null

  return (
    <div className="lightbox" style={{ backgroundColor: `rgb(0 0 0 / ${Math.max(0.35, 0.92 - Math.max(0, dragY) / 500)})` }}>
      <div className="lightbox-top">
        <span className="lightbox-count">
          {safeIndex + 1} / {photos.length}
        </span>
        <div className="row">
          {actions?.(safeIndex, onClose)}
          <button className="icon-btn" onClick={close} title="Cerrar" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>
      </div>
      <div
        className="lightbox-track"
        ref={trackRef}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? 'none' : undefined }}
        onScroll={(e) => setIndex(indexFromScroll(e.currentTarget.scrollLeft, e.currentTarget.clientWidth, photos.length))}
        onTouchStart={(e) => {
          const t = e.touches[0]
          gesture.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY, t: Date.now(), axis: null } : null
        }}
        onTouchMove={(e) => {
          const g = gesture.current
          const t = e.touches[0]
          if (!g || !t) return
          g.axis ??= dragAxis(t.clientX - g.x, t.clientY - g.y)
          if (g.axis === 'y') setDragY(t.clientY - g.y)
        }}
        onTouchEnd={() => {
          const g = gesture.current
          gesture.current = null
          if (g?.axis === 'y' && shouldDismiss(dragY, Date.now() - g.t)) return close()
          setDragY(0)
        }}
      >
        {photos.map((p, i) => (
          // Click en el fondo (fuera de la foto) cierra.
          <div key={p.id} className="lightbox-slide" onClick={(e) => e.target === e.currentTarget && close()}>
            <img src={p.url} alt="" loading={Math.abs(i - start) <= 1 ? 'eager' : 'lazy'} draggable={false} />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button className="lightbox-nav prev" onClick={() => go(safeIndex - 1)} aria-label="Foto anterior">
            <ChevronLeft size={32} />
          </button>
          <button className="lightbox-nav next" onClick={() => go(safeIndex + 1)} aria-label="Foto siguiente">
            <ChevronRight size={32} />
          </button>
        </>
      )}
    </div>
  )
}
