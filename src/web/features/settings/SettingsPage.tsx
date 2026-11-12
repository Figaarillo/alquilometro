import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { CATEGORIES, DEFAULT_SETTINGS, type Settings } from '../../../shared/domain'
import { api } from '../../api'
import { BaseMap } from '../../components/BaseMap'
import { qk, useSettings } from '../../hooks'
import { money } from '../../lib/format'
import { toast } from '../../lib/toast'

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
        <h3>Puntos de referencia</h3>
        <p className="muted small">Elegí un punto y hacé click en el mapa para moverlo. La ubicación puntúa por cercanía a estos puntos.</p>
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
            onClick={() => setS({ ...s, refPoints: [...s.refPoints, { name: 'Nuevo punto', lat: s.refPoints[0]?.lat ?? -32.41, lng: s.refPoints[0]?.lng ?? -63.24 }] })}
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
