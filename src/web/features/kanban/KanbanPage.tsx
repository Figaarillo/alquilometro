import { useState } from 'react'
import { Link } from 'react-router'
import { STATUSES, type Status } from '../../../shared/domain'
import { scoreProperty } from '../../../shared/scoring'
import { api } from '../../api'
import { ScoreBadge } from '../../components/ScoreBadge'
import { useAppMutation, useProperties, useSettings } from '../../hooks'
import { moneyK, relativeDay } from '../../lib/format'
import { ProcessList } from './ProcessList'

export function KanbanPage() {
  const props = useProperties()
  const settings = useSettings()
  const [over, setOver] = useState<Status | null>(null)
  const move = useAppMutation(({ id, status }: { id: string; status: Status }) => api.updateProperty(id, { status }), undefined, 'Estado actualizado')

  const drop = (status: Status) => (e: React.DragEvent) => {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData('text/plain')
    if (id) move.mutate({ id, status })
  }

  return (
    <section>
      <div className="page-head">
        <h1>Procesos</h1>
        <span className="muted small desktop-only">Arrastrá las tarjetas entre columnas</span>
      </div>
      <div className="mobile-only">
        <ProcessList
          rows={(props.data ?? []).map((p) => ({ p, s: scoreProperty(p, settings) })).sort((a, b) => (b.s.total ?? -1) - (a.s.total ?? -1))}
          onMove={(id, status) => move.mutate({ id, status })}
        />
      </div>
      <div className="kanban desktop-only">
        {STATUSES.map(([status, label]) => {
          const cards = (props.data ?? [])
            .filter((p) => p.status === status)
            .map((p) => ({ p, s: scoreProperty(p, settings) }))
            .sort((a, b) => (b.s.total ?? -1) - (a.s.total ?? -1))
          return (
            <div
              key={status}
              className={`kanban-col ${over === status ? 'drop' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(status)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={drop(status)}
            >
              <h3>
                {label} <span className="muted">{cards.length}</span>
              </h3>
              {cards.map(({ p, s }) => (
                <div key={p.id} className="kanban-card" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}>
                  <div className="kanban-card-head">
                    <Link to={`/p/${p.id}`} className="strong">
                      {p.title}
                    </Link>
                    <ScoreBadge score={s.total} />
                  </div>
                  <div className="muted small">
                    {moneyK(s.costs.baseMonthly)}/mes · {p.details.bedrooms ?? '?'} hab.
                  </div>
                  {p.nextVisit && <div className="small accent">📅 {relativeDay(p.nextVisit)}</div>}
                  <select
                    className="small-select"
                    value={p.status}
                    onChange={(e) => move.mutate({ id: p.id, status: e.target.value as Status })}
                  >
                    {STATUSES.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
