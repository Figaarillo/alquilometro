import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import type { ShareLink } from '../../../shared/api'
import { DEFAULT_SHARE_OPTIONS, type ShareOptions } from '../../../shared/domain'
import { api } from '../../api'
import { Chips } from '../../components/Chips'
import { Modal } from '../../components/Modal'
import { qk } from '../../hooks'
import { fmtDateTime } from '../../lib/format'
import { toast } from '../../lib/toast'
import { ShareLinkBox } from './ShareLinkBox'
import { ShareOptionsFields } from './ShareOptionsFields'

/** Permanente o temporal (horas). Los temporales se borran solos y no guardan valoraciones. */
const DURATIONS = [
  ['0', 'Permanente'],
  ['1', '1 hora'],
  ['24', '24 horas'],
  ['168', '7 días'],
] as const
type Duration = (typeof DURATIONS)[number][0]

export function ShareDialog({ propertyIds, titles, onClose }: { propertyIds: string[]; titles: string[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [options, setOptions] = useState<ShareOptions>(DEFAULT_SHARE_OPTIONS)
  const [created, setCreated] = useState<ShareLink | null>(null)
  const [duration, setDuration] = useState<Duration>('0')
  const temporary = duration !== '0'

  const create = useMutation({
    mutationFn: () =>
      api.createShare({ name: name.trim(), propertyIds, ...options, ...(temporary ? { expiresInHours: Number(duration), allowRatings: false } : {}) }),
    onSuccess: (s) => {
      setCreated(s)
      qc.invalidateQueries({ queryKey: qk.shares })
      toast('Link creado')
    },
    onError: (e) => toast.error(e.message),
  })

  if (created) {
    return (
      <Modal title="¡Listo! Link para compartir" onClose={onClose}>
        <p className="muted small">
          Quien tenga este link ve {propertyIds.length} alquiler(es), sin poder modificar nada.
          {created.expiresAt && ` Vence el ${fmtDateTime(created.expiresAt)} y se borra solo.`} Podés desactivarlo o borrarlo cuando quieras desde{' '}
          <Link to="/compartidos" onClick={onClose}>
            Compartidos
          </Link>
          .
        </p>
        <ShareLinkBox url={api.shareUrl(created.token)} name={created.name} />
      </Modal>
    )
  }

  return (
    <Modal title={`Compartir ${propertyIds.length} alquiler(es)`} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
      >
        <label>
          ¿Para quién es? (solo lo ves vos)
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Para mamá" required autoFocus />
        </label>
        <div className="chips">
          {titles.map((t) => (
            <span key={t} className="chip static">
              {t}
            </span>
          ))}
        </div>
        <div>
          <span className="field-label">Duración</span>
          <Chips options={DURATIONS} value={duration} onChange={(v) => setDuration(v ?? '0')} />
          {temporary && (
            <span className="muted small">
              Link temporal: al vencer deja de andar y desaparece de Compartidos. No guarda valoraciones de invitados.
            </span>
          )}
        </div>
        <ShareOptionsFields value={options} onChange={setOptions} hide={temporary ? ['allowRatings'] : []} />
        <div className="form-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={create.isPending}>
            Crear link
          </button>
        </div>
      </form>
    </Modal>
  )
}
