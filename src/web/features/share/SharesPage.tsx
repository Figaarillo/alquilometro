import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import type { ShareLink } from '../../../shared/api'
import type { ShareOptions } from '../../../shared/domain'
import { api } from '../../api'
import { Modal } from '../../components/Modal'
import { qk, useProperties } from '../../hooks'
import { fmtDateTime } from '../../lib/format'
import { toast } from '../../lib/toast'
import { ShareLinkBox } from './ShareLinkBox'
import { ShareOptionsFields } from './ShareOptionsFields'

const optionsOf = (s: ShareLink): ShareOptions => ({
  showNotes: s.showNotes,
  showContact: s.showContact,
  showMyRating: s.showMyRating,
  showScore: s.showScore,
  allowRatings: s.allowRatings,
})

function useUpdateShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof api.updateShare>[1]) => api.updateShare(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.shares }),
    onError: (e) => toast.error(e.message),
  })
}

function EditShareDialog({ share, onClose }: { share: ShareLink; onClose: () => void }) {
  const props = useProperties()
  const update = useUpdateShare()
  const [name, setName] = useState(share.name)
  const [options, setOptions] = useState(optionsOf(share))
  const [ids, setIds] = useState<Set<string>>(new Set(share.propertyIds))
  const all = (props.data ?? []).slice().sort((a, b) => a.title.localeCompare(b.title))

  return (
    <Modal title="Editar link compartido" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          // Se mantiene el orden original y los nuevos van al final.
          const ordered = [...share.propertyIds.filter((id) => ids.has(id)), ...[...ids].filter((id) => !share.propertyIds.includes(id))]
          update.mutate(
            { id: share.id, name: name.trim(), propertyIds: ordered, ...options },
            {
              onSuccess: () => {
                toast('Link actualizado')
                onClose()
              },
            },
          )
        }}
      >
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div>
          <span className="field-label">Alquileres incluidos ({ids.size})</span>
          <ul className="plain pick-list">
            {all.map((p) => (
              <li key={p.id}>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={ids.has(p.id)}
                    onChange={() =>
                      setIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(p.id)) next.delete(p.id)
                        else next.add(p.id)
                        return next
                      })
                    }
                  />
                  <span>
                    {p.title}
                    {p.status === 'descartado' && <span className="muted small"> · descartado</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <ShareOptionsFields value={options} onChange={setOptions} hide={share.expiresAt ? ['allowRatings'] : []} />
        <div className="form-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={!ids.size || update.isPending}>
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function SharesPage() {
  const qc = useQueryClient()
  const shares = useQuery({ queryKey: qk.shares, queryFn: api.shares })
  const props = useProperties()
  const update = useUpdateShare()
  const remove = useMutation({
    mutationFn: api.deleteShare,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shares })
      toast('Link borrado')
    },
    onError: (e) => toast.error(e.message),
  })
  const confirmDelete = (s: ShareLink) => {
    const lost = s.ratingsCount ? `\n\nOjo: se borran también ${s.ratingsCount} valoración(es) que dejaron. Si las querés conservar, mejor desactivalo.` : ''
    if (confirm(`¿Borrar “${s.name}” para siempre? El link deja de andar.${lost}`)) remove.mutate(s.id)
  }
  const [editing, setEditing] = useState<ShareLink | null>(null)
  const titleOf = new Map((props.data ?? []).map((p) => [p.id, p.title]))

  return (
    <section>
      <div className="page-head">
        <h1>Compartidos</h1>
        <span className="muted small">
          Para crear uno nuevo: en el <Link to="/">Ranking</Link> tocá “🔗 Compartir” y elegí los alquileres.
        </span>
      </div>

      {shares.data?.length === 0 && (
        <div className="empty">
          <p>Todavía no compartiste nada.</p>
        </div>
      )}

      {shares.data?.map((s) => {
        const active = !s.revokedAt
        return (
          <div key={s.id} className={`card share-card ${active ? '' : 'revoked'}`}>
            <div className="card-head">
              <div>
                <h3>{s.name}</h3>
                <div className="muted small">
                  {active ? '🟢 Activo' : '⚪ Desactivado'}
                  {s.expiresAt && ` · ⏳ temporal, vence ${fmtDateTime(s.expiresAt)}`} · creado {fmtDateTime(s.createdAt)} · abierto {s.views} vez/veces
                  {s.lastViewedAt && ` (último: ${fmtDateTime(s.lastViewedAt)})`}
                  {s.ratingsCount > 0 && ` · ${s.ratingsCount} valoración(es)`}
                </div>
              </div>
              <div className="row">
                <button className="small" onClick={() => setEditing(s)}>
                  Editar
                </button>
                <button
                  className={`small ${active ? 'danger' : ''}`}
                  onClick={() => {
                    if (active && !confirm('¿Desactivar este link? Quien lo tenga ya no va a poder verlo (lo podés reactivar).')) return
                    update.mutate({ id: s.id, revoked: active }, { onSuccess: () => toast(active ? 'Link desactivado' : 'Link reactivado') })
                  }}
                >
                  {active ? 'Desactivar' : 'Reactivar'}
                </button>
                <button className="small danger" title="Borrar link" aria-label="Borrar link" onClick={() => confirmDelete(s)} disabled={remove.isPending}>
                  🗑
                </button>
              </div>
            </div>
            <div className="chips">
              {s.propertyIds.map((id) => (
                <Link key={id} to={`/p/${id}`} className="chip static">
                  {titleOf.get(id) ?? '…'}
                </Link>
              ))}
            </div>
            {active && <ShareLinkBox url={api.shareUrl(s.token)} name={s.name} />}
          </div>
        )
      })}
      {editing && <EditShareDialog share={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}
