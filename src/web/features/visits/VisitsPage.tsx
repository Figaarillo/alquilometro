import { useState } from 'react'
import { Link } from 'react-router'
import type { VisitWithProperty } from '../../../shared/api'
import { api } from '../../api'
import { useAppMutation, useVisits } from '../../hooks'
import { visitRange } from '../../lib/format'
import { directionsUrl, googleCalendarUrl } from '../../lib/links'
import { QuickVisitDialog } from './QuickVisitDialog'

export function visitWhere(v: VisitWithProperty) {
  return v.location || v.propertyAddress || (v.lat != null ? `${v.lat},${v.lng}` : '')
}

export function VisitRow({ v }: { v: VisitWithProperty }) {
  const toggle = useAppMutation((done: boolean) => api.updateVisit(v.id, { done }))
  const remove = useAppMutation(() => api.deleteVisit(v.id))
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(v.notes ?? '')
  const saveNotes = useAppMutation(() => api.updateVisit(v.id, { notes: notes.trim() || null }), () => setEditingNotes(false))
  const where = visitWhere(v)
  const name = v.propertyTitle ?? v.title ?? 'Visita'

  return (
    <li className={`visit ${v.done ? 'done' : ''}`}>
      <input type="checkbox" checked={v.done} onChange={(e) => toggle.mutate(e.target.checked)} title="Marcar como hecha" />
      <div className="visit-body">
        <div className="visit-when">{visitRange(v.scheduledAt, v.endAt)}</div>
        <div>
          {v.propertyId ? <Link to={`/p/${v.propertyId}?tab=visitas`}>{name}</Link> : <strong>{name}</strong>}
          {where && <span className="muted"> · {where}</span>}
        </div>
        {editingNotes ? (
          <div className="inline-edit">
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus />
            <button className="primary small" onClick={() => saveNotes.mutate(undefined)}>
              Guardar
            </button>
          </div>
        ) : (
          <div className="visit-notes" onClick={() => setEditingNotes(true)} title="Click para editar">
            {v.notes || <span className="muted">+ agregar comentario</span>}
          </div>
        )}
      </div>
      <div className="visit-actions">
        {where && (
          <a href={directionsUrl(where)} target="_blank" rel="noreferrer" title="Cómo llegar">
            🧭
          </a>
        )}
        <a
          href={googleCalendarUrl({
            title: `Visita: ${name}`,
            start: new Date(v.scheduledAt),
            end: v.endAt ? new Date(v.endAt) : undefined,
            details: v.notes ?? '',
            location: where,
          })}
          target="_blank"
          rel="noreferrer"
          title="Agregar a Google Calendar"
        >
          📆
        </a>
        <button className="ghost" title="Borrar" onClick={() => confirm('¿Borrar la visita?') && remove.mutate(undefined)}>
          🗑
        </button>
      </div>
    </li>
  )
}

export function VisitsPage() {
  const visits = useVisits()
  const [open, setOpen] = useState(false)
  const now = Date.now() - 3_600_000
  const all = visits.data ?? []
  const upcoming = all.filter((v) => !v.done && new Date(v.endAt ?? v.scheduledAt).getTime() >= now)
  const past = all.filter((v) => !upcoming.includes(v)).reverse()

  return (
    <section>
      <div className="page-head">
        <h1>Visitas</h1>
        <button className="primary" onClick={() => setOpen(true)}>
          + Agendar visita
        </button>
      </div>
      <h2>Próximas</h2>
      {upcoming.length ? (
        <ul className="visits">{upcoming.map((v) => <VisitRow key={v.id} v={v} />)}</ul>
      ) : (
        <p className="muted">No tenés visitas agendadas.</p>
      )}
      {past.length > 0 && (
        <>
          <h2>Pasadas / hechas</h2>
          <ul className="visits">{past.map((v) => <VisitRow key={v.id} v={v} />)}</ul>
        </>
      )}
      {open && <QuickVisitDialog onClose={() => setOpen(false)} />}
    </section>
  )
}
