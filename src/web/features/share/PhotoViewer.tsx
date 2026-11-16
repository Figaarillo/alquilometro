import { PhotoCarousel } from '../../components/PhotoCarousel'

/** Galería de solo lectura: el mismo carrusel con gestos que ve el dueño, sin acciones. */
export function PhotoViewer({ urls }: { urls: string[] }) {
  if (!urls.length) return <p className="muted small">Sin fotos.</p>
  return (
    <div className="photos photos-shared">
      <PhotoCarousel photos={urls.map((url) => ({ id: url, url }))} />
    </div>
  )
}
