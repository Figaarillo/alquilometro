import { Link } from 'react-router'
import { CircleMarker, Popup } from 'react-leaflet'
import { scoreProperty } from '../../../shared/scoring'
import { BaseMap } from '../../components/BaseMap'
import { useProperties, useSettings } from '../../hooks'
import { moneyK } from '../../lib/format'

const color = (s: number | null) => (s == null ? '#94a3b8' : s >= 75 ? '#16a34a' : s >= 55 ? '#d97706' : '#dc2626')

export function MapPage() {
  const props = useProperties()
  const settings = useSettings()
  const located = (props.data ?? []).filter((p) => p.lat != null && p.lng != null && p.status !== 'descartado')
  const missing = (props.data ?? []).filter((p) => (p.lat == null || p.lng == null) && p.status !== 'descartado')

  return (
    <section>
      <div className="page-head">
        <h1>Mapa</h1>
        <span className="muted small">Verde ≥ 75 · Naranja ≥ 55 · Rojo &lt; 55 · ★ tus puntos de referencia (círculo = 1 km)</span>
      </div>
      <BaseMap refPoints={settings.refPoints} height="70vh">
        {located.map((p) => {
          const s = scoreProperty(p, settings)
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat!, p.lng!]}
              radius={11}
              pathOptions={{ color: '#fff', weight: 2, fillColor: color(s.total), fillOpacity: 0.95 }}
            >
              <Popup>
                <strong>{p.title}</strong>
                <br />
                Puntaje: {s.total == null ? '—' : Math.round(s.total)} · {moneyK(s.costs.baseMonthly)}/mes
                <br />
                <Link to={`/p/${p.id}`}>Ver detalle →</Link>
              </Popup>
            </CircleMarker>
          )
        })}
      </BaseMap>
      {missing.length > 0 && (
        <p className="muted small">
          Sin ubicación cargada:{' '}
          {missing.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <Link to={`/p/${p.id}?tab=datos`}>{p.title}</Link>
            </span>
          ))}
        </p>
      )}
    </section>
  )
}
