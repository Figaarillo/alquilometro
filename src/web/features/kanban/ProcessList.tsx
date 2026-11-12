import { useState } from 'react'
import { Link } from 'react-router'
import type { PropertyListItem } from '../../../shared/api'
import { STATUSES, type Status } from '../../../shared/domain'
import type { ScoreResult } from '../../../shared/scoring'
import { api } from '../../api'
import { ScoreBadge } from '../../components/ScoreBadge'
import { moneyK, relativeDay } from '../../lib/format'

type Row = { p: PropertyListItem; s: ScoreResult }

/**
 * Vista mobile de procesos: en vez de columnas que no entran, chips con contador
 * para elegir la etapa y una lista vertical con "mover a…".
 */
export function ProcessList({ rows, onMove }: { rows: Row[]; onMove: (id: string, status: Status) => void }) {
  const counts = new Map<string, number>(STATUSES.map(([k]) => [k, rows.filter((r) => r.p.status === k).length]))
  const firstWithItems = STATUSES.find(([k]) => k !== 'descartado' && (counts.get(k) ?? 0) > 0)?.[0] ?? 'nuevo'
  const [active, setActive] = useState<Status | 'todos'>(firstWithItems)

  const visible = active === 'todos' ? rows.filter((r) => r.p.status !== 'descartado') : rows.filter((r) => r.p.status === active)
  const groups = active === 'todos' ? STATUSES.filter(([k]) => k !== 'descartado') : STATUSES.filter(([k]) => k === active)

  return (
    <div>
      <div className="status-chips">
        <button className={`chip ${active === 'todos' ? 'on' : ''}`} onClick={() => setActive('todos')}>
          Todos <b>{rows.filter((r) => r.p.status !== 'descartado').length}</b>
        </button>
        {STATUSES.map(([k, label]) => (
          <button key={k} className={`chip ${active === k ? 'on' : ''}`} onClick={() => setActive(k)}>
            {label} <b>{counts.get(k)}</b>
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="muted">No hay alquileres en esta etapa.</p>}

      {groups.map(([status, label]) => {
        const list = visible.filter((r) => r.p.status === status)
        if (!list.length) return null
        return (
          <div key={status} className="process-group">
            {active === 'todos' && (
              <h3>
                {label} <span className="muted">{list.length}</span>
              </h3>
            )}
            <ul className="process-list">
              {list.map(({ p, s }) => (
                <li key={p.id} className="process-item">
                  <Link to={`/p/${p.id}`} className="process-main">
                    {p.coverImageId ? (
                      <img className="process-thumb" src={api.imageUrl(p.coverImageId)} alt="" loading="lazy" />
                    ) : (
                      <div className="process-thumb thumb-empty">🏠</div>
                    )}
                    <div className="process-info">
                      <strong>{p.title}</strong>
                      <span className="muted small">
                        {moneyK(s.costs.baseMonthly)}/mes · {p.details.bedrooms ?? '?'} hab.
                      </span>
                      {p.nextVisit && <span className="small accent">📅 {relativeDay(p.nextVisit)}</span>}
                    </div>
                    <ScoreBadge score={s.total} />
                  </Link>
                  <label className="process-move">
                    <span className="small muted">Mover a</span>
                    <select value={p.status} onChange={(e) => onMove(p.id, e.target.value as Status)}>
                      {STATUSES.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
