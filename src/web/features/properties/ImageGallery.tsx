import { Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ImageMeta } from '../../../shared/api'
import { api } from '../../api'
import { PhotoCarousel } from '../../components/PhotoCarousel'
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

/** Fotos del alquiler en el resumen: carrusel + subir, portada y borrar. */
export function ImageGallery({ propertyId, images }: { propertyId: string; images: ImageMeta[] }) {
  const [progress, setProgress] = useState<string | null>(null)
  // De a una: con fotos grandes del celu, una sola petición enorme es lo que más falla.
  const upload = useAppMutation(async (files: File[]) => {
    const { ok, failed } = await uploadPhotos(propertyId, files, (i, n) => setProgress(`Subiendo ${i}/${n}…`))
    setProgress(null)
    if (ok) toast(`${ok} foto(s) subida(s)`)
    failed.forEach((f) => toast.error(`${f.name}: ${f.reason}`))
  })

  const uploadButton = (
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
  )

  if (images.length === 0) {
    return (
      <div className="card">
        <div className="card-head">
          <h3>Fotos</h3>
          {uploadButton}
        </div>
        <p className="muted small">Sin fotos todavía. Podés subir las de la publicación o las que saques en la visita.</p>
      </div>
    )
  }

  return (
    <div className="card photos">
      <PhotoCarousel
        photos={images.map((img) => ({ id: img.id, url: api.imageUrl(img.id) }))}
        coverTag
        footer={uploadButton}
        actions={(i, close) => <PhotoAdminActions image={images[i]} isCover={i === 0} onDeleted={() => close(Math.max(0, i - 1))} />}
      />
    </div>
  )
}

/** Portada y borrar, dentro del visor a pantalla completa. */
function PhotoAdminActions({ image, isCover, onDeleted }: { image?: ImageMeta; isCover: boolean; onDeleted: () => void }) {
  const cover = useAppMutation(api.setCover, undefined, 'Portada actualizada')
  const remove = useAppMutation(api.deleteImage, onDeleted, 'Foto borrada')
  if (!image) return null
  return (
    <>
      {!isCover && (
        <button className="icon-btn" onClick={() => cover.mutate(image.id)} title="Usar de portada" aria-label="Usar de portada">
          <Star size={20} />
        </button>
      )}
      <button
        className="icon-btn"
        onClick={() => confirm('¿Borrar la foto?') && remove.mutate(image.id)}
        title="Borrar foto"
        aria-label="Borrar foto"
      >
        <Trash2 size={20} />
      </button>
    </>
  )
}
