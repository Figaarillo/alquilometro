import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarPlus, Link as LinkIcon, MessageCircle, Phone } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { CircleMarker } from 'react-leaflet'
import type { PropertyDetail } from '../../../shared/api'
import { PLACEMENTS, STATUSES, type Details, type Placement, type Status } from '../../../shared/domain'
import { scoreProperty } from '../../../shared/scoring'
import { api } from '../../api'
import { BaseMap } from '../../components/BaseMap'
import { Chips } from '../../components/Chips'
import { Modal } from '../../components/Modal'
import { useAppMutation, useProperty, useSettings } from '../../hooks'
import { toast } from '../../lib/toast'
import { directionsUrl, firstContactMessage, isLink, streetViewEmbedUrl, streetViewUrl, whatsappUrl } from '../../lib/links'
import { QuickVisitDialog } from '../visits/QuickVisitDialog'
import { VisitRow } from '../visits/VisitsPage'
import { ShareDialog } from '../share/ShareDialog'
import { ChecklistPanel } from './ChecklistPanel'
import { DetailsForm } from './DetailsForm'
import { ImageGallery } from './ImageGallery'
import { LocationPicker } from './LocationPicker'
import { HeroOverlay, HeroSummary } from './PropertyHero'
import { CostsCard, ScoreBreakdown } from './ScoreBreakdown'

const TABS = [
  ['resumen', 'Resumen'],
  ['datos', 'Datos'],
  ['checklist', 'Checklist'],
  ['visitas', 'Visitas'],
] as const
type Tab = (typeof TABS)[number][0]

const EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined
const COSTS_SECTION = ['Costos mensuales']

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
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [descOpen, setDescOpen] = useState(false)

  const update = useAppMutation((input: Parameters<typeof api.updateProperty>[1]) => api.updateProperty(p.id, input))
  const remove = useAppMutation(() => api.deleteProperty(p.id), () => navigate('/'))
  const confirmDelete = () =>
    confirm('¿Borrar este alquiler con TODAS sus fotos, visitas y checklist? No se puede deshacer.') && remove.mutate(undefined)
  const changePlacement = (placement: Placement) => {
    const msg = { normal: 'Vuelve a su lugar en el ranking', fondo: 'Mandado al fondo del ranking', oculto: 'Oculto del ranking' }[placement]
    update.mutate({ placement }, { onSuccess: () => toast(msg) })
  }

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

  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/'))
  const phoneIsNumber = !!p.contactPhone && !isLink(p.contactPhone)
  const waUrl = p.contactPhone ? whatsappUrl(p.contactPhone, firstContactMessage(p)) : null
  const longDescription = (p.description?.length ?? 0) > 320
  const initials = (p.contactName ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  let listingHost = ''
  try {
    if (p.listingUrl) listingHost = new URL(p.listingUrl).hostname.replace(/^www\./, '')
  } catch {
    listingHost = p.listingUrl ?? ''
  }

  return (
    <section className="property-page">
      {/* Portada inmersiva: la foto arriba, con título, estado y puntaje encima. */}
      <div className="hero">
        <ImageGallery
          propertyId={p.id}
          images={p.images}
          overlay={<HeroOverlay p={p} score={savedScore.total} onBack={goBack} onShare={() => setShareOpen(true)} onOptions={() => setOptionsOpen(true)} />}
        />
      </div>

      <HeroSummary p={p} r={savedScore} maxMonthly={settings.maxMonthlyTotal} />

      <div className="card my-rating">
        <span className="strong">Mi nota</span>
        <div className="rating" role="group" aria-label="Mi nota del 1 al 10">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`rate ${p.myRating != null && n <= p.myRating ? 'on' : ''}`}
              aria-pressed={p.myRating === n}
              onClick={() => update.mutate({ myRating: p.myRating === n ? null : n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="tabs segmented" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>
            {l}
            {k === 'datos' && dirty && ' •'}
          </button>
        ))}
      </div>

      <div key={tab} className="tab-pane">
      {tab === 'resumen' && (
        <div className="grid-2">
          <div>
            <ScoreBreakdown r={savedScore} />
            <CostsCard r={savedScore} currency={p.details.currency} maxMonthly={settings.maxMonthlyTotal} />
            {p.description && (
              <div className="card">
                <h3>Descripción</h3>
                <p className={`pre ${longDescription && !descOpen ? 'clamp' : ''}`}>{p.description}</p>
                {longDescription && (
                  <button className="ghost small link-btn" onClick={() => setDescOpen((v) => !v)}>
                    {descOpen ? 'Mostrar menos' : 'Leer todo'}
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="card contact-card">
              <h3>Contacto y publicación</h3>
              {(p.contactName || p.contactPhone) && (
                <div className="contact-row">
                  <span className="avatar" aria-hidden="true">
                    {initials || '?'}
                  </span>
                  <div className="contact-text">
                    <strong>{p.contactName ?? 'Sin nombre'}</strong>
                    {p.contactPhone && <span className="muted small">{phoneIsNumber ? p.contactPhone : 'Link de WhatsApp'}</span>}
                  </div>
                  {phoneIsNumber && (
                    <a className="button round" href={`tel:${p.contactPhone!.replace(/[^\d+]/g, '')}`} aria-label="Llamar">
                      <Phone size={18} />
                    </a>
                  )}
                </div>
              )}
              {p.listingUrl && (
                <a className="link-row" href={p.listingUrl} target="_blank" rel="noreferrer">
                  <LinkIcon size={20} aria-hidden="true" />
                  <span className="link-row-text">
                    <strong>Ver publicación</strong>
                    <span className="muted small">{listingHost}</span>
                  </span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              )}
              {!p.contactName && !p.contactPhone && !p.listingUrl && (
                <p className="muted small">
                  Sin contacto ni publicación. <button className="ghost small" onClick={() => setTab('datos')}>Cargalos en Datos</button>
                </p>
              )}
              <div className="btn-grid">
                {waUrl && (
                  <a className="button desktop-only" href={waUrl} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
                <button className="desktop-only" onClick={() => setVisitOpen(true)}>
                  Agendar visita
                </button>
                <button onClick={() => setShareOpen(true)}>Compartir</button>
              </div>
            </div>
            <div className="card map-card">
              {point ? (
                <>
                  <div className="map-wrap">
                    <BaseMap refPoints={settings.refPoints} center={point} zoom={15} height={200}>
                      <CircleMarker center={point} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />
                    </BaseMap>
                    {savedScore.distances.length > 0 && (
                      <span className="map-pill">{savedScore.distances.map((d) => `${String(d.km).replace('.', ',')} km ${d.name.split(' (')[0]}`).join(' · ')}</span>
                    )}
                  </div>
                  <div className="map-body">
                    <h3>Ubicación</h3>
                    <span className="muted small">{p.address ?? 'Sin dirección'}</span>
                    <div className="btn-grid">
                      <a className="button" href={directionsUrl(`${point[0]},${point[1]}`)} target="_blank" rel="noreferrer">
                        Cómo llegar
                      </a>
                      <a className="button" href={streetViewUrl(point[0], point[1])} target="_blank" rel="noreferrer">
                        Street View
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
                  </div>
                </>
              ) : (
                <div className="map-body">
                  <h3>Ubicación</h3>
                  <p className="muted small">
                    Sin ubicación. <button className="ghost small" onClick={() => setTab('datos')}>Cargala en Datos</button>
                  </p>
                </div>
              )}
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
          </div>
          {/* Notas al final y a lo ancho: es lo último que se completa. */}
          <div className="card full-width">
            <h3>Mis notas</h3>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (p.notes ?? '') && update.mutate({ notes: notes || null }, { onSuccess: () => toast('Notas guardadas') })}
              placeholder="Impresiones, dudas, lo que te dijo el dueño…"
            />
          </div>
          <div className="full-width center">
            <button className="ghost danger" onClick={confirmDelete}>
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
            {/* Costos primero: es lo que más se mira y lo que más cambia. */}
            <DetailsForm details={draft.details} onChange={(details) => setDraft((d) => ({ ...d, details }))} only={COSTS_SECTION} />
            <LocationPicker
              address={draft.address}
              lat={draft.lat}
              lng={draft.lng}
              onChange={(loc) => setDraft((d) => ({ ...d, ...loc }))}
            />
            <DetailsForm details={draft.details} onChange={(details) => setDraft((d) => ({ ...d, details }))} exclude={COSTS_SECTION} />
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
                <VisitRow key={v.id} linkProperty={false} v={{ ...v, propertyTitle: p.title, propertyAddress: p.address, lat: p.lat, lng: p.lng }} />
              ))}
            </ul>
          ) : (
            <p className="muted">Todavía no agendaste visitas para este alquiler.</p>
          )}
        </div>
      )}

      </div>

      {/* Barra fija del celu: lo que más se usa, siempre a mano. */}
      {tab === 'resumen' && (
        <div className="action-bar">
          {waUrl && (
            <a className="button wa" href={waUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} aria-hidden="true" /> WhatsApp
            </a>
          )}
          <button onClick={() => setVisitOpen(true)}>
            <CalendarPlus size={18} aria-hidden="true" /> Agendar
          </button>
        </div>
      )}

      {visitOpen && <QuickVisitDialog propertyId={p.id} onClose={() => setVisitOpen(false)} />}
      {shareOpen && <ShareDialog propertyIds={[p.id]} titles={[p.title]} onClose={() => setShareOpen(false)} />}
      {optionsOpen && (
        <Modal title="Opciones" onClose={() => setOptionsOpen(false)}>
          <div className="form">
            <div>
              <span className="field-label">Estado</span>
              <Chips
                options={STATUSES}
                value={p.status}
                onChange={(v) => v && v !== p.status && update.mutate({ status: v as Status }, { onSuccess: () => toast('Estado actualizado') })}
              />
            </div>
            <div>
              <span className="field-label">En el ranking</span>
              <Chips
                options={PLACEMENTS}
                value={p.placement}
                onChange={(v) => v && v !== p.placement && changePlacement(v as Placement)}
              />
              <span className="muted small">“Al fondo” queda último con la portada gris; “Oculto” solo aparece con el filtro Ocultas.</span>
            </div>
            <div className="form-actions">
              <button className="ghost danger" onClick={confirmDelete}>
                Borrar alquiler
              </button>
              <button className="primary" onClick={() => setOptionsOpen(false)}>
                Listo
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
