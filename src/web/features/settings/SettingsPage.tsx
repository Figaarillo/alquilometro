import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { CATEGORIES, DEFAULT_SETTINGS, type Settings } from '../../../shared/domain'
import { api } from '../../api'
import { BaseMap } from '../../components/BaseMap'
import { Chips } from '../../components/Chips'

const TIME_FORMATS = [
  ['24h', '24 h (18:30)'],
  ['12h', 'AM / PM (6:30 PM)'],
] as const
import { qk, useSettings } from '../../hooks'
import { money } from '../../lib/format'
import { formatBytes } from '../../lib/image'
import { toast } from '../../lib/toast'

/** Límite del volumen de Postgres en Railway (plan actual). */
const VOLUME_BYTES = 1024 ** 3

function StorageCard() {
  const q = useQuery({ queryKey: ['storage'], queryFn: api.storage })
  if (!q.data) return null
  const { photos, photoBytes, dbBytes } = q.data
  const pct = Math.min(100, (dbBytes / VOLUME_BYTES) * 100)
  const avg = photos ? photoBytes / photos : 0
  const free = Math.max(0, VOLUME_BYTES - dbBytes)
  return (
    <div className="card">
      <div className="card-head">
        <h3>Espacio usado</h3>
        <span className="muted small">
          {formatBytes(dbBytes)} de 1 GB ({pct < 1 ? '<1' : Math.round(pct)}%)
        </span>
      </div>
      <div className="meter wide storage-meter">
        <span style={{ width: `${Math.max(pct, 1)}%`, background: pct > 80 ? 'var(--bad)' : pct > 60 ? 'var(--mid)' : undefined }} />
      </div>
      <p className="muted small">
        {photos} fotos ({formatBytes(photoBytes)}, promedio {formatBytes(avg)} c/u).
        {avg > 0 && ` Al ritmo actual entran ~${Math.floor(free / avg).toLocaleString('es-AR')} fotos más.`} Las fotos nuevas se
        guardan comprimidas en WebP de hasta 1600px.
      </p>
    </div>
  )
}

export function SettingsPage() {
  const current = useSettings()
  const qc = useQueryClient()
  const [s, setS] = useState<Settings>(current)
  const [active, setActive] = useState(0)
  useEffect(() => setS(current), [current])

  const save = useMutation({
    mutationFn: api.saveSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings })
      toast('Ajustes guardados')
    },
    onError: (e) => toast.error(e.message),
  })
  const totalWeight = Object.values(s.weights).reduce((a, b) => a + b, 0) || 1
  const num = (k: 'maxRent' | 'maxMonthlyTotal' | 'rentHardCap' | 'usdRate') => (
    <input type="number" min={0} value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />
  )

  return (
    <section>
      <div className="page-head">
        <h1>Ajustes del puntaje</h1>
        <div className="row">
          <button className="ghost" onClick={() => setS(DEFAULT_SETTINGS)}>
            Restaurar valores por defecto
          </button>
          <button className="primary" disabled={save.isPending} onClick={() => save.mutate(s)}>
            Guardar
          </button>
        </div>
      </div>

      <StorageCard />

      <div className="card">
        <div className="card-head">
          <h3>Formato de hora</h3>
          <span className="muted small">Para agendar y ver visitas</span>
        </div>
        <Chips
          options={TIME_FORMATS}
          value={s.timeFormat ?? '24h'}
          onChange={(v) => {
            const next = { ...s, timeFormat: v ?? '24h' }
            setS(next)
            save.mutate(next)
          }}
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Presupuesto</h3>
          <label>
            Alquiler máximo ideal <span className="muted small">{money(s.maxRent)}</span>
            {num('maxRent')}
          </label>
          <label>
            Tope alquiler + expensas <span className="muted small">{money(s.maxMonthlyTotal)}</span>
            {num('maxMonthlyTotal')}
          </label>
          <label>
            Alquiler "muy elevado" desde <span className="muted small">{money(s.rentHardCap)}</span>
            {num('rentHardCap')}
          </label>
          <label>
            Cotización US$ (para publicaciones en dólares)
            {num('usdRate')}
          </label>
          <p className="muted small">
            Un alquiler sobre el máximo no se castiga si el total entra en el tope y además no tiene expensas o tiene cochera para auto.
          </p>
        </div>

        <div className="card">
          <h3>Importancia de cada categoría</h3>
          {CATEGORIES.map(([k, label]) => (
            <label key={k} className="weight">
              <span>
                {label} <span className="muted small">{Math.round((s.weights[k] / totalWeight) * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={40}
                value={s.weights[k]}
                onChange={(e) => setS({ ...s, weights: { ...s.weights, [k]: Number(e.target.value) } })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Zonas preferidas</h3>
        <p className="muted small">
          Cada alquiler puntúa por la zona que tenga <strong>más cerca</strong>: estar cerca de cualquiera alcanza, y sumar una zona nunca le baja el
          puntaje a nadie. Elegí una zona y hacé click en el mapa para moverla. Los cambios se aplican al tocar <strong>Guardar</strong>.
        </p>
        <div className="row wrap">
          {s.refPoints.map((r, i) => (
            <div key={i} className={`ref-edit ${i === active ? 'on' : ''}`} onClick={() => setActive(i)}>
              <input
                value={r.name}
                onChange={(e) => setS({ ...s, refPoints: s.refPoints.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
              />
              <span className="muted small">
                {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
              </span>
              {s.refPoints.length > 1 && (
                <button className="ghost small" onClick={() => setS({ ...s, refPoints: s.refPoints.filter((_, j) => j !== i) })}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            className="small"
            onClick={() => {
              setS({ ...s, refPoints: [...s.refPoints, { name: 'Nuevo punto', lat: s.refPoints[0]?.lat ?? -32.41, lng: s.refPoints[0]?.lng ?? -63.24 }] })
              // El punto nuevo queda seleccionado: el próximo click en el mapa lo mueve a él, no al Centro.
              setActive(s.refPoints.length)
              toast.info('Ahora hacé click en el mapa donde va el punto nuevo')
            }}
          >
            + Punto
          </button>
        </div>
        <BaseMap
          refPoints={s.refPoints}
          height={380}
          onClick={(lat, lng) => setS({ ...s, refPoints: s.refPoints.map((x, j) => (j === active ? { ...x, lat, lng } : x)) })}
        />
      </div>
    </section>
  )
}
