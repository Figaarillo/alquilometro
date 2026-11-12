import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { CircleMarker } from 'react-leaflet'
import type { PropertyDetail } from '../../../shared/api'
import { STATUSES, type Details, type Status } from '../../../shared/domain'
import { scoreProperty } from '../../../shared/scoring'
import { api } from '../../api'
import { BaseMap } from '../../components/BaseMap'
import { ScoreBadge } from '../../components/ScoreBadge'
import { useAppMutation, useProperty, useSettings } from '../../hooks'
import { toast } from '../../lib/toast'
import { isLink, mapsUrl, streetViewEmbedUrl, streetViewUrl, whatsappUrl } from '../../lib/links'
import { QuickVisitDialog } from '../visits/QuickVisitDialog'
import { VisitRow } from '../visits/VisitsPage'
import { ShareDialog } from '../share/ShareDialog'
import { ChecklistPanel } from './ChecklistPanel'
import { DetailsForm } from './DetailsForm'
import { ImageGallery } from './ImageGallery'
import { LocationPicker } from './LocationPicker'
import { CostsCard, ScoreBreakdown } from './ScoreBreakdown'

const TABS = [
  ['resumen', 'Resumen'],
  ['datos', 'Datos'],
  ['checklist', 'Checklist'],
  ['visitas', 'Visitas'],
] as const
type Tab = (typeof TABS)[number][0]

const EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined

interface Draft {
  title: string
  description: string
  address: string
  lat: number | null
  lng: number | null
  listingUrl: string
  contactName: string
  contactPhone: string
  details: Details
}

const toDraft = (p: PropertyDetail): Draft => ({
  title: p.title,
  description: p.description ?? '',
  address: p.address ?? '',
  lat: p.lat,
  lng: p.lng,
  listingUrl: p.listingUrl ?? '',
  contactName: p.contactName ?? '',
  contactPhone: p.contactPhone ?? '',
  details: p.details ?? {},
})

export function PropertyPage() {
  const { id = '' } = useParams()
  const q = useProperty(id)
  if (q.isLoading) return <p className="muted">Cargando…</p>
  if (q.error || !q.data) return <p className="error">No encontré el alquiler.</p>
  return <PropertyView key={q.data.id} p={q.data} />
}

function PropertyView({ p }: { p: PropertyDetail }) {
  const navigate = useNavigate()
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'resumen'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })

  const [draft, setDraft] = useState<Draft>(() => toDraft(p))
  const saved = useMemo(() => toDraft(p), [p])
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  useEffect(() => {
    if (!dirty) setDraft(saved)
  }, [saved]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const [notes, setNotes] = useState(p.notes ?? '')
  const [visitOpen, setVisitOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const update = useAppMutation((input: Parameters<typeof api.updateProperty>[1]) => api.updateProperty(p.id, input))
  const remove = useAppMutation(() => api.deleteProperty(p.id), () => navigate('/'))

  const saveDraft = () =>
    update.mutate({
      title: draft.title.trim() || p.title,
      description: draft.description || null,
      address: draft.address.trim() || null,
      lat: draft.lat,
      lng: draft.lng,
      listingUrl: draft.listingUrl.trim() || null,
      contactName: draft.contactName.trim() || null,
      contactPhone: draft.contactPhone.trim() || null,
      details: draft.details,
    }, { onSuccess: () => toast('Cambios guardados') })

  const savedScore = scoreProperty(p, settings)
  const draftScore = scoreProperty({ details: draft.details, lat: draft.lat, lng: draft.lng }, settings)
  const point: [number, number] | null = p.lat != null && p.lng != null ? [p.lat, p.lng] : null
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...draft, [k]: e.target.value })

  return (
    <section>
      <div className="property-head">
        <div>
          <h1>{p.title}</h1>
          <div className="muted">{p.address ?? 'Sin dirección'}</div>
        </div>
        <ScoreBadge score={savedScore.total} big />
        <div className="head-controls">
          <select value={p.status} onChange={(e) => update.mutate({ status: e.target.value as Status }, { onSuccess: () => toast('Estado actualizado') })}>
            {STATUSES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <div className="rating" title="Tu valoración">
            <span className="small muted">Mi nota:</span>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`rate ${p.myRating != null && n <= p.myRating ? 'on' : ''}`}
                onClick={() => update.mutate({ myRating: p.myRating === n ? null : n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>
            {l}
            {k === 'datos' && dirty && ' •'}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid-2">
          <div>
            <ScoreBreakdown r={savedScore} />
            {p.description && (
              <div className="card">
                <h3>Descripción</h3>
                <p className="pre">{p.description}</p>
              </div>
            )}
            <div className="card">
              <h3>Mis notas</h3>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== (p.notes ?? '') && update.mutate({ notes: notes || null }, { onSuccess: () => toast('Notas guardadas') })}
                placeholder="Impresiones, dudas, lo que te dijo el dueño…"
              />
            </div>
          </div>
          <div>
            <CostsCard r={savedScore} currency={p.details.currency} />
            <div className="card">
              <h3>Contacto</h3>
              <p>
                {p.contactName ?? '—'} {p.contactPhone && <span className="muted">· {isLink(p.contactPhone) ? 'link de WhatsApp' : p.contactPhone}</span>}
              </p>
              <div className="row wrap">
                {p.contactPhone && (
                  <a className="button small" href={whatsappUrl(p.contactPhone, '')} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
                {p.listingUrl && (
                  <a className="button small" href={p.listingUrl} target="_blank" rel="noreferrer">
                    Ver publicación
                  </a>
                )}
                <button className="small" onClick={() => setVisitOpen(true)}>
                  📅 Agendar visita
                </button>
                <button className="small" onClick={() => setShareOpen(true)}>
                  🔗 Compartir
                </button>
              </div>
            </div>
            {p.guestRatings.length > 0 && (
              <div className="card">
                <h3>Opiniones de invitados</h3>
                <ul className="plain guest-ratings">
                  {p.guestRatings.map((r) => (
                    <li key={r.id}>
                      <strong>{r.guestName}</strong> {r.rating != null && <span>⭐ {r.rating}/10</span>}{' '}
                      <span className="muted small">vía “{r.shareName}”</span>
                      {r.comment && <div className="small pre">{r.comment}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="card">
              <div className="card-head">
                <h3>Ubicación</h3>
                {savedScore.distances.length > 0 && (
                  <span className="muted small">{savedScore.distances.map((d) => `${d.name.split(' (')[0]}: ${d.km} km`).join(' · ')}</span>
                )}
              </div>
              {point ? (
                <>
                  <BaseMap refPoints={settings.refPoints} center={point} zoom={15} height={240}>
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
                  {EMBED_KEY && (
                    <iframe
                      className="streetview"
                      title="Street View"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={streetViewEmbedUrl(EMBED_KEY, point[0], point[1])}
                    />
                  )}
                </>
              ) : (
                <p className="muted small">
                  Sin ubicación. <button className="ghost small" onClick={() => setTab('datos')}>Cargala en Datos</button>
                </p>
              )}
            </div>
            <ImageGallery propertyId={p.id} images={p.images} />
            <button className="ghost danger" onClick={() => confirm('¿Borrar este alquiler con TODAS sus fotos, visitas y checklist? No se puede deshacer.') && remove.mutate(undefined)}>
              Borrar alquiler
            </button>
          </div>
        </div>
      )}

      {tab === 'datos' && (
        <div className="datos">
          <div className="datos-form">
            <fieldset className="card form-section">
              <legend>General</legend>
              <div className="fields">
                <label className="field wide">
                  <span className="field-label">Nombre</span>
                  <input value={draft.title} onChange={set('title')} />
                </label>
                <label className="field wide">
                  <span className="field-label">Descripción (tal cual te la pasaron)</span>
                  <textarea rows={6} value={draft.description} onChange={set('description')} placeholder="Pegá acá el texto de la publicación o del mensaje y andá pasándolo a los campos de abajo" />
                </label>
                <label className="field wide">
                  <span className="field-label">Link de la publicación</span>
                  <input value={draft.listingUrl} onChange={set('listingUrl')} />
                </label>
                <label className="field">
                  <span className="field-label">Contacto</span>
                  <input value={draft.contactName} onChange={set('contactName')} />
                </label>
                <label className="field">
                  <span className="field-label">Teléfono o link de WhatsApp</span>
                  <input value={draft.contactPhone} onChange={set('contactPhone')} placeholder="3534123456 o wa.me/..." />
                </label>
              </div>
            </fieldset>
            <LocationPicker
              address={draft.address}
              lat={draft.lat}
              lng={draft.lng}
              onChange={(loc) => setDraft((d) => ({ ...d, ...loc }))}
            />
            <DetailsForm details={draft.details} onChange={(details) => setDraft((d) => ({ ...d, details }))} />
          </div>
          <aside className="datos-side">
            <div className="sticky">
              <div className="save-bar">
                <button className="primary" disabled={!dirty || update.isPending} onClick={saveDraft}>
                  {update.isPending ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado ✓'}
                </button>
                {dirty && (
                  <button className="ghost" onClick={() => setDraft(saved)}>
                    Descartar
                  </button>
                )}
              </div>
              {draft.description && (
                <div className="card description-ref">
                  <h3>Descripción</h3>
                  <p className="pre small">{draft.description}</p>
                </div>
              )}
              <ScoreBreakdown r={draftScore} compact />
            </div>
          </aside>
        </div>
      )}

      {tab === 'checklist' && <ChecklistPanel propertyId={p.id} checks={p.checks} />}

      {tab === 'visitas' && (
        <div>
          <div className="page-head">
            <h2>Visitas</h2>
            <button className="primary" onClick={() => setVisitOpen(true)}>
              + Agendar visita
            </button>
          </div>
          {p.visits.length ? (
            <ul className="visits">
              {p.visits.map((v) => (
                <VisitRow key={v.id} v={{ ...v, propertyTitle: p.title, propertyAddress: p.address, lat: p.lat, lng: p.lng }} />
              ))}
            </ul>
          ) : (
            <p className="muted">Todavía no agendaste visitas para este alquiler.</p>
          )}
        </div>
      )}

      {visitOpen && <QuickVisitDialog propertyId={p.id} onClose={() => setVisitOpen(false)} />}
      {shareOpen && <ShareDialog propertyIds={[p.id]} titles={[p.title]} onClose={() => setShareOpen(false)} />}
    </section>
  )
}
