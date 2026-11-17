import { ArrowUpDown, ChevronDown, ListFilter, Share, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { optionLabel, statusLabel, STATUSES } from '../../../shared/domain'
import { scoreProperty } from '../../../shared/scoring'
import { api } from '../../api'
import { ScoreBadge } from '../../components/ScoreBadge'
import { usePrefetchProperty, useProperties, useSettings } from '../../hooks'
import { moneyK, relativeDay } from '../../lib/format'
import { ShareDialog } from '../share/ShareDialog'
import { usePersistentState } from '../../lib/usePersistentState'
import { matchesQuery, searchText } from '../../lib/search'
import { SearchFab } from '../../components/SearchFab'

type Sort = 'auto' | 'mine' | 'combo' | 'cost' | 'recent'

const SORTS: [Sort, string][] = [
  ['combo', 'Promedio (auto + mi nota)'],
  ['auto', 'Puntaje automático'],
  ['mine', 'Mi valoración'],
  ['cost', 'Más barato'],
  ['recent', 'Más recientes'],
]
const SORT_SHORT: Record<Sort, string> = { combo: 'Promedio', auto: 'Automático', mine: 'Mi nota', cost: 'Más barato', recent: 'Recientes' }

const STATUS_FILTERS: [string, string][] = [
  ['activos', 'Activas'],
  ['todos', 'Todas'],
  ['ocultos', 'Ocultas'],
  ...STATUSES.map(([k, l]): [string, string] => [k, l]),
]

/** Pastilla compacta con un select nativo invisible encima: en el celu abre el selector del sistema. */
function PillSelect({
  icon,
  label,
  value,
  options,
  onChange,
  active,
  title,
}: {
  icon: ReactNode
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
  active?: boolean
  title: string
}) {
  return (
    <label className={`pill-select ${active ? 'on' : ''}`} title={title}>
      {icon}
      <span>{label}</span>
      <ChevronDown size={14} className="pill-chevron" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={title}>
        {options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

const isSort = (v: unknown): v is Sort => SORTS.some(([k]) => k === v)
const isStatusFilter = (v: unknown): v is string =>
  v === 'activos' || v === 'todos' || v === 'ocultos' || STATUSES.some(([k]) => k === v)

export function RankingPage() {
  const props = useProperties()
  const settings = useSettings()
  const prefetch = usePrefetchProperty()
  // Se recuerdan al salir y volver al Ranking (y entre sesiones en este dispositivo).
  const [sort, setSort] = usePersistentState<Sort>('ranking.sort.v2', 'combo', isSort)
  const [status, setStatus] = usePersistentState<string>('ranking.status', 'activos', isStatusFilter)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sharing, setSharing] = useState(false)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
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
      .filter((p) => {
        // Los ocultos solo aparecen con su filtro (o en "Todas").
        if (status === 'ocultos') return p.placement === 'oculto'
        if (p.placement === 'oculto' && status !== 'todos') return false
        return status === 'activos' ? p.status !== 'descartado' : status === 'todos' || p.status === status
      })
      .map((p) => {
        const s = scoreProperty(p, settings)
        const combo =
          s.total != null && p.myRating != null ? (s.total + p.myRating * 10) / 2 : (s.total ?? (p.myRating != null ? p.myRating * 10 : null))
        return { p, s, combo, text: searchText(p) }
      })
    const by = (f: (r: (typeof list)[number]) => number | null, asc = false) =>
      list.sort((a, b) => {
        // "Al fondo" siempre queda debajo del resto, sea cual sea el orden.
        const bottom = Number(a.p.placement === 'fondo') - Number(b.p.placement === 'fondo')
        if (bottom) return bottom
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
    // La posición (#) es la del ranking completo, aunque la búsqueda esconda algunos.
    return list.map((r, i) => ({ ...r, pos: i + 1 }))
  }, [props.data, settings, sort, status])
  const visible = useMemo(() => rows.filter((r) => matchesQuery(r.text, deferredQuery)), [rows, deferredQuery])

  if (props.isLoading) return <p className="muted">Cargando…</p>
  if (props.error) return <p className="error">No pude cargar: {String(props.error)}</p>

  return (
    <section className="ranking-page">
      <div className="page-head rank-head">
        <h1>Ranking</h1>
        <button
          className={`round-btn ${selecting ? 'on' : ''}`}
          onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
          aria-label={selecting ? 'Cancelar selección' : 'Compartir alquileres'}
          title={selecting ? 'Cancelar selección' : 'Compartir alquileres'}
        >
          {selecting ? <X size={20} /> : <Share size={19} />}
        </button>
      </div>
      <div className="filter-bar">
        <PillSelect
          icon={<ListFilter size={15} />}
          label={STATUS_FILTERS.find(([k]) => k === status)?.[1] ?? 'Activas'}
          value={status}
          options={STATUS_FILTERS}
          onChange={setStatus}
          active={status !== 'activos'}
          title="Qué alquileres mostrar"
        />
        <PillSelect
          icon={<ArrowUpDown size={15} />}
          label={SORT_SHORT[sort]}
          value={sort}
          options={SORTS}
          onChange={(v) => setSort(v as Sort)}
          title="Orden"
        />
        <span className="filter-count">
          {deferredQuery.trim() ? `${visible.length} de ${rows.length}` : rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <p>Todavía no cargaste alquileres.</p>
          <p className="muted">Usá “+ Alquiler” (en el celu: “Agregar”, abajo a la derecha).</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p>Nada coincide con “{deferredQuery.trim()}”.</p>
          <p className="muted">Probá con otra palabra: barrio, calle, precio, “patio”, “gas natural”…</p>
        </div>
      ) : (
        <>
        <ul className="rank-cards mobile-only">
          {visible.map(({ p, s, pos }) => {
            const nearest = [...s.distances].sort((a, b) => a.km - b.km)[0]
            const overBudget = s.costs.baseMonthly != null && s.costs.baseMonthly > settings.maxMonthlyTotal
            const warnings = s.adjustments.length + s.alerts.filter((a) => a.level !== 'info').length
            return (
              <li key={p.id}>
                <Link
                  to={`/p/${p.id}`}
                  onPointerDown={() => !selecting && prefetch(p.id)}
                  className={`rank-card ${selecting && selected.has(p.id) ? 'selected' : ''} ${p.placement !== 'normal' ? 'dimmed' : ''}`}
                  onClick={(e) => {
                    if (!selecting) return
                    e.preventDefault()
                    toggle(p.id)
                  }}
                >
                  <div className="rank-photo">
                    {p.coverImageId ? <img src={api.imageUrl(p.coverImageId)} alt="" loading="lazy" /> : <span>🏠</span>}
                    <span className="rank-pos">#{pos}</span>
                    {selecting && <span className="rank-check">{selected.has(p.id) ? '✓' : ''}</span>}
                    {p.placement === 'oculto' && <span className="rank-hidden">Oculto</span>}
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
              {visible.map(({ p, s, pos }) => {
                const nearest = [...s.distances].sort((a, b) => a.km - b.km)[0]
                const overBudget = s.costs.baseMonthly != null && s.costs.baseMonthly > settings.maxMonthlyTotal
                const warnings = s.adjustments.length + s.alerts.filter((a) => a.level !== 'info').length
                return (
                  <tr key={p.id} className={`${selected.has(p.id) ? 'row-selected' : ''} ${p.placement !== 'normal' ? 'dimmed' : ''}`}>
                    {selecting && (
                      <td>
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                      </td>
                    )}
                    <td className="muted">{pos}</td>
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
      {!selecting && rows.length > 0 && (
        <SearchFab value={query} onChange={setQuery} placeholder="Buscar calle, precio, detalle…" />
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
