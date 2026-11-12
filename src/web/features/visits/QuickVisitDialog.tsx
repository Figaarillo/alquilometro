import { useMemo, useState } from 'react'
import { api } from '../../api'
import { Modal } from '../../components/Modal'
import { useAppMutation, useProperties } from '../../hooks'
import { toLocalInput } from '../../lib/format'

function at(daysFromToday: number, h: number, m = 0) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(h, m, 0, 0)
  return toLocalInput(d)
}

function nextRoundHour() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return toLocalInput(d)
}

const SHORTCUTS: [string, () => string][] = [
  ['Hoy 18:00', () => at(0, 18)],
  ['Mañana 9:30', () => at(1, 9, 30)],
  ['Mañana 18:00', () => at(1, 18)],
  ['Pasado 10:00', () => at(2, 10)],
]

/** Agendar una visita en 2-3 clicks. Sirve también para visitas sin propiedad (ej. pasar por la inmobiliaria). */
export function QuickVisitDialog({ propertyId, onClose }: { propertyId?: string; onClose: () => void }) {
  const props = useProperties()
  const [pid, setPid] = useState(propertyId ?? '')
  const [start, setStart] = useState(nextRoundHour())
  const [until, setUntil] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const options = useMemo(
    () => (props.data ?? []).filter((p) => p.status !== 'descartado').sort((a, b) => a.title.localeCompare(b.title)),
    [props.data],
  )
  const selected = options.find((p) => p.id === pid)

  const save = useAppMutation(api.createVisit, onClose, 'Visita agendada')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const startDate = new Date(start)
    let endAt: string | null = null
    if (until) {
      const [h, m] = until.split(':').map(Number)
      const end = new Date(startDate)
      end.setHours(h, m, 0, 0)
      endAt = end.toISOString()
    }
    save.mutate({
      propertyId: pid || null,
      title: title.trim() || null,
      location: location.trim() || null,
      scheduledAt: startDate.toISOString(),
      endAt,
      notes: notes.trim() || null,
    })
  }

  return (
    <Modal title="Agendar visita" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Alquiler
          <select value={pid} onChange={(e) => setPid(e.target.value)} autoFocus={!propertyId}>
            <option value="">— Sin alquiler (ej. pasar por la inmobiliaria) —</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        {!pid && (
          <label>
            Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Oficina inmobiliaria X" required />
          </label>
        )}
        <div className="chips">
          {SHORTCUTS.map(([label, fn]) => (
            <button type="button" key={label} className="chip" onClick={() => setStart(fn())}>
              {label}
            </button>
          ))}
        </div>
        <div className="row">
          <label>
            Desde
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label>
            Hasta (opcional)
            <input type="time" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
        </div>
        <label>
          Dónde (si no es en el alquiler)
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={selected?.address ? `Por defecto: ${selected.address}` : 'Ej: Sarmiento 2318 (oficina)'}
          />
        </label>
        <label>
          Comentarios
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: pasar por la oficina, nos dan las direcciones y después vamos juntos"
          />
        </label>
        <div className="form-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={save.isPending}>
            Guardar visita
          </button>
        </div>
      </form>
    </Modal>
  )
}
