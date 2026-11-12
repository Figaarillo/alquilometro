import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { optionLabel, statusLabel, STATUSES } from '../../../shared/domain'
import { scoreProperty } from '../../../shared/scoring'
import { api } from '../../api'
import { ScoreBadge } from '../../components/ScoreBadge'
import { useProperties, useSettings } from '../../hooks'
import { moneyK, relativeDay } from '../../lib/format'
import { ShareDialog } from '../share/ShareDialog'

type Sort = 'auto' | 'mine' | 'combo' | 'cost' | 'recent'

const SORTS: [Sort, string][] = [
  ['auto', 'Puntaje automático'],
  ['combo', 'Combinado (auto + mío)'],
  ['mine', 'Mi valoración'],
  ['cost', 'Más barato'],
  ['recent', 'Más recientes'],
]

export function RankingPage() {
  const props = useProperties()
  const settings = useSettings()
  const [sort, setSort] = useState<Sort>('auto')
  const [status, setStatus] = useState<string>('activos')
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sharing, setSharing] = useState(false)
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const stopSelecting = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const rows = useMemo(() => {
    const list = (props.data ?? [])
      .filter((p) => (status === 'activos' ? p.status !== 'descartado' : status === 'todos' || p.status === status))
      .map((p) => {
        const s = scoreProperty(p, settings)
        const combo =
          s.total != null && p.myRating != null ? (s.total + p.myRating * 10) / 2 : (s.total ?? (p.myRating != null ? p.myRating * 10 : null))
        return { p, s, combo }
      })
    const by = (f: (r: (typeof list)[number]) => number | null, asc = false) =>
      list.sort((a, b) => {
        const x = f(a)
        const y = f(b)
        if (x == null) return 1
        if (y == null) return -1
        return asc ? x - y : y - x
      })
    if (sort === 'auto') by((r) => r.s.total)
    if (sort === 'mine') by((r) => r.p.myRating)
    if (sort === 'combo') by((r) => r.combo)
    if (sort === 'cost') by((r) => r.s.costs.baseMonthly, true)
    if (sort === 'recent') by((r) => new Date(r.p.createdAt).getTime())
    return list
  }, [props.data, settings, sort, status])

  if (props.isLoading) return <p className="muted">Cargando…</p>
  if (props.error) return <p className="error">No pude cargar: {String(props.error)}</p>

  return (
    <section>
      <div className="page-head">
        <h1>Ranking</h1>
        <button className={selecting ? 'primary' : ''} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
          {selecting ? 'Cancelar selección' : '🔗 Compartir'}
        </button>
        <div className="filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="activos">Activas (sin descartadas)</option>
            <option value="todos">Todas</option>
            {STATUSES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map(([k, l]) => (
              <option key={k} value={k}>
                Ordenar: {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <p>Todavía no cargaste alquileres.</p>
          <p className="muted">Usá “+ Alquiler” (en el celu: “Agregar”, abajo a la derecha).</p>
        </div>
      ) : (
        <>
        <ul className="rank-cards mobile-only">
          {rows.map(({ p, s }, i) => {
            const nearest = [...s.distances].sort((a, b) => a.km - b.km)[0]
            const overBudget = s.costs.baseMonthly != null && s.costs.baseMonthly > settings.maxMonthlyTotal
            const warnings = s.adjustments.length + s.alerts.filter((a) => a.level !== 'info').length
            return (
              <li key={p.id}>
                <Link
                  to={`/p/${p.id}`}
                  className={`rank-card ${selecting && selected.has(p.id) ? 'selected' : ''}`}
                  onClick={(e) => {
                    if (!selecting) return
                    e.preventDefault()
                    toggle(p.id)
                  }}
                >
                  <div className="rank-photo">
                    {p.coverImageId ? <img src={api.imageUrl(p.coverImageId)} alt="" loading="lazy" /> : <span>🏠</span>}
                    <span className="rank-pos">#{i + 1}</span>
                    {selecting && <span className="rank-check">{selected.has(p.id) ? '✓' : ''}</span>}
                  </div>
                  <div className="rank-body">
                    <div className="rank-title">
                      <strong>{p.title}</strong>
                      <ScoreBadge score={s.total} />
                    </div>
                    <div className="muted small">
                      {optionLabel('kind', p.details.kind)}
                      {p.details.isDuplex ? ' · Dúplex' : ''} · {p.details.bedrooms ?? '?'} hab.
                      {nearest ? ` · ${nearest.km} km` : ''}
                    </div>
                    <div className="rank-meta">
                      <span className={overBudget ? 'bad strong' : 'strong'}>{moneyK(s.costs.baseMonthly)}/mes</span>
                      <span className={`status status-${p.status}`}>{statusLabel(p.status)}</span>
                      {p.myRating != null && <span className="small">⭐ {p.myRating}</span>}
                      {warnings > 0 && <span className="warn-count">{warnings}</span>}
                    </div>
                    {p.nextVisit && <div className="small accent">📅 {relativeDay(p.nextVisit)}</div>}
                    <div className="meter wide" title={`Datos ${s.completeness}%`}>
                      <span style={{ width: `${s.completeness}%` }} />
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="table-wrap desktop-only">
          <table className="ranking">
            <thead>
              <tr>
                {selecting && <th></th>}
                <th>#</th>
                <th></th>
                <th>Alquiler</th>
                <th title="Puntaje automático">Auto</th>
                <th title="Tu valoración (1-10)">Mía</th>
                <th title="Completitud de datos clave">Datos</th>
                <th title="Alquiler + expensas">Mensual</th>
                <th>Hab.</th>
                <th title="Distancia al punto de referencia más cercano">Dist.</th>
                <th>Estado</th>
                <th title="Ajustes y alertas">⚠</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, s }, i) => {
                const nearest = [...s.distances].sort((a, b) => a.km - b.km)[0]
                const overBudget = s.costs.baseMonthly != null && s.costs.baseMonthly > settings.maxMonthlyTotal
                const warnings = s.adjustments.length + s.alerts.filter((a) => a.level !== 'info').length
                return (
                  <tr key={p.id} className={selected.has(p.id) ? 'row-selected' : ''}>
                    {selecting && (
                      <td>
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                      </td>
                    )}
                    <td className="muted">{i + 1}</td>
                    <td>
                      {p.coverImageId ? (
                        <img className="thumb" src={api.imageUrl(p.coverImageId)} alt="" loading="lazy" />
                      ) : (
                        <div className="thumb thumb-empty">🏠</div>
                      )}
                    </td>
                    <td>
                      <Link to={`/p/${p.id}`} className="strong">
                        {p.title}
                      </Link>
                      <div className="muted small">
                        {optionLabel('kind', p.details.kind)}
                        {p.details.isDuplex ? ' · Dúplex' : ''}
                        {p.address ? ` · ${p.address}` : ''}
                      </div>
                      {p.nextVisit && <div className="small accent">📅 {relativeDay(p.nextVisit)}</div>}
                    </td>
                    <td>
                      <ScoreBadge score={s.total} />
                    </td>
                    <td>{p.myRating ?? '—'}</td>
                    <td>
                      <div className="meter" title={`${s.completeness}%`}>
                        <span style={{ width: `${s.completeness}%` }} />
                      </div>
                    </td>
                    <td className={overBudget ? 'bad' : ''}>{moneyK(s.costs.baseMonthly)}</td>
                    <td>{p.details.bedrooms ?? '—'}</td>
                    <td>{nearest ? `${nearest.km} km` : '—'}</td>
                    <td>
                      <span className={`status status-${p.status}`}>{statusLabel(p.status)}</span>
                    </td>
                    <td title={[...s.adjustments.map((a) => `${a.label} (${a.points})`), ...s.alerts.map((a) => a.text)].join('\n')}>
                      {warnings ? <span className="warn-count">{warnings}</span> : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
      {selecting && (
        <div className="selection-bar">
          <span>{selected.size ? `${selected.size} seleccionado(s)` : 'Tocá los alquileres que querés compartir'}</span>
          <button className="primary" disabled={!selected.size} onClick={() => setSharing(true)}>
            Compartir
          </button>
        </div>
      )}
      {sharing && (
        <ShareDialog
          propertyIds={rows.filter((r) => selected.has(r.p.id)).map((r) => r.p.id)}
          titles={rows.filter((r) => selected.has(r.p.id)).map((r) => r.p.title)}
          onClose={() => {
            setSharing(false)
            stopSelecting()
          }}
        />
      )}
    </section>
  )
}
