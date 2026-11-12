import { useEffect, useState } from 'react'
import type { ImageMeta } from '../../../shared/api'
import { api } from '../../api'
import { useAppMutation } from '../../hooks'
import { resizeImage } from '../../lib/image'
import { toast } from '../../lib/toast'

/** Achica en el celu y sube de a una foto. Devuelve cuántas subieron y el motivo de las que fallaron. */
export async function uploadPhotos(propertyId: string, files: File[], onProgress?: (i: number, n: number) => void) {
  let ok = 0
  const failed: { name: string; reason: string }[] = []
  for (const [i, file] of files.entries()) {
    onProgress?.(i + 1, files.length)
    try {
      const r = await api.uploadImages(propertyId, [await resizeImage(file)])
      ok += r.inserted.length
      failed.push(...r.failed.map((f) => ({ name: file.name, reason: f.reason })))
    } catch (err) {
      failed.push({ name: file.name, reason: err instanceof Error ? err.message : 'error de red' })
    }
  }
  return { ok, failed }
}

export function ImageGallery({ propertyId, images }: { propertyId: string; images: ImageMeta[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  // De a una: con fotos grandes del celu, una sola petición enorme es lo que más falla.
  const upload = useAppMutation(async (files: File[]) => {
    const { ok, failed } = await uploadPhotos(propertyId, files, (i, n) => setProgress(`Subiendo ${i}/${n}…`))
    setProgress(null)
    if (ok) toast(`${ok} foto(s) subida(s)`)
    failed.forEach((f) => toast.error(`${f.name}: ${f.reason}`))
  })
  const cover = useAppMutation(api.setCover, undefined, 'Portada actualizada')
  const remove = useAppMutation(api.deleteImage, () => setOpen(null), 'Foto borrada')

  useEffect(() => {
    if (open == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((i) => (i == null ? i : (i + 1) % images.length))
      if (e.key === 'ArrowLeft') setOpen((i) => (i == null ? i : (i - 1 + images.length) % images.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, images.length])

  const current = open != null ? images[open] : null

  return (
    <div className="card">
      <div className="card-head">
        <h3>Fotos ({images.length})</h3>
        <label className="button small">
          {upload.isPending ? (progress ?? 'Subiendo…') : '+ Subir fotos'}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={upload.isPending}
            onChange={(e) => {
              const files = [...(e.target.files ?? [])]
              if (files.length) upload.mutate(files)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {images.length === 0 ? (
        <p className="muted small">Sin fotos todavía. Podés subir las de la publicación o las que saques en la visita.</p>
      ) : (
        <div className="gallery">
          {images.map((img, i) => (
            <button key={img.id} className="gallery-item" onClick={() => setOpen(i)}>
              <img src={api.imageUrl(img.id)} alt="" loading="lazy" />
              {i === 0 && <span className="cover-tag">Portada</span>}
            </button>
          ))}
        </div>
      )}
      {current && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <img src={api.imageUrl(current.id)} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen((open! - 1 + images.length) % images.length)}>←</button>
            <span>
              {open! + 1} / {images.length}
            </span>
            <button onClick={() => setOpen((open! + 1) % images.length)}>→</button>
            {open !== 0 && <button onClick={() => cover.mutate(current.id)}>Usar de portada</button>}
            <button className="danger" onClick={() => confirm('¿Borrar la foto?') && remove.mutate(current.id)}>
              Borrar
            </button>
            <button onClick={() => setOpen(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
