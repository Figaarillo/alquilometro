import { useEffect, useState } from 'react'

/** Galería de solo lectura con visor a pantalla completa (flechas y swipe). */
export function PhotoViewer({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const [touchX, setTouchX] = useState<number | null>(null)
  const go = (delta: number) => setOpen((i) => (i == null ? i : (i + delta + urls.length) % urls.length))

  useEffect(() => {
    if (open == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!urls.length) return <p className="muted small">Sin fotos.</p>

  return (
    <>
      <div className="photo-hero" onClick={() => setOpen(0)}>
        <img src={urls[0]} alt="" />
        {urls.length > 1 && <span className="photo-count">📷 {urls.length}</span>}
      </div>
      {urls.length > 1 && (
        <div className="gallery">
          {urls.slice(1).map((u, i) => (
            <button key={u} className="gallery-item" onClick={() => setOpen(i + 1)}>
              <img src={u} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {open != null && (
        <div
          className="lightbox"
          onClick={() => setOpen(null)}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX == null) return
            const dx = e.changedTouches[0].clientX - touchX
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
            setTouchX(null)
          }}
        >
          <img src={urls[open]} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => go(-1)}>←</button>
            <span>
              {open + 1} / {urls.length}
            </span>
            <button onClick={() => go(1)}>→</button>
            <button onClick={() => setOpen(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}
