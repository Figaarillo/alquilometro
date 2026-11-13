import { useMemo, useState } from 'react'
import type { Visit } from '../../../shared/api'
import { api } from '../../api'
import { Modal } from '../../components/Modal'
import { TimeSelect } from '../../components/TimeSelect'
import { useAppMutation, useProperties, useSettings } from '../../hooks'
import { combineDateTime, toDateInput, toTimeValue } from '../../lib/format'
import { toast } from '../../lib/toast'
import { PropertyPicker } from './PropertyPicker'

const dayFromToday = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toDateInput(d)
}

const DAYS: [string, number][] = [
  ['Hoy', 0],
  ['Mañana', 1],
  ['Pasado', 2],
]

function nextRoundHour() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return d
}

/**
 * Agendar o editar una visita. Fecha y hora van separadas: la fecha con un toque (Hoy/Mañana/Pasado
 * o calendario) y la hora con el selector, en 24 h o AM/PM según Ajustes.
 * Sirve también para visitas sin alquiler (ej. pasar por la inmobiliaria).
 */
export function QuickVisitDialog({ propertyId, visit, onClose }: { propertyId?: string; visit?: Visit; onClose: () => void }) {
  const props = useProperties()
  const settings = useSettings()
  const hour12 = settings.timeFormat === '12h'
  const editing = !!visit

  const startInit = visit ? new Date(visit.scheduledAt) : nextRoundHour()
  const [pid, setPid] = useState(visit ? (visit.propertyId ?? '') : (propertyId ?? ''))
  const [date, setDate] = useState(toDateInput(startInit))
  const [start, setStart] = useState(toTimeValue(startInit))
  const [until, setUntil] = useState(visit?.endAt ? toTimeValue(new Date(visit.endAt)) : '')
  const [title, setTitle] = useState(visit?.title ?? '')
  const [location, setLocation] = useState(visit?.location ?? '')
  const [notes, setNotes] = useState(visit?.notes ?? '')

  const options = useMemo(
    () => (props.data ?? []).filter((p) => p.status !== 'descartado' || p.id === pid),
    [props.data, pid],
  )
  const selected = options.find((p) => p.id === pid)

  const create = useAppMutation(api.createVisit, onClose, 'Visita agendada')
  const update = useAppMutation((input: Parameters<typeof api.updateVisit>[1]) => api.updateVisit(visit!.id, input), onClose, 'Visita actualizada')
  const saving = create.isPending || update.isPending

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const startDate = combineDateTime(date, start)
    let endAt: string | null = null
    if (until) {
      const end = combineDateTime(date, until)
      if (end <= startDate) return toast.error('La hora de fin tiene que ser después del inicio')
      endAt = end.toISOString()
    }
    const input = {
      propertyId: pid || null,
      title: title.trim() || null,
      location: location.trim() || null,
      scheduledAt: startDate.toISOString(),
      endAt,
      notes: notes.trim() || null,
    }
    if (editing) update.mutate(input)
    else create.mutate(input)
  }

  return (
    <Modal title={editing ? 'Editar visita' : 'Agendar visita'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div>
          <span className="field-label">Alquiler</span>
          <PropertyPicker properties={options} value={pid} onChange={setPid} allowNone="Sin alquiler (ej. pasar por la inmobiliaria)" />
        </div>
        {!pid && (
          <label>
            Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Oficina inmobiliaria X" required />
          </label>
        )}

        <div>
          <span className="field-label">Día</span>
          <div className="date-row">
            <div className="chips">
              {DAYS.map(([label, n]) => (
                <button type="button" key={label} className={`chip ${date === dayFromToday(n) ? 'on' : ''}`} onClick={() => setDate(dayFromToday(n))}>
                  {label}
                </button>
              ))}
            </div>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} required />
          </div>
        </div>

        <div className="row wrap time-row">
          <div>
            <span className="field-label">Desde</span>
            <TimeSelect value={start} onChange={setStart} hour12={hour12} ariaLabel="Hora de inicio" />
          </div>
          <div>
            <span className="field-label">Hasta (opcional)</span>
            <TimeSelect value={until} onChange={setUntil} hour12={hour12} allowEmpty ariaLabel="Hora de fin" />
          </div>
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
          <button className="primary" disabled={saving}>
            {editing ? 'Guardar cambios' : 'Guardar visita'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
