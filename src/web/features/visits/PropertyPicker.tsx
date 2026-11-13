import { useMemo, useState } from 'react'
import type { PropertyListItem } from '../../../shared/api'
import { optionLabel } from '../../../shared/domain'
import { scoreProperty } from '../../../shared/scoring'
import { api } from '../../api'
import { ScoreBadge } from '../../components/ScoreBadge'
import { useSettings } from '../../hooks'
import { moneyK } from '../../lib/format'

function PropertyCard({ p, score }: { p: PropertyListItem; score: number | null }) {
  const d = p.details
  return (
    <>
      {p.coverImageId ? (
        <img className="picker-thumb" src={api.imageUrl(p.coverImageId)} alt="" loading="lazy" />
      ) : (
        <div className="picker-thumb thumb-empty">🏠</div>
      )}
      <div className="picker-info">
        <strong>{p.title}</strong>
        <span className="muted small">
          {d.rent != null ? `${moneyK(d.rent)}/mes` : 'Sin precio'} · {optionLabel('kind', d.kind)} · {d.bedrooms ?? '?'} hab.
        </span>
      </div>
      <ScoreBadge score={score} />
    </>
  )
}

/** Elegir alquiler viendo portada y datos clave, en vez de un <select> con solo el nombre. */
export function PropertyPicker({
  properties,
  value,
  onChange,
  allowNone,
}: {
  properties: PropertyListItem[]
  value: string
  onChange: (id: string) => void
  allowNone?: string
}) {
  const settings = useSettings()
  const [open, setOpen] = useState(!value)
  const [q, setQ] = useState('')

  const rows = useMemo(
    () =>
      properties
        .map((p) => ({ p, score: scoreProperty(p, settings).total }))
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [properties, settings],
  )
  const selected = rows.find((r) => r.p.id === value)
  const term = q.trim().toLowerCase()
  const filtered = term ? rows.filter((r) => `${r.p.title} ${r.p.address ?? ''}`.toLowerCase().includes(term)) : rows

  if (!open) {
    return (
      <button type="button" className="picker-current" onClick={() => setOpen(true)}>
        {selected ? <PropertyCard p={selected.p} score={selected.score} /> : <span className="muted">{allowNone}</span>}
        <span className="picker-change small">Cambiar</span>
      </button>
    )
  }

  return (
    <div className="picker">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o dirección…" autoFocus={!value} />
      <ul className="picker-list">
        {allowNone && (
          <li>
            <button
              type="button"
              className={`picker-option ${value === '' ? 'on' : ''}`}
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              <div className="picker-thumb thumb-empty">🏢</div>
              <div className="picker-info">
                <strong>{allowNone}</strong>
              </div>
            </button>
          </li>
        )}
        {filtered.map(({ p, score }) => (
          <li key={p.id}>
            <button
              type="button"
              className={`picker-option ${value === p.id ? 'on' : ''}`}
              onClick={() => {
                onChange(p.id)
                setOpen(false)
              }}
            >
              <PropertyCard p={p} score={score} />
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="muted small">No hay coincidencias.</li>}
      </ul>
    </div>
  )
}
