import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { CircleMarker, Popup } from 'react-leaflet'
import type { SharedProperty, SharedView } from '../../../shared/api'
import { optionLabel } from '../../../shared/domain'
import { scoreProperty } from '../../../shared/scoring'
import { api } from '../../api'
import { BaseMap } from '../../components/BaseMap'
import { ScoreBadge } from '../../components/ScoreBadge'
import { Toaster } from '../../components/Toaster'
import { moneyK } from '../../lib/format'
import { mapsUrl, streetViewUrl, whatsappUrl } from '../../lib/links'
import { toast } from '../../lib/toast'
import { CostsCard, ScoreBreakdown } from '../properties/ScoreBreakdown'
import { DetailsView } from './DetailsView'
import { PhotoViewer } from './PhotoViewer'

const NAME_KEY = 'alquileres.guestName'
const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
const saveName = (n: string) => {
  try {
    localStorage.setItem(NAME_KEY, n)
  } catch {
    /* sin storage: no pasa nada */
  }
}

const color = (s: number | null) => (s == null ? '#94a3b8' : s >= 75 ? '#16a34a' : s >= 55 ? '#d97706' : '#dc2626')

/** Vista pública de solo lectura: lo que ve quien recibe el link. Sin login. */
export function SharedPage() {
  const { token = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const q = useQuery({ queryKey: ['shared', token], queryFn: () => api.shared(token), retry: false })
  const selectedId = params.get('p')

  if (q.isLoading) return <div className="shared-shell"><p className="muted">Cargando…</p></div>
  if (q.error || !q.data) {
    return (
      <div className="shared-shell">
        <div className="empty">
          <h1>Link no disponible</h1>
          <p className="muted">Este link no existe o fue desactivado.</p>
        </div>
      </div>
    )
  }

  const view = q.data
  const selected = view.properties.find((p) => p.id === selectedId)

  return (
    <div className="shared-shell">
      <header className="shared-header">
        <div className="brand">🏠 Alquilómetro</div>
        <h1>{selected ? selected.title : 'Alquileres que te compartieron'}</h1>
        {selected ? (
          <button className="ghost back" onClick={() => setParams({})}>
            ← Ver todos ({view.properties.length})
          </button>
        ) : (
          <p>{view.properties.length} opción(es) · Solo lectura</p>
        )}
      </header>
      <main>
        {selected ? (
          <SharedDetail token={token} view={view} p={selected} />
        ) : (
          <SharedList token={token} view={view} onOpen={(id) => setParams({ p: id })} />
        )}
      </main>
      <Toaster />
    </div>
  )
}

function SharedList({ token, view, onOpen }: { token: string; view: SharedView; onOpen: (id: string) => void }) {
  const rows = view.properties
    .map((p) => ({ p, s: scoreProperty(p, view.settings) }))
    .sort((a, b) => (view.options.showScore ? (b.s.total ?? -1) - (a.s.total ?? -1) : 0))
  const located = rows.filter((r) => r.p.lat != null && r.p.lng != null)

  return (
    <>
      <ul className="shared-cards">
        {rows.map(({ p, s }) => {
          const nearest = [...s.distances].sort((a, b) => a.km - b.km)[0]
          return (
            <li key={p.id}>
              <button className="shared-card" onClick={() => onOpen(p.id)}>
                <div className="shared-photo">
                  {p.images[0] ? <img src={api.sharedImageUrl(token, p.images[0].id)} alt="" loading="lazy" /> : <span>🏠</span>}
                  {p.images.length > 1 && <span className="photo-count">📷 {p.images.length}</span>}
                </div>
                <div className="shared-card-body">
                  <div className="rank-title">
                    <strong>{p.title}</strong>
                    {view.options.showScore && <ScoreBadge score={s.total} />}
                  </div>
                  <div className="muted small">
                    {optionLabel('kind', p.details.kind)}
                    {p.details.isDuplex ? ' · Dúplex' : ''} · {p.details.bedrooms ?? '?'} hab.
                    {nearest ? ` · ${nearest.km} km del ${nearest.name.split(' (')[0].toLowerCase()}` : ''}
                  </div>
                  <div className="strong">{moneyK(s.costs.baseMonthly)}/mes</div>
                  {p.address && <div className="muted small">{p.address}</div>}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      {located.length > 0 && (
        <div className="card">
          <h3>En el mapa</h3>
          <BaseMap refPoints={view.settings.refPoints} height={360}>
            {located.map(({ p, s }) => (
              <CircleMarker
                key={p.id}
                center={[p.lat!, p.lng!]}
                radius={11}
                pathOptions={{ color: '#fff', weight: 2, fillColor: view.options.showScore ? color(s.total) : '#2563eb', fillOpacity: 0.95 }}
                eventHandlers={{ click: () => onOpen(p.id) }}
              >
                <Popup>{p.title}</Popup>
              </CircleMarker>
            ))}
          </BaseMap>
        </div>
      )}
    </>
  )
}

function SharedDetail({ token, view, p }: { token: string; view: SharedView; p: SharedProperty }) {
  const s = scoreProperty(p, view.settings)
  const point: [number, number] | null = p.lat != null && p.lng != null ? [p.lat, p.lng] : null

  return (
    <div className="grid-2">
      <div>
        <div className="card">
          <PhotoViewer urls={p.images.map((i) => api.sharedImageUrl(token, i.id))} />
        </div>
        {p.description && (
          <div className="card">
            <h3>Descripción</h3>
            <p className="pre">{p.description}</p>
          </div>
        )}
        <DetailsView details={p.details} />
        {p.notes && (
          <div className="card">
            <h3>Notas</h3>
            <p className="pre">{p.notes}</p>
          </div>
        )}
      </div>
      <div>
        <CostsCard r={s} currency={p.details.currency} />
        {view.options.showScore && <ScoreBreakdown r={s} />}
        {p.myRating != null && (
          <div className="card">
            <h3>Nota de quien te lo compartió: ⭐ {p.myRating}/10</h3>
          </div>
        )}
        <div className="card">
          <h3>Ubicación</h3>
          {p.address && <p>{p.address}</p>}
          {point ? (
            <>
              <BaseMap refPoints={view.settings.refPoints} center={point} zoom={15} height={240}>
                <CircleMarker center={point} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />
              </BaseMap>
              <div className="row wrap">
                <a className="button small" href={streetViewUrl(point[0], point[1])} target="_blank" rel="noreferrer">
                  👀 Ver en Street View
                </a>
                <a className="button small" href={mapsUrl(point[0], point[1])} target="_blank" rel="noreferrer">
                  Abrir en Google Maps
                </a>
              </div>
            </>
          ) : (
            <p className="muted small">Sin ubicación en el mapa.</p>
          )}
        </div>
        {(p.listingUrl || p.contactPhone || p.contactName) && (
          <div className="card">
            <h3>Más info</h3>
            {p.contactName && <p>{p.contactName}</p>}
            <div className="row wrap">
              {p.listingUrl && (
                <a className="button small" href={p.listingUrl} target="_blank" rel="noreferrer">
                  Ver publicación
                </a>
              )}
              {p.contactPhone && (
                <a className="button small" href={whatsappUrl(p.contactPhone, '')} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
        {view.options.allowRatings && <GuestRatingBox token={token} p={p} />}
      </div>
    </div>
  )
}

function GuestRatingBox({ token, p }: { token: string; p: SharedProperty }) {
  const qc = useQueryClient()
  const [name, setName] = useState(readName)
  const mine = p.ratings.find((r) => r.guestName.toLowerCase() === name.trim().toLowerCase())
  const [rating, setRating] = useState<number | null>(mine?.rating ?? null)
  const [comment, setComment] = useState(mine?.comment ?? '')

  const send = useMutation({
    mutationFn: () => api.rateShared(token, { propertyId: p.id, guestName: name.trim(), rating, comment: comment.trim() || null }),
    onSuccess: () => {
      saveName(name.trim())
      qc.invalidateQueries({ queryKey: ['shared', token] })
      toast('¡Gracias! Tu opinión quedó guardada')
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="card">
      <h3>¿Qué te parece? <span className="muted small">(opcional)</span></h3>
      {p.ratings.length > 0 && (
        <ul className="plain guest-ratings">
          {p.ratings.map((r) => (
            <li key={r.id}>
              <strong>{r.guestName}</strong> {r.rating != null && <span>⭐ {r.rating}/10</span>}
              {r.comment && <div className="small pre">{r.comment}</div>}
            </li>
          ))}
        </ul>
      )}
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (rating == null && !comment.trim()) return toast.info('Poné una nota o un comentario')
          send.mutate()
        }}
      >
        <label>
          Tu nombre
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mamá" required maxLength={80} />
        </label>
        <div className="rating">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button type="button" key={n} className={`rate ${rating != null && n <= rating ? 'on' : ''}`} onClick={() => setRating(rating === n ? null : n)}>
              {n}
            </button>
          ))}
        </div>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentario (opcional)" maxLength={2000} />
        <button className="primary" disabled={send.isPending}>
          {mine ? 'Actualizar mi opinión' : 'Enviar opinión'}
        </button>
      </form>
    </div>
  )
}
