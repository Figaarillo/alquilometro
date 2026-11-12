import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../../api'
import { Modal } from '../../components/Modal'
import { useInvalidateAll } from '../../hooks'
import { toast } from '../../lib/toast'
import { uploadPhotos } from './ImageGallery'

interface Picked {
  file: File
  url: string
}

/** Alta de alquiler: datos básicos + fotos en un solo paso, con progreso y aviso al terminar. */
export interface NewPropertyInitial {
  title?: string
  listingUrl?: string
  contactPhone?: string
  description?: string
}

export function NewPropertyDialog({
  onClose,
  initial,
  onCreated,
}: {
  onClose: () => void
  /** Datos precargados (ej. desde Pendientes). */
  initial?: NewPropertyInitial
  onCreated?: (id: string) => void | Promise<void>
}) {
  const navigate = useNavigate()
  const invalidate = useInvalidateAll()
  const [f, setF] = useState({ title: '', listingUrl: '', contactName: '', contactPhone: '', description: '', ...initial })
  const [photos, setPhotos] = useState<Picked[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const saving = progress !== null

  // Liberar las previsualizaciones al cerrar.
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  const addPhotos = (files: FileList | null) => {
    const list = [...(files ?? [])].filter((x) => x.type.startsWith('image/'))
    setPhotos((prev) => [...prev, ...list.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }
  const removePhoto = (i: number) =>
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].url)
      return prev.filter((_, j) => j !== i)
    })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    let createdId: string | null = null
    try {
      setProgress('Guardando datos…')
      const p = await api.createProperty({
        title: f.title,
        listingUrl: f.listingUrl || null,
        contactName: f.contactName || null,
        contactPhone: f.contactPhone || null,
        description: f.description || null,
      })
      createdId = p.id
      await onCreated?.(p.id)

      // De a una: si falla una foto, las anteriores ya quedaron guardadas.
      const { ok: uploaded, failed } = await uploadPhotos(
        p.id,
        photos.map((ph) => ph.file),
        (i, n) => setProgress(`Subiendo fotos ${i}/${n}…`),
      )

      invalidate()
      if (failed.length) {
        toast.error(`Alquiler guardado, pero fallaron ${failed.length} foto(s). Podés subirlas desde el detalle.`)
        failed.forEach((f) => toast.error(`${f.name}: ${f.reason}`))
      } else {
        toast(photos.length ? `Alquiler guardado con ${uploaded} foto(s)` : 'Alquiler guardado')
      }
      onClose()
      navigate(`/p/${p.id}?tab=datos`)
    } catch (err) {
      setProgress(null)
      const msg = err instanceof Error ? err.message : String(err)
      if (createdId) {
        invalidate()
        onClose()
        navigate(`/p/${createdId}`)
      }
      toast.error(createdId ? `Se guardó el alquiler pero hubo un error: ${msg}` : `No se pudo guardar: ${msg}`)
    }
  }

  return (
    <Modal title="Nuevo alquiler" onClose={() => !saving && onClose()}>
      <form className="form" onSubmit={submit}>
        <label>
          Nombre para reconocerlo
          <input value={f.title} onChange={set('title')} placeholder="Ej: Dúplex calle Mendoza" required autoFocus disabled={saving} />
        </label>
        <label>
          Descripción (pegá lo que te mandaron)
          <textarea
            rows={5}
            value={f.description}
            onChange={set('description')}
            disabled={saving}
            placeholder="Ej: 2 dormitorios, 1er piso, cocina comedor, calefacción, patio con pileta..."
          />
        </label>

        <div className="photo-picker">
          <span className="field-label">Fotos</span>
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div key={p.url} className="photo-thumb">
                <img src={p.url} alt="" />
                {!saving && (
                  <button type="button" className="photo-remove" onClick={() => removePhoto(i)} aria-label="Quitar foto">
                    ✕
                  </button>
                )}
                {i === 0 && <span className="cover-tag">Portada</span>}
              </div>
            ))}
            <label className={`photo-add ${saving ? 'disabled' : ''}`}>
              <span>＋</span>
              <span className="small">Agregar</span>
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={saving}
                onChange={(e) => {
                  addPhotos(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>

        <label>
          Link de la publicación
          <input value={f.listingUrl} onChange={set('listingUrl')} placeholder="https://..." disabled={saving} />
        </label>
        <div className="row">
          <label>
            Contacto
            <input value={f.contactName} onChange={set('contactName')} placeholder="Dueño / inmobiliaria" disabled={saving} />
          </label>
          <label>
            Teléfono o link de WhatsApp
            <input value={f.contactPhone} onChange={set('contactPhone')} placeholder="3534123456 o wa.me/..." disabled={saving} />
          </label>
        </div>

        {progress && <div className="progress-note">{progress}</div>}

        <div className="form-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="primary" disabled={saving}>
            {saving ? 'Guardando…' : photos.length ? `Guardar con ${photos.length} foto(s)` : 'Guardar y completar datos'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
